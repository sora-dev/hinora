import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, UserStatus, type User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RolesPermissionsService } from '../roles-permissions/roles-permissions.service';

type ListUsersQuery = Record<string, string | undefined>;
type CreateUserInput = {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  department: string;
  jobTitle?: string | null;
  role: Role;
  roleTitle: string;
  status: UserStatus;
};
type UpdateUserInput = Partial<Omit<CreateUserInput, 'password'>>;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rolesPermissionsService: RolesPermissionsService,
  ) {}

  async listUsers(query: ListUsersQuery) {
    const page = this.parsePositiveInt(query.page, 1);
    const pageSize = this.parsePositiveInt(query.pageSize, 10);
    const search = query.search?.trim();
    const status = this.parseOptionalStatus(query.status);
    const roleTitle = this.normalizeOptionalString(query.role);
    const department = this.normalizeOptionalString(query.department);

    const where: Prisma.UserWhereInput = {
      AND: [
        search
          ? {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { username: { contains: search, mode: 'insensitive' } },
                { department: { contains: search, mode: 'insensitive' } },
                { roleTitle: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
        status ? { status } : {},
        roleTitle ? { roleTitle } : {},
        department ? { department } : {},
      ],
    };

    const [users, total, allUsers, departments, roleTitles] = await Promise.all(
      [
        this.prisma.user.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.user.count({ where }),
        this.prisma.user.findMany(),
        this.prisma.user.findMany({
          distinct: ['department'],
          select: { department: true },
          orderBy: { department: 'asc' },
        }),
        this.prisma.roleDefinition.findMany({
          select: { name: true },
          orderBy: [{ type: 'asc' }, { name: 'asc' }],
        }),
      ],
    );

    const stats = {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter((user) => user.status === UserStatus.ACTIVE)
        .length,
      inactiveUsers: allUsers.filter(
        (user) => user.status === UserStatus.INACTIVE,
      ).length,
      lockedUsers: allUsers.filter((user) => user.status === UserStatus.LOCKED)
        .length,
    };

    return {
      data: users.map((user) => this.toUserResponse(user)),
      stats,
      filters: {
        departments: departments.map((item) => item.department),
        roles: roleTitles.map((item) => item.name),
        statuses: Object.values(UserStatus),
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async createUser(body: Record<string, unknown>) {
    const input = this.parseCreateInput(body);
    await this.rolesPermissionsService.assertRoleTitleExists(input.roleTitle);
    const hashedPassword = await bcrypt.hash(input.password, 10);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: input.email,
          username: input.username,
          password: hashedPassword,
          firstName: input.firstName,
          lastName: input.lastName,
          department: input.department,
          jobTitle: input.jobTitle ?? null,
          role: input.role,
          roleTitle: input.roleTitle,
          status: input.status,
          mustChangePassword:
            typeof body.mustChangePassword === 'boolean'
              ? body.mustChangePassword
              : true,
        },
      });

      return this.toUserResponse(user);
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async importUsers(body: Record<string, unknown>) {
    const usersValue = body.users;

    if (!Array.isArray(usersValue) || usersValue.length === 0) {
      throw new BadRequestException('users must be a non-empty array.');
    }

    const createdUsers: Array<ReturnType<UsersService['toUserResponse']>> = [];

    for (const item of usersValue) {
      if (!item || typeof item !== 'object') {
        throw new BadRequestException('Each imported user must be an object.');
      }

      const user = await this.createUser(item as Record<string, unknown>);
      createdUsers.push(user);
    }

    return {
      count: createdUsers.length,
      data: createdUsers,
    };
  }

  async updateUser(id: string, body: Record<string, unknown>) {
    await this.ensureUserExists(id);
    const input = this.parseUpdateInput(body);

    if (input.roleTitle) {
      await this.rolesPermissionsService.assertRoleTitleExists(input.roleTitle);
    }

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: input,
      });

      return this.toUserResponse(user);
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async updateStatus(id: string, body: Record<string, unknown>) {
    await this.ensureUserExists(id);
    const status = this.parseRequiredStatus(body.status);

    const user = await this.prisma.user.update({
      where: { id },
      data: { status },
    });

    return this.toUserResponse(user);
  }

  async updatePassword(id: string, body: Record<string, unknown>) {
    await this.ensureUserExists(id);
    const password = this.readSecurePassword(body.password, 'password');
    const mustChangePassword =
      typeof body.mustChangePassword === 'boolean'
        ? body.mustChangePassword
        : true;
    const hashedPassword = await bcrypt.hash(password, 10);

    const data: {
      password: string;
      mustChangePassword: boolean;
      status?: UserStatus;
    } = {
      password: hashedPassword,
      mustChangePassword,
    };

    if (body.unlockAccount === true) {
      data.status = UserStatus.ACTIVE;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
    });

    return this.toUserResponse(user);
  }

  private toUserResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      department: user.department,
      jobTitle: user.jobTitle,
      role: user.role,
      roleTitle: user.roleTitle,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private async ensureUserExists(id: string) {
    const existingUser = await this.prisma.user.findUnique({ where: { id } });

    if (!existingUser) {
      throw new NotFoundException(`User ${id} was not found.`);
    }
  }

  private parseCreateInput(body: Record<string, unknown>): CreateUserInput {
    const roleTitle = this.readRequiredString(body.roleTitle, 'roleTitle');

    return {
      email: this.readRequiredEmail(body.email),
      username: this.readRequiredString(body.username, 'username'),
      password: this.readSecurePassword(body.password, 'password'),
      firstName: this.readRequiredString(body.firstName, 'firstName'),
      lastName: this.readRequiredString(body.lastName, 'lastName'),
      department: this.readRequiredString(body.department, 'department'),
      jobTitle: this.parseOptionalJobTitle(body.jobTitle),
      role: this.parseOptionalRole(body.role) ?? this.deriveSystemRole(roleTitle),
      roleTitle,
      status: this.parseRequiredStatus(body.status),
    };
  }

  private parseUpdateInput(body: Record<string, unknown>): UpdateUserInput {
    const input: UpdateUserInput = {};

    if (body.email !== undefined) {
      input.email = this.readRequiredEmail(body.email);
    }

    if (body.username !== undefined) {
      input.username = this.readRequiredString(body.username, 'username');
    }

    if (body.firstName !== undefined) {
      input.firstName = this.readRequiredString(body.firstName, 'firstName');
    }

    if (body.lastName !== undefined) {
      input.lastName = this.readRequiredString(body.lastName, 'lastName');
    }

    if (body.department !== undefined) {
      input.department = this.readRequiredString(body.department, 'department');
    }

    if (body.jobTitle !== undefined) {
      input.jobTitle = this.parseOptionalJobTitle(body.jobTitle) ?? null;
    }

    if (body.roleTitle !== undefined) {
      input.roleTitle = this.readRequiredString(body.roleTitle, 'roleTitle');
      if (body.role === undefined) {
        input.role = this.deriveSystemRole(input.roleTitle);
      }
    }

    if (body.role !== undefined) {
      input.role = this.parseRequiredRole(body.role);
    }

    if (body.status !== undefined) {
      input.status = this.parseRequiredStatus(body.status);
    }

    return input;
  }

  private deriveSystemRole(roleTitle: string): Role {
    const normalized = roleTitle.trim().toLowerCase();
    if (normalized.includes('admin')) {
      return Role.ADMIN;
    }
    if (
      normalized.includes('manager') ||
      normalized.includes('officer') ||
      normalized.includes('head') ||
      normalized.includes('compliance')
    ) {
      return Role.MANAGER;
    }
    return Role.EMPLOYEE;
  }

  private parseOptionalRole(value: unknown) {
    if (typeof value !== 'string' || !value.trim()) {
      return undefined;
    }

    try {
      return this.parseRequiredRole(value);
    } catch {
      return undefined;
    }
  }

  private parseOptionalJobTitle(value: unknown) {
    if (typeof value !== 'string') {
      return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private parsePositiveInt(value: string | undefined, fallback: number) {
    if (!value) {
      return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private parseOptionalStatus(value: string | undefined) {
    if (!value || value === 'ALL') {
      return undefined;
    }

    return this.parseRequiredStatus(value);
  }

  private parseRequiredStatus(value: unknown) {
    const normalized = this.readRequiredString(value, 'status').toUpperCase();

    if (!Object.values(UserStatus).includes(normalized as UserStatus)) {
      throw new BadRequestException(
        'status must be ACTIVE, INACTIVE, or LOCKED.',
      );
    }

    return normalized as UserStatus;
  }

  private parseRequiredRole(value: unknown) {
    const normalized = this.readRequiredString(value, 'role').toUpperCase();

    if (!Object.values(Role).includes(normalized as Role)) {
      throw new BadRequestException(
        'role must be ADMIN, MANAGER, or EMPLOYEE.',
      );
    }

    return normalized as Role;
  }

  private normalizeOptionalString(value: string | undefined) {
    if (!value || value === 'ALL') {
      return undefined;
    }

    return value.trim();
  }

  private readRequiredEmail(value: unknown) {
    const email = this.readRequiredString(value, 'email').toLowerCase();

    if (!email.includes('@')) {
      throw new BadRequestException('email must be valid.');
    }

    return email;
  }

  private readRequiredString(
    value: unknown,
    fieldName: string,
    options?: { minLength?: number },
  ) {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} is required.`);
    }

    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required.`);
    }

    if (options?.minLength && normalized.length < options.minLength) {
      throw new BadRequestException(
        `${fieldName} must be at least ${options.minLength} characters.`,
      );
    }

    return normalized;
  }

  private readSecurePassword(value: unknown, fieldName: string) {
    const password = this.readRequiredString(value, fieldName, {
      minLength: 8,
    });

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);

    if (!hasLower || !hasUpper || !hasNumber || !hasSpecial) {
      throw new BadRequestException(
        `${fieldName} must include uppercase, lowercase, a number, and a special character.`,
      );
    }

    return password;
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new BadRequestException(
        'A user with that email or username already exists.',
      );
    }

    throw error;
  }
}

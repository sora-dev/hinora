import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, UserStatus, type User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../activity/activity.service';
import { RolesPermissionsService } from '../roles-permissions/roles-permissions.service';
import { UserActivityKind } from '@prisma/client';

type ListUsersQuery = Record<string, string | undefined>;
type CreateUserInput = {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  phone: string | null;
  employeeId: string | null;
  department: string;
  departmentId: string | null;
  locationId: string | null;
  jobTitle?: string | null;
  reportsToUserId: string | null;
  dateHired: Date | null;
  role: Role;
  roleTitle: string;
  status: UserStatus;
};
type UpdateUserInput = Partial<Omit<CreateUserInput, 'password'>> & {
  avatarUrl?: string | null;
  preferences?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
};

const avatarMimeExtensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const preferenceKeys = [
  'theme',
  'primaryColor',
  'fontSize',
  'compactMode',
  'reduceMotion',
  'language',
  'dateFormat',
  'timeFormat',
  'timeZone',
  'firstDayOfWeek',
  'defaultDashboardView',
  'itemsPerPage',
  'showQuickActions',
] as const;

type UserWithRelations = User & {
  departmentRef: { id: string; name: string; code: string } | null;
  locationRef: { id: string; name: string; code: string } | null;
  reportsTo: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    jobTitle: string | null;
  } | null;
};

const userInclude = {
  departmentRef: {
    select: { id: true, name: true, code: true },
  },
  locationRef: {
    select: { id: true, name: true, code: true },
  },
  reportsTo: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      jobTitle: true,
    },
  },
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rolesPermissionsService: RolesPermissionsService,
    private readonly activityService: ActivityService,
  ) {}

  async listUsers(query: ListUsersQuery) {
    const page = this.parsePositiveInt(query.page, 1);
    const pageSize = this.parsePositiveInt(query.pageSize, 10);
    const search = query.search?.trim();
    const status = this.parseOptionalStatus(query.status);
    const roleTitle = this.normalizeOptionalString(query.role);
    const departmentFilter = this.normalizeOptionalString(query.department);
    const locationFilter = this.normalizeOptionalString(query.location);

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
                { employeeId: { contains: search, mode: 'insensitive' } },
                { preferredName: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
        status ? { status } : {},
        roleTitle ? { roleTitle } : {},
        departmentFilter
          ? {
              OR: [
                { departmentId: departmentFilter },
                { department: departmentFilter },
              ],
            }
          : {},
        locationFilter
          ? {
              OR: [
                { locationId: locationFilter },
                { locationRef: { name: locationFilter } },
              ],
            }
          : {},
      ],
    };

    const [users, total, allUsers, departments, locations, roleTitles] =
      await Promise.all([
        this.prisma.user.findMany({
          where,
          include: userInclude,
          orderBy: [{ createdAt: 'desc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.user.count({ where }),
        this.prisma.user.findMany({
          select: { status: true },
        }),
        this.prisma.department.findMany({
          where: { status: 'ACTIVE' },
          select: { id: true, name: true, code: true },
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        }),
        this.prisma.location.findMany({
          where: {
            status: {
              in: ['ACTIVE', 'MAINTENANCE'],
            },
          },
          select: { id: true, name: true, code: true },
          orderBy: [{ name: 'asc' }],
        }),
        this.prisma.roleDefinition.findMany({
          select: { name: true },
          orderBy: [{ type: 'asc' }, { name: 'asc' }],
        }),
      ]);

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
        departments: departments.map((item) => item.name),
        departmentOptions: departments,
        locations: locations.map((item) => item.name),
        locationOptions: locations,
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
    const input = await this.parseCreateInput(body);
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
          preferredName: input.preferredName,
          phone: input.phone,
          employeeId: input.employeeId,
          department: input.department,
          departmentId: input.departmentId,
          locationId: input.locationId,
          jobTitle: input.jobTitle ?? null,
          reportsToUserId: input.reportsToUserId,
          dateHired: input.dateHired,
          role: input.role,
          roleTitle: input.roleTitle,
          status: input.status,
          mustChangePassword:
            typeof body.mustChangePassword === 'boolean'
              ? body.mustChangePassword
              : true,
        },
        include: userInclude,
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

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: userInclude,
    });

    if (!user) {
      throw new NotFoundException(`User ${id} was not found.`);
    }

    return this.toUserResponse(user);
  }

  async updateUser(id: string, body: Record<string, unknown>) {
    await this.ensureUserExists(id);
    const input = await this.parseUpdateInput(body);

    if (input.reportsToUserId && input.reportsToUserId === id) {
      throw new BadRequestException('A user cannot report to themselves.');
    }

    if (input.roleTitle) {
      await this.rolesPermissionsService.assertRoleTitleExists(input.roleTitle);
    }

    if (input.preferences !== undefined && input.preferences !== Prisma.JsonNull) {
      const existing = await this.prisma.user.findUnique({
        where: { id },
        select: { preferences: true },
      });
      const current =
        existing?.preferences &&
        typeof existing.preferences === 'object' &&
        !Array.isArray(existing.preferences)
          ? (existing.preferences as Prisma.InputJsonObject)
          : {};
      input.preferences = {
        ...current,
        ...(input.preferences as Prisma.InputJsonObject),
      };
    }

    try {
      const user = await this.prisma.user.update({
        where: { id },
        data: input,
        include: userInclude,
      });

      const profileFields: Array<keyof UpdateUserInput> = [
        'firstName',
        'lastName',
        'preferredName',
        'phone',
        'email',
        'jobTitle',
      ];
      if (profileFields.some((field) => field in input)) {
        void this.activityService.recordKind(id, UserActivityKind.PROFILE);
      }

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
      include: userInclude,
    });

    return this.toUserResponse(user);
  }

  async updatePassword(id: string, body: Record<string, unknown>) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`User ${id} was not found.`);
    }

    if (typeof body.currentPassword === 'string' && body.currentPassword.trim()) {
      const matches = await bcrypt.compare(body.currentPassword, existing.password);
      if (!matches) {
        throw new BadRequestException('Current password is incorrect.');
      }
    }

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
      include: userInclude,
    });

    await this.activityService.recordKind(id, UserActivityKind.PASSWORD);
    return this.toUserResponse(user);
  }

  async uploadAvatar(id: string, file?: Express.Multer.File) {
    await this.ensureUserExists(id);
    if (!file?.buffer?.length) {
      throw new BadRequestException('An image file is required.');
    }

    const mime = file.mimetype.toLowerCase();
    const extension = avatarMimeExtensions[mime];
    if (!extension) {
      throw new BadRequestException(
        'Avatar must be a JPEG, PNG, WebP, or GIF image.',
      );
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestException('Photo must be 2 MB or smaller.');
    }

    const directory = join(process.cwd(), 'uploads', 'avatars');
    await mkdir(directory, { recursive: true });
    const entries = await readdir(directory).catch(() => [] as string[]);
    await Promise.all(
      entries
        .filter((name) => name.startsWith(`${id}.`))
        .map((name) => unlink(join(directory, name)).catch(() => undefined)),
    );

    const fileName = `${id}.${extension}`;
    await writeFile(join(directory, fileName), file.buffer);
    const avatarUrl = `/uploads/avatars/${fileName}`;

    const user = await this.prisma.user.update({
      where: { id },
      data: { avatarUrl },
      include: userInclude,
    });

    void this.activityService.recordKind(id, UserActivityKind.PROFILE, {
      title: 'Profile Photo Updated',
      description: 'A new profile photo was uploaded',
      extra: 'The profile photo was saved to this account.',
    });

    return this.toUserResponse(user);
  }

  private toUserResponse(user: UserWithRelations | User) {
    const departmentRef =
      'departmentRef' in user ? user.departmentRef : null;
    const locationRef = 'locationRef' in user ? user.locationRef : null;
    const reportsTo = 'reportsTo' in user ? user.reportsTo : null;

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      preferredName: user.preferredName,
      phone: user.phone,
      employeeId: user.employeeId,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      department: departmentRef?.name ?? user.department,
      departmentId: user.departmentId,
      locationId: user.locationId,
      location: locationRef?.name ?? null,
      jobTitle: user.jobTitle,
      reportsToUserId: user.reportsToUserId,
      reportsTo: reportsTo
        ? {
            id: reportsTo.id,
            fullName: `${reportsTo.firstName} ${reportsTo.lastName}`.trim(),
            email: reportsTo.email,
            jobTitle: reportsTo.jobTitle,
          }
        : null,
      dateHired: user.dateHired,
      role: user.role,
      roleTitle: user.roleTitle,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
      avatarUrl: user.avatarUrl,
      preferences: user.preferences,
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

  private async resolveDepartmentAssignment(body: Record<string, unknown>) {
    const departmentIdValue = body.departmentId;
    const departmentNameValue = body.department;

    if (departmentIdValue !== undefined && departmentIdValue !== null) {
      if (typeof departmentIdValue !== 'string' || !departmentIdValue.trim()) {
        throw new BadRequestException('departmentId must be a valid id.');
      }

      const department = await this.prisma.department.findUnique({
        where: { id: departmentIdValue.trim() },
        select: { id: true, name: true },
      });

      if (!department) {
        throw new BadRequestException('Selected department was not found.');
      }

      return {
        departmentId: department.id,
        department: department.name,
      };
    }

    if (typeof departmentNameValue === 'string' && departmentNameValue.trim()) {
      const name = departmentNameValue.trim();
      const department = await this.prisma.department.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } },
        select: { id: true, name: true },
      });

      return {
        departmentId: department?.id ?? null,
        department: department?.name ?? name,
      };
    }

    return null;
  }

  private async resolveLocationAssignment(body: Record<string, unknown>) {
    if (body.locationId === undefined) {
      return undefined;
    }

    if (body.locationId === null || body.locationId === '') {
      return null;
    }

    if (typeof body.locationId !== 'string') {
      throw new BadRequestException('locationId must be a string.');
    }

    const locationId = body.locationId.trim();
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true },
    });

    if (!location) {
      throw new BadRequestException('Selected location was not found.');
    }

    return location.id;
  }

  private async parseCreateInput(
    body: Record<string, unknown>,
  ): Promise<CreateUserInput> {
    const roleTitle = this.readRequiredString(body.roleTitle, 'roleTitle');
    const departmentAssignment = await this.resolveDepartmentAssignment(body);

    if (!departmentAssignment) {
      throw new BadRequestException('department is required.');
    }

    const locationId = await this.resolveLocationAssignment(body);

    const reportsToUserId = await this.resolveReportsToUserId(
      body.reportsToUserId,
    );

    return {
      email: this.readRequiredEmail(body.email),
      username: this.readRequiredString(body.username, 'username'),
      password: this.readSecurePassword(body.password, 'password'),
      firstName: this.readRequiredString(body.firstName, 'firstName'),
      lastName: this.readRequiredString(body.lastName, 'lastName'),
      preferredName: this.parseOptionalText(body.preferredName),
      phone: this.parseOptionalText(body.phone),
      employeeId: this.parseOptionalText(body.employeeId),
      department: departmentAssignment.department,
      departmentId: departmentAssignment.departmentId,
      locationId: locationId ?? null,
      jobTitle: this.parseOptionalJobTitle(body.jobTitle),
      reportsToUserId,
      dateHired: this.parseOptionalDate(body.dateHired),
      role: this.parseOptionalRole(body.role) ?? this.deriveSystemRole(roleTitle),
      roleTitle,
      status: this.parseRequiredStatus(body.status),
    };
  }

  private async parseUpdateInput(
    body: Record<string, unknown>,
  ): Promise<UpdateUserInput> {
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

    if (body.preferredName !== undefined) {
      input.preferredName = this.parseOptionalText(body.preferredName);
    }

    if (body.phone !== undefined) {
      input.phone = this.parseOptionalText(body.phone);
    }

    if (body.employeeId !== undefined) {
      input.employeeId = this.parseOptionalText(body.employeeId);
    }

    if (body.department !== undefined || body.departmentId !== undefined) {
      const departmentAssignment = await this.resolveDepartmentAssignment(body);
      if (departmentAssignment) {
        input.department = departmentAssignment.department;
        input.departmentId = departmentAssignment.departmentId;
      }
    }

    if (body.locationId !== undefined) {
      input.locationId = (await this.resolveLocationAssignment(body)) ?? null;
    }

    if (body.jobTitle !== undefined) {
      input.jobTitle = this.parseOptionalJobTitle(body.jobTitle) ?? null;
    }

    if (body.reportsToUserId !== undefined) {
      input.reportsToUserId = await this.resolveReportsToUserId(
        body.reportsToUserId,
      );
    }

    if (body.dateHired !== undefined) {
      input.dateHired = this.parseOptionalDate(body.dateHired);
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

    if (body.avatarUrl !== undefined) {
      input.avatarUrl = this.parseAvatarUrl(body.avatarUrl);
    }

    if (body.preferences !== undefined) {
      input.preferences = this.parsePreferences(body.preferences);
    }

    return input;
  }

  private parseAvatarUrl(value: unknown) {
    if (value === null || value === '') {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('avatarUrl must be a string.');
    }

    const avatarUrl = value.trim();
    if (!avatarUrl) {
      return null;
    }

    if (avatarUrl.startsWith('data:')) {
      throw new BadRequestException(
        'Upload the photo as a file instead of a data URL.',
      );
    }

    if (avatarUrl.length > 2048) {
      throw new BadRequestException('avatarUrl is too long.');
    }

    return avatarUrl;
  }

  private parsePreferences(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
    if (value === null) {
      return Prisma.JsonNull;
    }

    if (typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('preferences must be an object.');
    }

    const source = value as Record<string, unknown>;
    const preferences: Record<string, string | boolean> = {};

    for (const key of preferenceKeys) {
      const next = source[key];
      if (typeof next === 'string' || typeof next === 'boolean') {
        preferences[key] = next;
      }
    }

    return preferences;
  }

  private async resolveReportsToUserId(value: unknown) {
    if (value === undefined) {
      return null;
    }

    if (value === null || value === '') {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('reportsToUserId must be a string.');
    }

    const userId = value.trim();
    if (!userId) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException('Selected reporting manager was not found.');
    }

    return userId;
  }

  private parseOptionalText(value: unknown) {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('Expected a text value.');
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private parseOptionalDate(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('dateHired must be a string.');
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('dateHired must be a valid date.');
    }

    return date;
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
        'A user with that email, username, or employee ID already exists.',
      );
    }

    throw error;
  }
}

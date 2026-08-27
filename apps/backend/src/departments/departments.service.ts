import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DepartmentStatus,
  Prisma,
  type Department,
  type Location,
  type User,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type ListDepartmentsQuery = Record<string, string | undefined>;

const ORGANIZATION_WIDE_SCOPE = 'organization-wide';

type DepartmentWithRelations = Department & {
  head: User | null;
  location: Location | null;
  _count: {
    users: number;
  };
};

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async listDepartments(query: ListDepartmentsQuery) {
    const search = this.normalizeOptionalString(query.search);
    const status = this.parseOptionalStatus(query.status);

    const where: Prisma.DepartmentWhereInput = {
      AND: [
        status ? { status } : {},
        search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
      ],
    };

    const [departments, allDepartments, policyCounts] = await Promise.all([
      this.prisma.department.findMany({
        where,
        include: {
          head: true,
          location: true,
          _count: {
            select: {
              users: true,
            },
          },
        },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      }),
      this.prisma.department.findMany({
        select: { status: true },
      }),
      this.prisma.policy.groupBy({
        by: ['department'],
        _count: { _all: true },
      }),
    ]);

    const policyCountByName = new Map(
      policyCounts.map((item) => [item.department, item._count._all]),
    );

    const stats = {
      totalDepartments: allDepartments.length,
      totalEmployees: departments.reduce(
        (sum, department) => sum + department._count.users,
        0,
      ),
      averageCompliance: 0,
      totalPolicies: departments.reduce(
        (sum, department) =>
          sum + (policyCountByName.get(department.name) ?? 0),
        0,
      ),
    };

    return {
      data: departments.map((department) =>
        this.toDepartmentResponse(
          department,
          policyCountByName.get(department.name) ?? 0,
        ),
      ),
      stats,
      filters: {
        statuses: Object.values(DepartmentStatus).map((value) =>
          this.toUiStatus(value),
        ),
      },
    };
  }

  async listOptions() {
    const departments = await this.prisma.department.findMany({
      where: { status: DepartmentStatus.ACTIVE },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    return {
      data: departments.map((department) => ({
        id: department.id,
        name: department.name,
        code: department.code,
      })),
    };
  }

  async getDepartment(departmentId: string) {
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        head: true,
        location: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException(`Department ${departmentId} was not found.`);
    }

    const policyCount = await this.prisma.policy.count({
      where: { department: department.name },
    });

    return {
      data: this.toDepartmentResponse(department, policyCount),
    };
  }

  async createDepartment(body: Record<string, unknown>) {
    const data = await this.buildCreateOrUpdateInput(body);

    try {
      const department = await this.prisma.department.create({
        data,
        include: {
          head: true,
          location: true,
          _count: {
            select: {
              users: true,
            },
          },
        },
      });

      return {
        data: this.toDepartmentResponse(department, 0),
      };
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async updateDepartment(departmentId: string, body: Record<string, unknown>) {
    const existing = await this.ensureDepartmentExists(departmentId);
    const data = await this.buildCreateOrUpdateInput(body, true, departmentId);

    if (
      data.parentDepartmentId &&
      data.parentDepartmentId === departmentId
    ) {
      throw new BadRequestException('A department cannot be its own parent.');
    }

    try {
      const department = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.department.update({
          where: { id: departmentId },
          data,
          include: {
            head: true,
            location: true,
            _count: {
              select: {
                users: true,
              },
            },
          },
        });

        if (data.name && data.name !== existing.name) {
          await tx.user.updateMany({
            where: { departmentId },
            data: { department: data.name },
          });
        }

        return updated;
      });

      const policyCount = await this.prisma.policy.count({
        where: { department: department.name },
      });

      return {
        data: this.toDepartmentResponse(department, policyCount),
      };
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async deleteDepartment(departmentId: string) {
    await this.ensureDepartmentExists(departmentId);

    await this.prisma.department.delete({
      where: { id: departmentId },
    });

    return { success: true };
  }

  private toDepartmentResponse(
    department: DepartmentWithRelations,
    policyCount: number,
  ) {
    const head = department.head
      ? {
          id: department.head.id,
          name: `${department.head.firstName} ${department.head.lastName}`.trim(),
          email: department.head.email,
          initials: this.getInitials(
            department.head.firstName,
            department.head.lastName,
          ),
          jobTitle: department.head.jobTitle,
        }
      : {
          name: 'Unassigned',
          email: 'unassigned@hinora.com',
          initials: 'UA',
        };

    const locationScope = department.isOrganizationWide
      ? ORGANIZATION_WIDE_SCOPE
      : (department.locationId ?? ORGANIZATION_WIDE_SCOPE);

    const locations = department.isOrganizationWide
      ? ['Organization-wide']
      : department.location
        ? [department.location.name]
        : [];

    return {
      id: department.id,
      name: department.name,
      shortName: department.name,
      code: department.code,
      description: department.description,
      head,
      employees: department._count.users,
      compliance: 0,
      policies: policyCount,
      status: this.toUiStatus(department.status),
      locations,
      createdAt: department.establishedDate ?? department.createdAt,
      establishedDate: department.establishedDate
        ? department.establishedDate.toISOString().slice(0, 10)
        : '',
      displayOrder: department.displayOrder,
      parentDepartmentId: department.parentDepartmentId ?? '',
      locationScope,
      costCenter: department.costCenter ?? '',
      autoAssignMandatory: department.autoAssignMandatory,
      enableNotifications: department.enableNotifications,
      inheritAssignments: department.inheritAssignments,
      headUserId: department.headUserId,
      locationId: department.locationId,
      isOrganizationWide: department.isOrganizationWide,
      employeeList: [],
      policyList: [],
      activity: [],
      complianceTrend: [0, 0, 0, 0],
      updatedAt: department.updatedAt,
    };
  }

  private async buildCreateOrUpdateInput(
    body: Record<string, unknown>,
    isUpdate = false,
    departmentId?: string,
  ): Promise<Prisma.DepartmentUncheckedCreateInput> {
    const name = isUpdate
      ? this.readOptionalString(body.name)
      : this.readRequiredString(body.name, 'name');
    const code = isUpdate
      ? this.readOptionalString(body.code)
      : this.readRequiredString(body.code, 'code');

    const data: Prisma.DepartmentUncheckedCreateInput = {
      name: name ?? '',
      code: code ? code.toUpperCase().slice(0, 8) : '',
    };

    if (isUpdate) {
      if (name === undefined) delete (data as { name?: string }).name;
      else data.name = name;
      if (code === undefined) delete (data as { code?: string }).code;
      else data.code = code.toUpperCase().slice(0, 8);
    }

    if (body.description !== undefined) {
      data.description = this.readOptionalText(body.description);
    } else if (!isUpdate) {
      data.description = '';
    }

    if (body.status !== undefined) {
      data.status = this.parseRequiredStatus(body.status);
    } else if (!isUpdate) {
      data.status = DepartmentStatus.ACTIVE;
    }

    if (body.establishedDate !== undefined) {
      data.establishedDate = this.parseOptionalDate(body.establishedDate);
    }

    if (body.displayOrder !== undefined) {
      data.displayOrder = this.parseDisplayOrder(body.displayOrder);
    } else if (!isUpdate) {
      data.displayOrder = 1;
    }

    if (body.costCenter !== undefined) {
      const costCenter = this.readOptionalText(body.costCenter);
      data.costCenter = costCenter || null;
    }

    if (body.parentDepartmentId !== undefined) {
      data.parentDepartmentId = await this.parseOptionalDepartmentId(
        body.parentDepartmentId,
        departmentId,
      );
    }

    if (body.headUserId !== undefined) {
      data.headUserId = await this.parseOptionalUserId(body.headUserId);
    }

    if (body.locationScope !== undefined || body.locationId !== undefined) {
      const scope = await this.parseLocationScope(
        body.locationScope ?? body.locationId,
      );
      data.isOrganizationWide = scope.isOrganizationWide;
      data.locationId = scope.locationId;
    } else if (!isUpdate) {
      data.isOrganizationWide = true;
      data.locationId = null;
    }

    if (body.autoAssignMandatory !== undefined) {
      data.autoAssignMandatory = Boolean(body.autoAssignMandatory);
    } else if (!isUpdate) {
      data.autoAssignMandatory = true;
    }

    if (body.enableNotifications !== undefined) {
      data.enableNotifications = Boolean(body.enableNotifications);
    } else if (!isUpdate) {
      data.enableNotifications = true;
    }

    if (body.inheritAssignments !== undefined) {
      data.inheritAssignments = Boolean(body.inheritAssignments);
    } else if (!isUpdate) {
      data.inheritAssignments = true;
    }

    return data;
  }

  private async parseLocationScope(value: unknown) {
    if (value === null || value === '' || value === ORGANIZATION_WIDE_SCOPE) {
      return { isOrganizationWide: true, locationId: null as string | null };
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('locationScope must be a string.');
    }

    const locationId = value.trim();
    const location = await this.prisma.location.findUnique({
      where: { id: locationId },
      select: { id: true },
    });

    if (!location) {
      throw new BadRequestException('Selected location was not found.');
    }

    return { isOrganizationWide: false, locationId };
  }

  private async parseOptionalDepartmentId(
    value: unknown,
    currentDepartmentId?: string,
  ) {
    if (value === null || value === '') {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('parentDepartmentId must be a string.');
    }

    const parentId = value.trim();
    if (!parentId) {
      return null;
    }

    if (currentDepartmentId && parentId === currentDepartmentId) {
      throw new BadRequestException('A department cannot be its own parent.');
    }

    const parent = await this.prisma.department.findUnique({
      where: { id: parentId },
      select: { id: true },
    });

    if (!parent) {
      throw new BadRequestException('Selected parent department was not found.');
    }

    return parentId;
  }

  private async parseOptionalUserId(value: unknown) {
    if (value === null || value === '') {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('headUserId must be a string.');
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
      throw new BadRequestException('Selected department head was not found.');
    }

    return userId;
  }

  private async ensureDepartmentExists(departmentId: string) {
    const existing = await this.prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!existing) {
      throw new NotFoundException(`Department ${departmentId} was not found.`);
    }

    return existing;
  }

  private toUiStatus(status: DepartmentStatus) {
    return status === DepartmentStatus.ACTIVE ? 'Active' : 'Inactive';
  }

  private parseOptionalStatus(value: string | undefined) {
    if (!value || value === 'ALL') {
      return undefined;
    }

    return this.parseRequiredStatus(value);
  }

  private parseRequiredStatus(value: unknown) {
    const normalized = this.readRequiredString(value, 'status')
      .trim()
      .toUpperCase();

    if (normalized === 'ACTIVE') return DepartmentStatus.ACTIVE;
    if (normalized === 'INACTIVE') return DepartmentStatus.INACTIVE;

    throw new BadRequestException('status must be Active or Inactive.');
  }

  private parseOptionalDate(value: unknown) {
    if (value === null || value === '') {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('establishedDate must be a string.');
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('establishedDate must be a valid date.');
    }

    return date;
  }

  private parseDisplayOrder(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return Math.floor(value);
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return 1;
  }

  private getInitials(firstName: string, lastName: string) {
    return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || 'UA';
  }

  private normalizeOptionalString(value: string | undefined) {
    if (!value || value === 'ALL') {
      return undefined;
    }

    return value.trim();
  }

  private readOptionalString(value: unknown) {
    if (value === undefined) {
      return undefined;
    }

    return this.readRequiredString(value, 'value');
  }

  private readOptionalText(value: unknown) {
    if (typeof value !== 'string') {
      return '';
    }

    return value.trim();
  }

  private readRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string') {
      throw new BadRequestException(`${fieldName} is required.`);
    }

    const normalized = value.trim();
    if (!normalized) {
      throw new BadRequestException(`${fieldName} is required.`);
    }

    return normalized;
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new BadRequestException(
        'A department with that code already exists.',
      );
    }

    throw error;
  }
}

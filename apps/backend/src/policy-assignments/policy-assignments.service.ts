import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PolicyAssignmentPriority,
  PolicyAssignmentScope,
  PolicyAssignmentStatus,
  Prisma,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const scopeFromClient: Record<string, PolicyAssignmentScope> = {
  organization: PolicyAssignmentScope.ORGANIZATION,
  department: PolicyAssignmentScope.DEPARTMENT,
  location: PolicyAssignmentScope.LOCATION,
  role: PolicyAssignmentScope.ROLE,
  user: PolicyAssignmentScope.USER,
};

const scopeToClient: Record<PolicyAssignmentScope, string> = {
  ORGANIZATION: 'organization',
  DEPARTMENT: 'department',
  LOCATION: 'location',
  ROLE: 'role',
  USER: 'user',
};

const statusFromClient: Record<string, PolicyAssignmentStatus> = {
  Active: PolicyAssignmentStatus.ACTIVE,
  Completed: PolicyAssignmentStatus.COMPLETED,
  Archived: PolicyAssignmentStatus.ARCHIVED,
  ACTIVE: PolicyAssignmentStatus.ACTIVE,
  COMPLETED: PolicyAssignmentStatus.COMPLETED,
  ARCHIVED: PolicyAssignmentStatus.ARCHIVED,
};

const statusToClient: Record<PolicyAssignmentStatus, string> = {
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

const priorityFromClient: Record<string, PolicyAssignmentPriority> = {
  Low: PolicyAssignmentPriority.LOW,
  Medium: PolicyAssignmentPriority.MEDIUM,
  High: PolicyAssignmentPriority.HIGH,
  LOW: PolicyAssignmentPriority.LOW,
  MEDIUM: PolicyAssignmentPriority.MEDIUM,
  HIGH: PolicyAssignmentPriority.HIGH,
};

const priorityToClient: Record<PolicyAssignmentPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
};

@Injectable()
export class PolicyAssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async assignmentsForUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
        department: true,
        departmentId: true,
        locationId: true,
        roleTitle: true,
        departmentRef: {
          select: { id: true, name: true },
        },
        locationRef: {
          select: { id: true, name: true },
        },
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      return [];
    }

    const departmentTargets = [
      user.departmentId,
      user.department,
      user.departmentRef?.id,
      user.departmentRef?.name,
    ].filter((value): value is string => Boolean(value));
    const locationTargets = [
      user.locationId,
      user.locationRef?.id,
      user.locationRef?.name,
    ].filter((value): value is string => Boolean(value));

    const scopeFilters: Prisma.PolicyAssignmentWhereInput[] = [
      { scopeKind: PolicyAssignmentScope.ORGANIZATION },
      { scopeKind: PolicyAssignmentScope.USER, userIds: { has: user.id } },
    ];

    if (departmentTargets.length > 0) {
      scopeFilters.push({
        scopeKind: PolicyAssignmentScope.DEPARTMENT,
        OR: [
          { scopeTarget: { in: departmentTargets } },
          { scopeLabel: { in: departmentTargets } },
        ],
      });
    }

    if (locationTargets.length > 0) {
      scopeFilters.push({
        scopeKind: PolicyAssignmentScope.LOCATION,
        OR: [
          { scopeTarget: { in: locationTargets } },
          { scopeLabel: { in: locationTargets } },
        ],
      });
    }

    if (user.roleTitle) {
      scopeFilters.push({
        scopeKind: PolicyAssignmentScope.ROLE,
        OR: [{ scopeTarget: user.roleTitle }, { scopeLabel: user.roleTitle }],
      });
    }

    return this.prisma.policyAssignment.findMany({
      where: {
        status: {
          in: [PolicyAssignmentStatus.ACTIVE, PolicyAssignmentStatus.COMPLETED],
        },
        startAt: { lte: new Date() },
        OR: scopeFilters,
      },
      select: {
        id: true,
        policyId: true,
        startAt: true,
        dueAt: true,
        priority: true,
        status: true,
        policy: {
          select: {
            id: true,
            title: true,
            version: true,
            description: true,
            summaryShort: true,
            department: true,
            type: true,
          },
        },
      },
      orderBy: { dueAt: 'asc' },
    });
  }

  async assignedPolicyIdsForUser(userId: string) {
    const assignments = await this.assignmentsForUser(userId);
    return [...new Set(assignments.map((assignment) => assignment.policyId))];
  }

  async countAssignedUsersForPolicy(policyId: string) {
    const counts = await this.assignedUserCountsByPolicy([policyId]);
    return counts.get(policyId) ?? 0;
  }

  async assignedUserCountsByPolicy(policyIds: string[]) {
    const counts = new Map<string, number>();
    for (const policyId of policyIds) {
      counts.set(policyId, 0);
    }
    if (policyIds.length === 0) {
      return counts;
    }

    const [assignments, users] = await Promise.all([
      this.prisma.policyAssignment.findMany({
        where: {
          policyId: { in: policyIds },
          status: {
            in: [PolicyAssignmentStatus.ACTIVE, PolicyAssignmentStatus.COMPLETED],
          },
          startAt: { lte: new Date() },
        },
        select: {
          policyId: true,
          scopeKind: true,
          scopeTarget: true,
          scopeLabel: true,
          userIds: true,
        },
      }),
      this.prisma.user.findMany({
        where: { status: UserStatus.ACTIVE },
        select: {
          id: true,
          department: true,
          departmentId: true,
          locationId: true,
          roleTitle: true,
          departmentRef: { select: { id: true, name: true } },
          locationRef: { select: { id: true, name: true } },
        },
      }),
    ]);

    const byPolicy = new Map<string, typeof assignments>();
    for (const assignment of assignments) {
      const rows = byPolicy.get(assignment.policyId) ?? [];
      rows.push(assignment);
      byPolicy.set(assignment.policyId, rows);
    }

    for (const policyId of policyIds) {
      const rows = byPolicy.get(policyId) ?? [];
      if (rows.length === 0) {
        continue;
      }
      counts.set(
        policyId,
        users.filter((user) =>
          rows.some((assignment) => this.assignmentAppliesToUser(assignment, user)),
        ).length,
      );
    }

    return counts;
  }

  async list(query: Record<string, string | undefined>) {
    const search = this.readString(query.search);
    const status = this.parseStatus(this.readString(query.status));
    const scopeKind = this.parseScope(this.readString(query.scope));
    const dueFrom = this.parseDate(this.readString(query.dueFrom), false);
    const dueTo = this.parseDate(this.readString(query.dueTo), true);

    const where: Prisma.PolicyAssignmentWhereInput = {
      AND: [
        status ? { status } : {},
        scopeKind ? { scopeKind } : {},
        dueFrom || dueTo
          ? {
              dueAt: {
                ...(dueFrom ? { gte: dueFrom } : {}),
                ...(dueTo ? { lte: dueTo } : {}),
              },
            }
          : {},
        search
          ? {
              OR: [
                { scopeLabel: { contains: search, mode: 'insensitive' } },
                { notes: { contains: search, mode: 'insensitive' } },
                {
                  policy: {
                    title: { contains: search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {},
      ],
    };

    const rows = await this.prisma.policyAssignment.findMany({
      where,
      include: {
        policy: {
          select: {
            id: true,
            title: true,
            version: true,
            createdAt: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const items = await Promise.all(rows.map((row) => this.serialize(row)));
    return { data: items };
  }

  async create(body: Record<string, unknown>) {
    const input = await this.parseWriteInput(body);
    if (!input.policyId || !input.scopeKind || !input.scopeLabel || !input.startAt || !input.dueAt) {
      throw new BadRequestException('Assignment details are incomplete.');
    }
    const created = await this.prisma.policyAssignment.create({
      data: {
        policyId: input.policyId,
        scopeKind: input.scopeKind,
        scopeTarget: input.scopeTarget ?? '',
        scopeLabel: input.scopeLabel,
        userIds: input.userIds ?? [],
        startAt: input.startAt,
        dueAt: input.dueAt,
        priority: input.priority ?? PolicyAssignmentPriority.MEDIUM,
        notes: input.notes ?? '',
        internalNotes: input.internalNotes ?? '',
        createdByUserId: input.createdByUserId,
      },
      include: {
        policy: {
          select: {
            id: true,
            title: true,
            version: true,
            createdAt: true,
            status: true,
          },
        },
      },
    });
    await this.notifyAssignment(created);
    return this.serialize(created);
  }

  async update(id: string, body: Record<string, unknown>) {
    await this.ensureExists(id);
    const input = await this.parseWriteInput(body, true);
    const updated = await this.prisma.policyAssignment.update({
      where: { id },
      data: input,
      include: {
        policy: {
          select: {
            id: true,
            title: true,
            version: true,
            createdAt: true,
            status: true,
          },
        },
      },
    });
    return this.serialize(updated);
  }

  async updateStatus(id: string, body: Record<string, unknown>) {
    await this.ensureExists(id);
    const status = this.parseStatus(this.readString(body.status));
    if (!status) {
      throw new BadRequestException('status is required.');
    }
    const updated = await this.prisma.policyAssignment.update({
      where: { id },
      data: { status },
      include: {
        policy: {
          select: {
            id: true,
            title: true,
            version: true,
            createdAt: true,
            status: true,
          },
        },
      },
    });
    return this.serialize(updated);
  }

  async duplicate(id: string) {
    const existing = await this.prisma.policyAssignment.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Assignment was not found.');
    }

    const startAt = new Date();
    startAt.setHours(0, 0, 0, 0);
    const dueAt = new Date(startAt);
    dueAt.setDate(dueAt.getDate() + 30);

    const created = await this.prisma.policyAssignment.create({
      data: {
        policyId: existing.policyId,
        scopeKind: existing.scopeKind,
        scopeTarget: existing.scopeTarget,
        scopeLabel: existing.scopeLabel,
        userIds: existing.userIds,
        startAt,
        dueAt,
        status: PolicyAssignmentStatus.ACTIVE,
        priority: existing.priority,
        notes: existing.notes,
        internalNotes: existing.internalNotes,
        createdByUserId: existing.createdByUserId,
      },
      include: {
        policy: {
          select: {
            id: true,
            title: true,
            version: true,
            createdAt: true,
            status: true,
          },
        },
      },
    });
    await this.notifyAssignment(created);
    return this.serialize(created);
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.policyAssignment.delete({ where: { id } });
    return { ok: true };
  }

  private async notifyAssignment(created: {
    policyId: string;
    scopeKind: PolicyAssignmentScope;
    scopeTarget: string;
    scopeLabel: string;
    userIds: string[];
    startAt: Date;
    dueAt: Date;
    priority: PolicyAssignmentPriority;
    createdByUserId: string | null;
    policy: { title: string; version: number };
  }) {
    try {
      await this.notifications.createAssignmentNotifications({
        policyId: created.policyId,
        policyTitle: created.policy.title,
        policyVersion: String(created.policy.version),
        scopeKind: created.scopeKind,
        scopeTarget: created.scopeTarget,
        scopeLabel: created.scopeLabel,
        userIds: created.userIds,
        startAt: created.startAt,
        dueAt: created.dueAt,
        priority: created.priority,
        createdByUserId: created.createdByUserId,
      });
    } catch {
      // Assignment still succeeds if the inbox write fails.
    }
  }

  private async parseWriteInput(body: Record<string, unknown>, partial = false) {
    const policyId = this.readString(body.policyId);
    if (!partial && !policyId) {
      throw new BadRequestException('policyId is required.');
    }

    if (policyId) {
      const policy = await this.prisma.policy.findUnique({
        where: { id: policyId },
        select: { id: true },
      });
      if (!policy) {
        throw new BadRequestException('Selected policy was not found.');
      }
    }

    const scopeKind = this.parseScope(this.readString(body.scopeKind));
    if (!partial && !scopeKind) {
      throw new BadRequestException('scopeKind is required.');
    }

    const startAt = this.parseDate(this.readString(body.startAt) || this.readString(body.assignedAt), false);
    const dueAt = this.parseDate(this.readString(body.dueAt), true);
    if (!partial && (!startAt || !dueAt)) {
      throw new BadRequestException('start date and due date are required.');
    }
    if (startAt && dueAt && dueAt < startAt) {
      throw new BadRequestException('Due date must be on or after the start date.');
    }

    const resolvedScope = scopeKind
      ? await this.resolveScope(
          scopeKind,
          this.readString(body.scopeTarget),
          this.readString(body.scopeLabel),
          this.readStringArray(body.userIds),
        )
      : null;

    const priority = this.parsePriority(this.readString(body.priority));
    const createdByUserId = this.readString(body.createdByUserId) || undefined;

    return {
      ...(policyId ? { policyId } : {}),
      ...(resolvedScope
        ? {
            scopeKind: resolvedScope.scopeKind,
            scopeTarget: resolvedScope.scopeTarget,
            scopeLabel: resolvedScope.scopeLabel,
            userIds: resolvedScope.userIds,
          }
        : {}),
      ...(startAt ? { startAt } : {}),
      ...(dueAt ? { dueAt } : {}),
      ...(priority ? { priority } : {}),
      ...(body.notes !== undefined ? { notes: this.readString(body.notes) } : {}),
      ...(body.internalNotes !== undefined
        ? { internalNotes: this.readString(body.internalNotes) }
        : {}),
      ...(createdByUserId ? { createdByUserId } : {}),
    };
  }

  private async resolveScope(
    scopeKind: PolicyAssignmentScope,
    scopeTarget: string,
    scopeLabel: string,
    userIds: string[],
  ) {
    if (scopeKind === PolicyAssignmentScope.ORGANIZATION) {
      return {
        scopeKind,
        scopeTarget: '',
        scopeLabel: 'Organization-wide',
        userIds: [],
      };
    }

    if (scopeKind === PolicyAssignmentScope.USER) {
      if (userIds.length === 0) {
        throw new BadRequestException('Select at least one user.');
      }
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      if (users.length === 0) {
        throw new BadRequestException('Selected users were not found.');
      }
      const names = users.map(
        (user) => `${user.firstName} ${user.lastName}`.trim() || user.email,
      );
      return {
        scopeKind,
        scopeTarget: users.map((user) => user.id).join(','),
        scopeLabel: names.length === 1 ? names[0] : `${names.length} selected users`,
        userIds: users.map((user) => user.id),
      };
    }

    if (!scopeTarget) {
      throw new BadRequestException('Choose an audience for this assignment.');
    }

    if (scopeKind === PolicyAssignmentScope.DEPARTMENT) {
      const department = await this.prisma.department.findFirst({
        where: { OR: [{ id: scopeTarget }, { name: scopeTarget }] },
        select: { id: true, name: true },
      });
      if (!department) {
        throw new BadRequestException('Selected department was not found.');
      }
      return {
        scopeKind,
        scopeTarget: department.id,
        scopeLabel: department.name,
        userIds: [],
      };
    }

    if (scopeKind === PolicyAssignmentScope.LOCATION) {
      const location = await this.prisma.location.findFirst({
        where: { OR: [{ id: scopeTarget }, { name: scopeTarget }] },
        select: { id: true, name: true },
      });
      if (!location) {
        throw new BadRequestException('Selected branch was not found.');
      }
      return {
        scopeKind,
        scopeTarget: location.id,
        scopeLabel: location.name,
        userIds: [],
      };
    }

    const role = await this.prisma.roleDefinition.findFirst({
      where: { OR: [{ id: scopeTarget }, { name: scopeTarget }] },
      select: { id: true, name: true },
    });
    if (!role) {
      throw new BadRequestException('Selected role was not found.');
    }
    return {
      scopeKind,
      scopeTarget: role.name,
      scopeLabel: role.name,
      userIds: [],
    };
  }

  private async serialize(row: {
    id: string;
    policyId: string;
    scopeKind: PolicyAssignmentScope;
    scopeTarget: string;
    scopeLabel: string;
    userIds: string[];
    startAt: Date;
    dueAt: Date;
    status: PolicyAssignmentStatus;
    priority: PolicyAssignmentPriority;
    notes: string;
    internalNotes: string;
    policy: {
      id: string;
      title: string;
      version: number;
      createdAt: Date;
      status: string;
    };
  }) {
    const recipients = await this.countRecipients(
      row.scopeKind,
      row.scopeTarget,
      row.userIds,
    );

    return {
      id: row.id,
      policyId: row.policyId,
      policyTitle: row.policy.title,
      policyVersion: `${row.policy.version}.0`,
      effectiveDate: this.toDateValue(row.policy.createdAt),
      scopeKind: scopeToClient[row.scopeKind],
      scopeTarget: row.scopeTarget,
      scopeLabel: row.scopeLabel,
      userIds: row.userIds,
      recipients,
      assignedAt: this.toDateValue(row.startAt),
      dueAt: this.toDateValue(row.dueAt),
      status: statusToClient[row.status],
      priority: priorityToClient[row.priority],
      notes: row.notes,
      internalNotes: row.internalNotes,
    };
  }

  private async countRecipients(
    scopeKind: PolicyAssignmentScope,
    scopeTarget: string,
    userIds: string[],
  ) {
    const active: Prisma.UserWhereInput = { status: UserStatus.ACTIVE };

    if (scopeKind === PolicyAssignmentScope.ORGANIZATION) {
      return this.prisma.user.count({ where: active });
    }

    if (scopeKind === PolicyAssignmentScope.DEPARTMENT) {
      return this.prisma.user.count({
        where: {
          ...active,
          OR: [{ departmentId: scopeTarget }, { department: scopeTarget }],
        },
      });
    }

    if (scopeKind === PolicyAssignmentScope.LOCATION) {
      return this.prisma.user.count({
        where: {
          ...active,
          OR: [
            { locationId: scopeTarget },
            { locationRef: { name: scopeTarget } },
          ],
        },
      });
    }

    if (scopeKind === PolicyAssignmentScope.ROLE) {
      return this.prisma.user.count({
        where: { ...active, roleTitle: scopeTarget },
      });
    }

    if (userIds.length === 0) {
      return 0;
    }

    return this.prisma.user.count({
      where: { ...active, id: { in: userIds } },
    });
  }

  private assignmentAppliesToUser(
    assignment: {
      scopeKind: PolicyAssignmentScope;
      scopeTarget: string;
      scopeLabel: string;
      userIds: string[];
    },
    user: {
      id: string;
      department: string;
      departmentId: string | null;
      locationId: string | null;
      roleTitle: string;
      departmentRef: { id: string; name: string } | null;
      locationRef: { id: string; name: string } | null;
    },
  ) {
    if (assignment.scopeKind === PolicyAssignmentScope.ORGANIZATION) {
      return true;
    }
    if (assignment.scopeKind === PolicyAssignmentScope.USER) {
      return assignment.userIds.includes(user.id);
    }
    if (assignment.scopeKind === PolicyAssignmentScope.DEPARTMENT) {
      return (
        user.departmentId === assignment.scopeTarget ||
        user.department === assignment.scopeTarget ||
        user.departmentRef?.id === assignment.scopeTarget ||
        user.departmentRef?.name === assignment.scopeLabel ||
        user.departmentRef?.name === assignment.scopeTarget
      );
    }
    if (assignment.scopeKind === PolicyAssignmentScope.LOCATION) {
      return (
        user.locationId === assignment.scopeTarget ||
        user.locationRef?.id === assignment.scopeTarget ||
        user.locationRef?.name === assignment.scopeTarget ||
        user.locationRef?.name === assignment.scopeLabel
      );
    }
    return (
      user.roleTitle === assignment.scopeTarget || user.roleTitle === assignment.scopeLabel
    );
  }

  private async ensureExists(id: string) {
    const existing = await this.prisma.policyAssignment.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Assignment was not found.');
    }
  }

  private parseScope(value: string) {
    return scopeFromClient[value] ?? undefined;
  }

  private parseStatus(value: string) {
    return statusFromClient[value] ?? undefined;
  }

  private parsePriority(value: string) {
    return priorityFromClient[value] ?? undefined;
  }

  private parseDate(value: string, endOfDay: boolean) {
    if (!value) return undefined;
    const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      if (endOfDay) date.setHours(23, 59, 59, 999);
      else date.setHours(0, 0, 0, 0);
    }
    return date;
  }

  private toDateValue(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private readString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : '';
  }

  private readStringArray(value: unknown) {
    if (!Array.isArray(value)) return [];
    return value
      .filter((item): item is string => typeof item === 'string' && Boolean(item.trim()))
      .map((item) => item.trim());
  }
}

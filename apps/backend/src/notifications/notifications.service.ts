import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationCategory,
  NotificationPriority,
  PolicyAssignmentPriority,
  PolicyAssignmentScope,
  PolicyAssignmentStatus,
  Prisma,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InboxEventsService } from './inbox-events.service';

type InboxMetadata = {
  policyName?: string;
  policyVersion?: string;
  assignedBy?: string;
  assignedDate?: string;
  dueDate?: string;
  scope?: string;
  steps?: string[];
  actionLabel?: string;
};

type AssignmentNoticeInput = {
  policyId: string;
  policyTitle: string;
  policyVersion: string;
  scopeKind: PolicyAssignmentScope;
  scopeTarget: string;
  scopeLabel: string;
  userIds: string[];
  startAt: Date;
  dueAt: Date;
  priority: PolicyAssignmentPriority;
  createdByUserId?: string | null;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: InboxEventsService,
  ) {}

  async list(userId: string, query: Record<string, string | undefined>) {
    await this.assertUser(userId);
    await this.ensureAssignmentInbox(userId);

    const tab = (query.tab ?? 'all').trim().toLowerCase();
    const search = (query.search ?? '').trim();
    const category = this.readCategory(query.category);
    const priority = this.readPriority(query.priority);
    const page = Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1);
    const pageSize = Math.min(50, Math.max(5, Number.parseInt(query.pageSize ?? '10', 10) || 10));

    const where: Prisma.NotificationMessageWhereInput = {
      userId,
      deletedAt: null,
      channel: 'inapp',
      AND: [
        tab === 'unread' ? { readAt: null } : {},
        tab === 'assignments' ? { category: NotificationCategory.ASSIGNMENT } : {},
        tab === 'compliance' ? { category: NotificationCategory.COMPLIANCE } : {},
        tab === 'system' ? { category: NotificationCategory.SYSTEM } : {},
        tab === 'updates' ? { category: NotificationCategory.UPDATES } : {},
        category ? { category } : {},
        priority ? { priority } : {},
        search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { body: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
      ],
    };

    const [total, unread, items, counts] = await Promise.all([
      this.prisma.notificationMessage.count({ where }),
      this.unreadCountFor(userId),
      this.prisma.notificationMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          policy: { select: { id: true, title: true, version: true } },
          batch: {
            select: {
              name: true,
              audience: true,
              createdByUserId: true,
            },
          },
        },
      }),
      this.tabCounts(userId),
    ]);

    return {
      data: {
        unread,
        counts,
        items: items.map((row) => this.toInboxItem(row)),
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
      },
    };
  }

  async unreadCount(userId: string) {
    await this.assertUser(userId);
    return { data: { unread: await this.unreadCountFor(userId) } };
  }

  async markRead(userId: string, id: string, read = true) {
    const row = await this.findOwned(userId, id);
    const next = await this.prisma.notificationMessage.update({
      where: { id: row.id },
      data: { readAt: read ? new Date() : null },
      include: {
        policy: { select: { id: true, title: true, version: true } },
        batch: { select: { name: true, audience: true, createdByUserId: true } },
      },
    });
    if (read && !row.readAt && row.batchId) {
      await this.prisma.notificationBatch.update({
        where: { id: row.batchId },
        data: { openedCount: { increment: 1 } },
      });
    }
    this.events.notify([userId]);
    return { data: this.toInboxItem(next) };
  }

  async markAllRead(userId: string) {
    await this.assertUser(userId);
    const result = await this.prisma.notificationMessage.updateMany({
      where: { userId, deletedAt: null, readAt: null },
      data: { readAt: new Date() },
    });
    this.events.notify([userId]);
    return { data: { updated: result.count } };
  }

  async remove(userId: string, id: string) {
    const row = await this.findOwned(userId, id);
    await this.prisma.notificationMessage.update({
      where: { id: row.id },
      data: { deletedAt: new Date() },
    });
    this.events.notify([userId]);
    return { data: { id: row.id, deleted: true } };
  }

  async createAssignmentNotifications(input: AssignmentNoticeInput) {
    const recipients = await this.usersForScope(
      input.scopeKind,
      input.scopeTarget,
      input.userIds,
    );
    if (recipients.length === 0) return { data: { created: 0 } };

    const createdBy = input.createdByUserId
      ? await this.prisma.user.findUnique({
          where: { id: input.createdByUserId },
          select: { firstName: true, lastName: true, email: true },
        })
      : null;
    const assignedBy = createdBy
      ? `${createdBy.firstName} ${createdBy.lastName}`.trim() || createdBy.email
      : 'Admin User';
    const due = this.formatDate(input.dueAt);
    const assignedDate = this.formatDate(input.startAt);
    const since = new Date();
    since.setDate(since.getDate() - 1);

    const existing = await this.prisma.notificationMessage.findMany({
      where: {
        policyId: input.policyId,
        category: NotificationCategory.ASSIGNMENT,
        userId: { in: recipients.map((user) => user.id) },
        deletedAt: null,
        createdAt: { gte: since },
        title: 'New Policy Assigned',
      },
      select: { userId: true },
    });
    const already = new Set(existing.map((row) => row.userId));
    const pending = recipients.filter((user) => !already.has(user.id));
    if (pending.length === 0) return { data: { created: 0 } };

    const metadata: InboxMetadata = {
      policyName: `${input.policyTitle} v${input.policyVersion}`,
      policyVersion: `v${input.policyVersion}`,
      assignedBy,
      assignedDate,
      dueDate: due,
      scope: input.scopeLabel,
      steps: [
        'Read the policy document',
        'Acknowledge your understanding',
        'Complete any required assessment',
      ],
      actionLabel: 'View Policy',
    };

    await this.prisma.notificationMessage.createMany({
      data: pending.map((user) => ({
        userId: user.id,
        policyId: input.policyId,
        channel: 'inapp',
        title: 'New Policy Assigned',
        body: `${input.policyTitle} has been assigned to you. Please review and acknowledge by ${due}.`,
        category: NotificationCategory.ASSIGNMENT,
        priority: this.mapAssignmentPriority(input.priority),
        metadata: metadata as Prisma.InputJsonValue,
      })),
    });

    this.events.notify(pending.map((user) => user.id));
    return { data: { created: pending.length } };
  }

  private async ensureAssignmentInbox(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        status: true,
        department: true,
        departmentId: true,
        locationId: true,
        roleTitle: true,
        departmentRef: { select: { id: true, name: true } },
        locationRef: { select: { id: true, name: true } },
      },
    });
    if (!user || user.status !== UserStatus.ACTIVE) return;

    const assignments = await this.prisma.policyAssignment.findMany({
      where: {
        status: PolicyAssignmentStatus.ACTIVE,
        startAt: { lte: new Date() },
      },
      include: {
        policy: { select: { id: true, title: true, version: true } },
      },
    });
    const mine = assignments.filter((assignment) =>
      this.assignmentAppliesToUser(assignment, user),
    );
    if (mine.length === 0) return;

    const existing = await this.prisma.notificationMessage.findMany({
      where: {
        userId,
        deletedAt: null,
        category: NotificationCategory.ASSIGNMENT,
        policyId: { in: mine.map((row) => row.policyId) },
        title: 'New Policy Assigned',
      },
      select: { policyId: true },
    });
    const have = new Set(existing.map((row) => row.policyId));
    const missing = mine.filter((row) => !have.has(row.policyId));
    if (missing.length === 0) return;

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    await this.prisma.notificationMessage.createMany({
      data: missing.map((assignment) => {
        const due = this.formatDate(assignment.dueAt);
        const stale = assignment.startAt < threeDaysAgo;
        const metadata: InboxMetadata = {
          policyName: `${assignment.policy.title} v${assignment.policy.version}`,
          policyVersion: `v${assignment.policy.version}`,
          assignedBy: 'Admin User',
          assignedDate: this.formatDate(assignment.startAt),
          dueDate: due,
          scope: assignment.scopeLabel,
          steps: [
            'Read the policy document',
            'Acknowledge your understanding',
            'Complete any required assessment',
          ],
          actionLabel: 'View Policy',
        };
        return {
          userId,
          policyId: assignment.policyId,
          channel: 'inapp',
          title: 'New Policy Assigned',
          body: `${assignment.policy.title} has been assigned to you. Please review and acknowledge by ${due}.`,
          category: NotificationCategory.ASSIGNMENT,
          priority: this.mapAssignmentPriority(assignment.priority),
          readAt: stale ? assignment.startAt : null,
          createdAt: assignment.startAt,
          metadata: metadata as Prisma.InputJsonValue,
        };
      }),
    });
    this.events.notify([userId]);
  }

  private async unreadCountFor(userId: string) {
    return this.prisma.notificationMessage.count({
      where: {
        userId,
        deletedAt: null,
        readAt: null,
        channel: 'inapp',
      },
    });
  }

  private async tabCounts(userId: string) {
    const base: Prisma.NotificationMessageWhereInput = {
      userId,
      deletedAt: null,
      channel: 'inapp',
    };
    const [all, unread, assignments, compliance, system, updates] = await Promise.all([
      this.prisma.notificationMessage.count({ where: base }),
      this.prisma.notificationMessage.count({ where: { ...base, readAt: null } }),
      this.prisma.notificationMessage.count({
        where: { ...base, category: NotificationCategory.ASSIGNMENT },
      }),
      this.prisma.notificationMessage.count({
        where: { ...base, category: NotificationCategory.COMPLIANCE },
      }),
      this.prisma.notificationMessage.count({
        where: { ...base, category: NotificationCategory.SYSTEM },
      }),
      this.prisma.notificationMessage.count({
        where: { ...base, category: NotificationCategory.UPDATES },
      }),
    ]);
    return { all, unread, assignments, compliance, system, updates };
  }

  private toInboxItem(row: {
    id: string;
    title: string;
    body: string;
    category: NotificationCategory;
    priority: NotificationPriority;
    readAt: Date | null;
    createdAt: Date;
    policyId: string | null;
    metadata: Prisma.JsonValue;
    policy: { id: string; title: string; version: number } | null;
  }) {
    const meta = this.readMetadata(row.metadata);
    const policyName =
      meta.policyName ||
      (row.policy ? `${row.policy.title} v${row.policy.version}` : undefined);
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      category: row.category,
      priority: row.priority,
      read: Boolean(row.readAt),
      createdAt: row.createdAt.toISOString(),
      policyId: row.policyId ?? row.policy?.id ?? null,
      policyName: policyName ?? null,
      assignedBy: meta.assignedBy ?? null,
      assignedDate: meta.assignedDate ?? null,
      dueDate: meta.dueDate ?? null,
      scope: meta.scope ?? null,
      steps: meta.steps?.length
        ? meta.steps
        : this.defaultSteps(row.category),
      actionLabel: meta.actionLabel ?? (row.policyId ? 'View Policy' : null),
    };
  }

  private defaultSteps(category: NotificationCategory) {
    if (category === NotificationCategory.ASSIGNMENT) {
      return [
        'Read the policy document',
        'Acknowledge your understanding',
        'Complete any required assessment',
      ];
    }
    if (category === NotificationCategory.COMPLIANCE) {
      return ['Review the outstanding compliance task', 'Complete it before the due date'];
    }
    return ['Review this notification'];
  }

  private readMetadata(value: Prisma.JsonValue): InboxMetadata {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const row = value as Record<string, unknown>;
    const steps = Array.isArray(row.steps)
      ? row.steps.filter((item): item is string => typeof item === 'string')
      : undefined;
    return {
      policyName: typeof row.policyName === 'string' ? row.policyName : undefined,
      policyVersion: typeof row.policyVersion === 'string' ? row.policyVersion : undefined,
      assignedBy: typeof row.assignedBy === 'string' ? row.assignedBy : undefined,
      assignedDate: typeof row.assignedDate === 'string' ? row.assignedDate : undefined,
      dueDate: typeof row.dueDate === 'string' ? row.dueDate : undefined,
      scope: typeof row.scope === 'string' ? row.scope : undefined,
      steps,
      actionLabel: typeof row.actionLabel === 'string' ? row.actionLabel : undefined,
    };
  }

  private async usersForScope(
    scopeKind: PolicyAssignmentScope,
    scopeTarget: string,
    userIds: string[],
  ) {
    const active: Prisma.UserWhereInput = { status: UserStatus.ACTIVE };
    const select = { id: true, firstName: true, lastName: true, email: true };

    if (scopeKind === PolicyAssignmentScope.ORGANIZATION) {
      return this.prisma.user.findMany({ where: active, select });
    }
    if (scopeKind === PolicyAssignmentScope.DEPARTMENT) {
      return this.prisma.user.findMany({
        where: {
          ...active,
          OR: [{ departmentId: scopeTarget }, { department: scopeTarget }],
        },
        select,
      });
    }
    if (scopeKind === PolicyAssignmentScope.LOCATION) {
      return this.prisma.user.findMany({
        where: {
          ...active,
          OR: [{ locationId: scopeTarget }, { locationRef: { name: scopeTarget } }],
        },
        select,
      });
    }
    if (scopeKind === PolicyAssignmentScope.ROLE) {
      return this.prisma.user.findMany({
        where: { ...active, roleTitle: scopeTarget },
        select,
      });
    }
    if (userIds.length === 0) return [];
    return this.prisma.user.findMany({
      where: { ...active, id: { in: userIds } },
      select,
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
    if (assignment.scopeKind === PolicyAssignmentScope.ORGANIZATION) return true;
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
    return user.roleTitle === assignment.scopeTarget || user.roleTitle === assignment.scopeLabel;
  }

  private mapAssignmentPriority(priority: PolicyAssignmentPriority) {
    if (priority === PolicyAssignmentPriority.HIGH) return NotificationPriority.HIGH;
    if (priority === PolicyAssignmentPriority.LOW) return NotificationPriority.LOW;
    return NotificationPriority.MEDIUM;
  }

  private async findOwned(userId: string, id: string) {
    const row = await this.prisma.notificationMessage.findFirst({
      where: { id, userId, deletedAt: null },
    });
    if (!row) throw new NotFoundException('Notification was not found.');
    return row;
  }

  private async assertUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw new BadRequestException('Signed-in user was not found.');
    return user;
  }

  private readCategory(value?: string) {
    if (!value) return undefined;
    const normalized = value.trim().toUpperCase();
    return (Object.values(NotificationCategory) as string[]).includes(normalized)
      ? (normalized as NotificationCategory)
      : undefined;
  }

  private readPriority(value?: string) {
    if (!value) return undefined;
    const normalized = value.trim().toUpperCase();
    return (Object.values(NotificationPriority) as string[]).includes(normalized)
      ? (normalized as NotificationPriority)
      : undefined;
  }

  private formatDate(value: Date) {
    return value.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationAudience,
  NotificationBatchStatus,
  NotificationCategory,
  NotificationPriority,
  NotificationTrigger,
  Prisma,
  Role,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ComplianceService } from './compliance.service';
import { InboxEventsService } from '../notifications/inbox-events.service';

const CHANNELS = ['email', 'inapp'] as const;
type Channel = (typeof CHANNELS)[number];

const DEFAULT_TEMPLATES = [
  {
    kind: 'UPCOMING',
    name: 'Upcoming Due Date',
    subject: 'Reminder: {{policy}} is due on {{due}}',
    body: 'Hello {{name}},\n\n{{policy}} ({{policyVersion}}) is due on {{due}}. Please complete your acknowledgement and any required assessment before the deadline.',
  },
  {
    kind: 'DUE',
    name: 'Due Date Reminder',
    subject: '{{policy}} is due today',
    body: 'Hello {{name}},\n\n{{policy}} ({{policyVersion}}) is due today. Please complete it now so your compliance record stays current.',
  },
  {
    kind: 'OVERDUE',
    name: 'Overdue Reminder',
    subject: '{{policy}} is overdue',
    body: 'Hello {{name}},\n\n{{policy}} ({{policyVersion}}) is overdue. Complete your acknowledgement and assessment as soon as possible.',
  },
  {
    kind: 'ESCALATION',
    name: 'Escalation Notice',
    subject: 'Escalation: overdue compliance for {{policy}}',
    body: '{{name}} has an outstanding {{policy}} ({{policyVersion}}) assignment that is overdue. Please follow up so this policy can be completed.',
  },
];

const DEFAULT_RULES: Array<{
  name: string;
  trigger: NotificationTrigger;
  offsetDays: number;
  channels: Channel[];
  audience: NotificationAudience;
  kind: string;
}> = [
  {
    name: 'Upcoming Due Date',
    trigger: NotificationTrigger.DAYS_BEFORE_DUE,
    offsetDays: 7,
    channels: ['email', 'inapp'],
    audience: NotificationAudience.ALL,
    kind: 'UPCOMING',
  },
  {
    name: 'Second Reminder',
    trigger: NotificationTrigger.DAYS_BEFORE_DUE,
    offsetDays: 3,
    channels: ['email', 'inapp'],
    audience: NotificationAudience.PENDING,
    kind: 'UPCOMING',
  },
  {
    name: 'Due Date Reminder',
    trigger: NotificationTrigger.ON_DUE_DATE,
    offsetDays: 0,
    channels: ['email', 'inapp'],
    audience: NotificationAudience.PENDING_OVERDUE,
    kind: 'DUE',
  },
  {
    name: 'Overdue Reminder',
    trigger: NotificationTrigger.EVERY_DAY_AFTER_DUE,
    offsetDays: 1,
    channels: ['email', 'inapp'],
    audience: NotificationAudience.OVERDUE,
    kind: 'OVERDUE',
  },
  {
    name: 'Escalation to Manager',
    trigger: NotificationTrigger.DAYS_AFTER_DUE,
    offsetDays: 5,
    channels: ['email'],
    audience: NotificationAudience.MANAGER,
    kind: 'ESCALATION',
  },
  {
    name: 'Escalation to Compliance',
    trigger: NotificationTrigger.DAYS_AFTER_DUE,
    offsetDays: 10,
    channels: ['email', 'inapp'],
    audience: NotificationAudience.COMPLIANCE,
    kind: 'ESCALATION',
  },
];

@Injectable()
export class ComplianceNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly compliance: ComplianceService,
    private readonly inboxEvents: InboxEventsService,
  ) {}

  async getForPolicy(policyId: string) {
    const policy = await this.assertPolicy(policyId);
    await this.ensureSetup(policyId);
    const employees = await this.compliance.getEmployees(policyId);
    await this.processDueRules(policyId, employees.data);

    const [rules, templates, batches] = await Promise.all([
      this.prisma.notificationRule.findMany({
        where: { policyId },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        include: { template: { select: { id: true, name: true, kind: true } } },
      }),
      this.prisma.notificationTemplate.findMany({
        where: { OR: [{ policyId: null }, { policyId }] },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.notificationBatch.findMany({
        where: { policyId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    const counts = this.audienceCounts(employees.data);
    const now = new Date();
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const recent = batches.filter((batch) => batch.createdAt >= monthAgo);
    const sent = recent.reduce((sum, batch) => sum + batch.deliveredCount, 0);
    const failed = recent.reduce((sum, batch) => sum + batch.failedCount, 0);
    const channelHits = { email: 0, inapp: 0 };
    for (const batch of recent) {
      for (const channel of this.readChannels(batch.channels)) {
        channelHits[channel] += batch.deliveredCount;
      }
    }
    const channelTotal = channelHits.email + channelHits.inapp;
    const dueAt = this.earliestDue(employees.data);
    const nextAt = this.nextFireFromRules(dueAt, rules);
    const upcomingRecipients = nextAt
      ? this.upcomingRecipientCount(rules, dueAt, nextAt, counts)
      : 0;

    return {
      data: {
        policyId,
        policyTitle: policy.title,
        policyVersion: `v${policy.version}`,
        dueAt: dueAt?.toISOString() ?? null,
        stats: {
          upcoming: upcomingRecipients,
          nextAt: nextAt?.toISOString() ?? null,
          sent,
          failed,
          deliveredPct: sent + failed === 0 ? 100 : Math.round((sent / (sent + failed)) * 100),
          failedPct: sent + failed === 0 ? 0 : Math.round((failed / (sent + failed)) * 100),
          channels: {
            email: channelTotal === 0 ? 0 : Math.round((channelHits.email / channelTotal) * 100),
            inapp: channelTotal === 0 ? 0 : Math.round((channelHits.inapp / channelTotal) * 100),
          },
        },
        audienceCounts: counts,
        rules: rules.map((rule) => this.toRule(rule)),
        templates: templates.map((template) => ({
          id: template.id,
          name: template.name,
          kind: template.kind,
          isDefault: template.isDefault,
          subject: template.subject,
          body: template.body,
        })),
        history: batches.map((batch) => this.toHistory(batch)),
      },
    };
  }

  async sendNow(policyId: string, body: Record<string, unknown>, actorId?: string) {
    await this.assertPolicy(policyId);
    await this.ensureSetup(policyId);
    const audience = this.readAudience(body.audience) ?? NotificationAudience.PENDING_OVERDUE;
    const template = await this.resolveTemplate(policyId, body.templateId, body.kind);
    return this.dispatch({
      policyId,
      audience,
      channels: this.normalizeChannels(body.channels),
      name: template.name,
      templateId: template.id,
      ruleId: typeof body.ruleId === 'string' ? body.ruleId : null,
      actorId,
      requireRecipients: true,
    });
  }

  async createRule(policyId: string, body: Record<string, unknown>) {
    await this.assertPolicy(policyId);
    await this.ensureSetup(policyId);
    const count = await this.prisma.notificationRule.count({ where: { policyId } });
    const template = await this.resolveTemplate(policyId, body.templateId, body.kind);
    const row = await this.prisma.notificationRule.create({
      data: {
        policyId,
        templateId: template.id,
        name: this.readRequired(body.name, 'name'),
        trigger: this.readTrigger(body.trigger) ?? NotificationTrigger.MANUAL,
        offsetDays: this.readOffset(body.offsetDays),
        channels: this.normalizeChannels(body.channels),
        audience: this.readAudience(body.audience) ?? NotificationAudience.PENDING_OVERDUE,
        enabled: body.enabled !== false,
        sortOrder: count,
      },
      include: { template: { select: { id: true, name: true, kind: true } } },
    });
    return { data: this.toRule(row) };
  }

  async updateRule(policyId: string, ruleId: string, body: Record<string, unknown>) {
    const rule = await this.prisma.notificationRule.findFirst({
      where: { id: ruleId, policyId },
    });
    if (!rule) {
      throw new NotFoundException('Notification rule was not found.');
    }
    const templateId =
      typeof body.templateId === 'string' && body.templateId.trim()
        ? body.templateId.trim()
        : undefined;
    const row = await this.prisma.notificationRule.update({
      where: { id: ruleId },
      data: {
        name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : undefined,
        trigger: this.readTrigger(body.trigger),
        offsetDays:
          body.offsetDays === undefined ? undefined : this.readOffset(body.offsetDays),
        channels: Array.isArray(body.channels) ? this.normalizeChannels(body.channels) : undefined,
        audience: this.readAudience(body.audience),
        enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
        templateId,
      },
      include: { template: { select: { id: true, name: true, kind: true } } },
    });
    return { data: this.toRule(row) };
  }

  async deleteRule(policyId: string, ruleId: string) {
    const rule = await this.prisma.notificationRule.findFirst({
      where: { id: ruleId, policyId },
    });
    if (!rule) {
      throw new NotFoundException('Notification rule was not found.');
    }
    await this.prisma.notificationRule.delete({ where: { id: ruleId } });
    return { data: { id: ruleId, deleted: true } };
  }

  private async processDueRules(
    policyId: string,
    employees: Array<{ dueAt: string | null }>,
  ) {
    const rules = await this.prisma.notificationRule.findMany({
      where: { policyId, enabled: true, trigger: { not: NotificationTrigger.MANUAL } },
      include: { template: true },
    });
    const dueAt = this.earliestDue(employees);
    if (!dueAt) return;
    const now = new Date();

    for (const rule of rules) {
      if (!this.shouldFire(rule.trigger, rule.offsetDays, dueAt, rule.lastFiredAt, now)) {
        continue;
      }
      await this.dispatch({
        policyId,
        audience: rule.audience,
        channels: this.readChannels(rule.channels),
        name: rule.name,
        templateId: rule.templateId,
        ruleId: rule.id,
        actorId: null,
        requireRecipients: false,
        dueAt,
      });
    }
  }

  private async dispatch(input: {
    policyId: string;
    audience: NotificationAudience;
    channels: string[];
    name: string;
    templateId: string | null;
    ruleId: string | null;
    actorId?: string | null;
    requireRecipients?: boolean;
    dueAt?: Date | null;
  }) {
    const policy = await this.assertPolicy(input.policyId);
    const template = input.templateId
      ? await this.prisma.notificationTemplate.findUnique({ where: { id: input.templateId } })
      : await this.prisma.notificationTemplate.findFirst({
          where: { kind: 'OVERDUE', policyId: null },
        });
    const recipients = await this.resolveRecipients(input.policyId, input.audience);
    const dueAt =
      input.dueAt ??
      this.earliestDue((await this.compliance.getEmployees(input.policyId)).data);
    const resolvedChannels = this.normalizeChannels(input.channels);
    const now = new Date();

    if (recipients.length === 0) {
      if (input.requireRecipients) {
        throw new BadRequestException('No employees match this audience.');
      }
      if (input.ruleId) {
        await this.prisma.notificationRule.update({
          where: { id: input.ruleId },
          data: { lastFiredAt: now },
        });
      }
      return { data: null };
    }

    const batch = await this.prisma.notificationBatch.create({
      data: {
        policyId: input.policyId,
        ruleId: input.ruleId,
        templateId: template?.id ?? null,
        name: input.name,
        channels: resolvedChannels,
        audience: input.audience,
        status: NotificationBatchStatus.DELIVERED,
        recipientCount: recipients.length,
        deliveredCount: recipients.length,
        failedCount: 0,
        createdByUserId: input.actorId?.trim() || null,
      },
    });

    const classified = this.classifyMessage(template?.kind ?? 'OVERDUE', input.audience, input.name);
    const assignedBy = input.actorId
      ? await this.prisma.user.findUnique({
          where: { id: input.actorId },
          select: { firstName: true, lastName: true, email: true },
        })
      : null;
    const assignedByName = assignedBy
      ? `${assignedBy.firstName} ${assignedBy.lastName}`.trim() || assignedBy.email
      : 'Compliance';
    const dueLabel = dueAt
      ? dueAt.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'the due date';

    await this.prisma.notificationMessage.createMany({
      data: recipients.map((user) => {
        const rendered = this.render(
          template?.subject || input.name,
          template?.body || `Please complete ${policy.title}.`,
          {
            name: user.name,
            policy: policy.title,
            policyVersion: `v${policy.version}`,
            due: dueLabel,
          },
        );
        return {
          batchId: batch.id,
          userId: user.id,
          policyId: input.policyId,
          channel: 'inapp',
          title: rendered.subject,
          body: rendered.body,
          category: classified.category,
          priority: classified.priority,
          metadata: {
            policyName: `${policy.title} v${policy.version}`,
            policyVersion: `v${policy.version}`,
            assignedBy: assignedByName,
            dueDate: dueLabel,
            scope: 'Assigned employees',
            steps: classified.steps,
            actionLabel: 'View Policy',
          } as Prisma.InputJsonValue,
        };
      }),
    });

    this.inboxEvents.notify(recipients.map((user) => user.id));

    if (input.ruleId) {
      await this.prisma.notificationRule.update({
        where: { id: input.ruleId },
        data: { lastFiredAt: now },
      });
    }

    return { data: this.toHistory(batch) };
  }

  private async resolveRecipients(policyId: string, audience: NotificationAudience) {
    const { data: employees } = await this.compliance.getEmployees(policyId);
    const pending = employees.filter(
      (row) => row.status === 'PENDING' || row.status === 'NOT_STARTED',
    );
    const overdue = employees.filter((row) => row.status === 'OVERDUE');
    const incomplete = employees.filter((row) => row.status !== 'COMPLETED');

    let ids: string[] = [];
    if (audience === NotificationAudience.ALL) {
      ids = employees.map((row) => row.id);
    } else if (audience === NotificationAudience.PENDING) {
      ids = pending.map((row) => row.id);
    } else if (audience === NotificationAudience.OVERDUE) {
      ids = overdue.map((row) => row.id);
    } else if (audience === NotificationAudience.PENDING_OVERDUE) {
      ids = incomplete.map((row) => row.id);
    } else if (audience === NotificationAudience.MANAGER) {
      const source = overdue.length > 0 ? overdue : incomplete;
      const users = await this.prisma.user.findMany({
        where: { id: { in: source.map((row) => row.id) } },
        select: { reportsToUserId: true },
      });
      ids = [
        ...new Set(
          users
            .map((row) => row.reportsToUserId)
            .filter((value): value is string => Boolean(value)),
        ),
      ];
    } else {
      const officers = await this.prisma.user.findMany({
        where: {
          status: UserStatus.ACTIVE,
          OR: [
            { role: Role.ADMIN },
            { department: { contains: 'Compliance', mode: 'insensitive' } },
            { roleTitle: { contains: 'Compliance', mode: 'insensitive' } },
          ],
        },
        select: { id: true },
      });
      ids = officers.map((row) => row.id);
    }

    if (ids.length === 0) return [];
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids }, status: UserStatus.ACTIVE },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    return users.map((user) => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`.trim() || user.email,
      email: user.email,
    }));
  }

  private classifyMessage(
    kind: string,
    audience: NotificationAudience,
    name: string,
  ): {
    category: NotificationCategory;
    priority: NotificationPriority;
    steps: string[];
  } {
    const lower = `${kind} ${name}`.toLowerCase();
    if (
      audience === NotificationAudience.MANAGER ||
      audience === NotificationAudience.COMPLIANCE ||
      kind === 'ESCALATION'
    ) {
      return {
        category: NotificationCategory.COMPLIANCE,
        priority: NotificationPriority.HIGH,
        steps: ['Follow up with the assigned employee', 'Confirm the policy is completed'],
      };
    }
    if (kind === 'OVERDUE' || lower.includes('assessment')) {
      return {
        category: NotificationCategory.COMPLIANCE,
        priority: NotificationPriority.HIGH,
        steps: ['Open the outstanding task', 'Complete it as soon as possible'],
      };
    }
    if (kind === 'DUE') {
      return {
        category: NotificationCategory.ASSIGNMENT,
        priority: NotificationPriority.HIGH,
        steps: ['Read the policy document', 'Acknowledge your understanding'],
      };
    }
    if (kind === 'UPCOMING' || lower.includes('assigned')) {
      return {
        category: NotificationCategory.ASSIGNMENT,
        priority: NotificationPriority.MEDIUM,
        steps: ['Read the policy document', 'Acknowledge your understanding'],
      };
    }
    return {
      category: NotificationCategory.COMPLIANCE,
      priority: NotificationPriority.MEDIUM,
      steps: ['Review this notification', 'Complete any required action'],
    };
  }

  private async ensureSetup(policyId: string) {
    const existingTemplates = await this.prisma.notificationTemplate.findMany({
      where: { policyId: null },
    });
    if (existingTemplates.length === 0) {
      await this.prisma.notificationTemplate.createMany({
        data: DEFAULT_TEMPLATES.map((template) => ({
          ...template,
          policyId: null,
          isDefault: true,
        })),
      });
    }

    const templates = await this.prisma.notificationTemplate.findMany({
      where: { policyId: null },
    });
    const byKind = new Map(templates.map((template) => [template.kind, template]));
    const existingRules = await this.prisma.notificationRule.findMany({
      where: { policyId },
      select: { id: true, channels: true },
    });
    if (existingRules.length > 0) {
      await this.stripSmsChannels(existingRules);
      return;
    }

    await this.prisma.notificationRule.createMany({
      data: DEFAULT_RULES.map((rule, index) => ({
        policyId,
        templateId: byKind.get(rule.kind)?.id ?? null,
        name: rule.name,
        trigger: rule.trigger,
        offsetDays: rule.offsetDays,
        channels: [...rule.channels],
        audience: rule.audience,
        enabled: true,
        sortOrder: index,
      })),
    });
  }

  private async stripSmsChannels(rules: Array<{ id: string; channels: string[] }>) {
    for (const rule of rules) {
      if (!rule.channels.some((channel) => channel.toLowerCase() === 'sms')) continue;
      await this.prisma.notificationRule.update({
        where: { id: rule.id },
        data: { channels: this.normalizeChannels(rule.channels) },
      });
    }
  }

  private async assertPolicy(policyId: string) {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      select: { id: true, title: true, version: true },
    });
    if (!policy) {
      throw new NotFoundException(`Policy ${policyId} was not found.`);
    }
    return policy;
  }

  private async resolveTemplate(policyId: string, templateId: unknown, kind: unknown) {
    if (typeof templateId === 'string' && templateId.trim()) {
      const row = await this.prisma.notificationTemplate.findFirst({
        where: {
          id: templateId.trim(),
          OR: [{ policyId: null }, { policyId }],
        },
      });
      if (!row) throw new BadRequestException('Template was not found.');
      return row;
    }
    const wanted = typeof kind === 'string' && kind.trim() ? kind.trim().toUpperCase() : 'OVERDUE';
    const row = await this.prisma.notificationTemplate.findFirst({
      where: { kind: wanted, OR: [{ policyId: null }, { policyId }] },
      orderBy: { isDefault: 'desc' },
    });
    if (!row) throw new BadRequestException('No notification template is available.');
    return row;
  }

  private audienceCounts(
    employees: Array<{ status: string }>,
  ) {
    const all = employees.length;
    const pending = employees.filter(
      (row) => row.status === 'PENDING' || row.status === 'NOT_STARTED',
    ).length;
    const overdue = employees.filter((row) => row.status === 'OVERDUE').length;
    return {
      all,
      pending,
      overdue,
      pendingOverdue: pending + overdue,
    };
  }

  private earliestDue(employees: Array<{ dueAt: string | null }>) {
    const dates = employees
      .map((row) => (row.dueAt ? new Date(row.dueAt) : null))
      .filter((value): value is Date => value instanceof Date && !Number.isNaN(value.getTime()))
      .sort((left, right) => left.getTime() - right.getTime());
    return dates[0] ?? null;
  }

  private nextFireFromRules(
    dueAt: Date | null,
    rules: Array<{
      enabled: boolean;
      trigger: NotificationTrigger;
      offsetDays: number;
      lastFiredAt: Date | null;
    }>,
  ) {
    if (!dueAt) return null;
    const now = new Date();
    const upcoming = rules
      .filter((rule) => rule.enabled && rule.trigger !== NotificationTrigger.MANUAL)
      .map((rule) => this.fireAt(rule.trigger, rule.offsetDays, dueAt, rule.lastFiredAt, now))
      .filter((value): value is Date => value instanceof Date && value.getTime() > now.getTime())
      .sort((left, right) => left.getTime() - right.getTime());
    return upcoming[0] ?? null;
  }

  private upcomingRecipientCount(
    rules: Array<{
      enabled: boolean;
      trigger: NotificationTrigger;
      offsetDays: number;
      lastFiredAt: Date | null;
      audience: NotificationAudience;
    }>,
    dueAt: Date | null,
    nextAt: Date,
    counts: { all: number; pending: number; overdue: number; pendingOverdue: number },
  ) {
    if (!dueAt) return 0;
    const now = new Date();
    const match = rules.find((rule) => {
      const at = this.fireAt(rule.trigger, rule.offsetDays, dueAt, rule.lastFiredAt, now);
      return at && at.getTime() === nextAt.getTime();
    });
    if (!match) return counts.pendingOverdue;
    if (match.audience === NotificationAudience.ALL) return counts.all;
    if (match.audience === NotificationAudience.PENDING) return counts.pending;
    if (match.audience === NotificationAudience.OVERDUE) return counts.overdue;
    return counts.pendingOverdue;
  }

  private shouldFire(
    trigger: NotificationTrigger,
    offsetDays: number,
    dueAt: Date,
    lastFiredAt: Date | null,
    now: Date,
  ) {
    const at = this.fireAt(trigger, offsetDays, dueAt, lastFiredAt, now);
    if (!at) return false;
    return at.getTime() <= now.getTime();
  }

  private fireAt(
    trigger: NotificationTrigger,
    offsetDays: number,
    dueAt: Date,
    lastFiredAt: Date | null,
    now: Date,
  ) {
    const due = new Date(dueAt);
    due.setHours(9, 0, 0, 0);
    if (trigger === NotificationTrigger.DAYS_BEFORE_DUE) {
      if (lastFiredAt) return null;
      const at = new Date(due);
      at.setDate(at.getDate() - Math.max(0, offsetDays));
      return at;
    }
    if (trigger === NotificationTrigger.ON_DUE_DATE) {
      if (lastFiredAt) return null;
      return due;
    }
    if (trigger === NotificationTrigger.DAYS_AFTER_DUE) {
      if (lastFiredAt) return null;
      const at = new Date(due);
      at.setDate(at.getDate() + Math.max(0, offsetDays));
      return at;
    }
    if (trigger === NotificationTrigger.EVERY_DAY_AFTER_DUE) {
      const start = new Date(due);
      start.setDate(start.getDate() + 1);
      start.setHours(9, 0, 0, 0);
      if (now < start) return start;
      if (lastFiredAt) {
        const lastDay = new Date(lastFiredAt);
        lastDay.setHours(0, 0, 0, 0);
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        if (lastDay.getTime() === today.getTime()) {
          const next = new Date(today);
          next.setDate(next.getDate() + 1);
          next.setHours(9, 0, 0, 0);
          return next;
        }
      }
      return now;
    }
    return null;
  }

  private toRule(rule: {
    id: string;
    name: string;
    trigger: NotificationTrigger;
    offsetDays: number;
    channels: string[];
    audience: NotificationAudience;
    enabled: boolean;
    lastFiredAt: Date | null;
    template: { id: string; name: string; kind: string } | null;
  }) {
    return {
      id: rule.id,
      name: rule.name,
      trigger: rule.trigger,
      offsetDays: rule.offsetDays,
      when: this.whenLabel(rule.trigger, rule.offsetDays),
      channels: this.readChannels(rule.channels),
      audience: rule.audience,
      recipients: this.audienceLabel(rule.audience),
      enabled: rule.enabled,
      lastFiredAt: rule.lastFiredAt?.toISOString() ?? null,
      templateId: rule.template?.id ?? null,
      templateName: rule.template?.name ?? null,
    };
  }

  private toHistory(batch: {
    id: string;
    name: string;
    channels: string[];
    audience: string;
    status: NotificationBatchStatus;
    recipientCount: number;
    deliveredCount: number;
    failedCount: number;
    openedCount: number;
    createdAt: Date;
  }) {
    const opened =
      batch.deliveredCount > 0 && batch.openedCount > 0
        ? `${batch.openedCount} (${Math.round((batch.openedCount / batch.deliveredCount) * 100)}%)`
        : '—';
    return {
      id: batch.id,
      createdAt: batch.createdAt.toISOString(),
      name: batch.name,
      channel: this.channelLabel(batch.channels),
      channels: this.readChannels(batch.channels),
      audience: batch.audience,
      recipients: `${this.audienceLabel(batch.audience as NotificationAudience)}${
        batch.recipientCount ? ` (${batch.recipientCount})` : ''
      }`,
      status: batch.status,
      delivered: batch.deliveredCount,
      failed: batch.failedCount,
      opened,
    };
  }

  private whenLabel(trigger: NotificationTrigger, offsetDays: number) {
    if (trigger === NotificationTrigger.DAYS_BEFORE_DUE) {
      return `${offsetDays} day${offsetDays === 1 ? '' : 's'} before due date`;
    }
    if (trigger === NotificationTrigger.ON_DUE_DATE) return 'On due date';
    if (trigger === NotificationTrigger.DAYS_AFTER_DUE) {
      return `${offsetDays} day${offsetDays === 1 ? '' : 's'} after due date`;
    }
    if (trigger === NotificationTrigger.EVERY_DAY_AFTER_DUE) return 'Every day after due date';
    return 'Manual send';
  }

  private audienceLabel(audience: NotificationAudience | string) {
    if (audience === NotificationAudience.ALL || audience === 'ALL') return 'All Assigned';
    if (audience === NotificationAudience.PENDING || audience === 'PENDING') return 'Pending employees';
    if (audience === NotificationAudience.OVERDUE || audience === 'OVERDUE') return 'Overdue employees';
    if (audience === NotificationAudience.MANAGER || audience === 'MANAGER') {
      return "Employee's Manager";
    }
    if (audience === NotificationAudience.COMPLIANCE || audience === 'COMPLIANCE') {
      return 'Compliance Officers';
    }
    return 'Pending & Overdue';
  }

  private channelLabel(channels: string[]) {
    const labels = this.readChannels(channels).map((channel) =>
      channel === 'inapp' ? 'In-App' : 'Email',
    );
    return labels.join(' + ') || 'In-App';
  }

  private render(
    subject: string,
    body: string,
    values: { name: string; policy: string; policyVersion: string; due: string },
  ) {
    const apply = (text: string) =>
      text
        .replaceAll('{{name}}', values.name)
        .replaceAll('{{policy}}', values.policy)
        .replaceAll('{{policyVersion}}', values.policyVersion)
        .replaceAll('{{due}}', values.due);
    return { subject: apply(subject), body: apply(body) };
  }

  private normalizeChannels(value: unknown) {
    const channels = this.readChannels(value);
    return channels.length > 0 ? channels : (['inapp'] as Channel[]);
  }

  private readChannels(value: unknown) {
    const source = Array.isArray(value) ? value : [];
    return [
      ...new Set(
        source
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim().toLowerCase())
          .map((item) => (item === 'in-app' || item === 'sms' ? 'inapp' : item))
          .filter((item): item is Channel => CHANNELS.includes(item as Channel)),
      ),
    ];
  }

  private readAudience(value: unknown) {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toUpperCase().replaceAll('-', '_');
    return (Object.values(NotificationAudience) as string[]).includes(normalized)
      ? (normalized as NotificationAudience)
      : undefined;
  }

  private readTrigger(value: unknown) {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toUpperCase();
    return (Object.values(NotificationTrigger) as string[]).includes(normalized)
      ? (normalized as NotificationTrigger)
      : undefined;
  }

  private readOffset(value: unknown) {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(365, Math.floor(parsed)));
  }

  private readRequired(value: unknown, field: string) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${field} is required.`);
    }
    return value.trim();
  }
}

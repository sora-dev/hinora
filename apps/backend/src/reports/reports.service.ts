import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AuditAction,
  PolicyAssignmentScope,
  PolicyAssignmentStatus,
  PolicyStatus,
  UserActivityStatus,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const REPORT_IDS = [
  'user-activity',
  'document-activity',
  'policy-review',
  'policy-exception',
  'policy-approval',
  'department-compliance',
  'training-completion',
  'access-permission',
  'policy-library-summary',
  'policy-assignment',
] as const;

export type ReportId = (typeof REPORT_IDS)[number];

type ReportRow = Record<string, string>;

type ReportColumn = {
  key: string;
  label: string;
  align?: 'left' | 'right';
};

type ReportLayout = {
  showCurrencyNote: boolean;
  extraFilters: Array<{ key: string; label: string }>;
  columns: ReportColumn[];
};

type UserScope = {
  id: string;
  name: string;
  department: string;
  location: string;
};

type AssignmentRecipient = UserScope & {
  policyId: string;
  policyTitle: string;
  dueAt: Date;
  assignmentStatus: PolicyAssignmentStatus;
};

const ROW_LIMIT = 2000;

const catalog: Record<
  ReportId,
  { name: string; description: string } & ReportLayout
> = {
  'user-activity': {
    name: 'User Activity Report',
    description: 'Summary of user logins, page visits, and active sessions.',
    showCurrencyNote: false,
    extraFilters: [{ key: 'activity', label: 'Activity type' }],
    columns: [
      { key: 'location', label: 'Location' },
      { key: 'user', label: 'User' },
      { key: 'department', label: 'Department' },
      { key: 'activity', label: 'Activity' },
      { key: 'device', label: 'Device' },
      { key: 'timestamp', label: 'Timestamp' },
      { key: 'status', label: 'Status' },
    ],
  },
  'document-activity': {
    name: 'Document Activity Report',
    description: 'Overview of document uploads, updates, and downloads.',
    showCurrencyNote: false,
    extraFilters: [{ key: 'action', label: 'Action' }],
    columns: [
      { key: 'location', label: 'Location' },
      { key: 'document', label: 'Document' },
      { key: 'category', label: 'Category' },
      { key: 'action', label: 'Action' },
      { key: 'user', label: 'User' },
      { key: 'department', label: 'Department' },
      { key: 'timestamp', label: 'Timestamp' },
    ],
  },
  'policy-review': {
    name: 'Policy Review Status Report',
    description: 'Status of policy reviews including overdue and upcoming reviews.',
    showCurrencyNote: false,
    extraFilters: [{ key: 'status', label: 'Status' }],
    columns: [
      { key: 'location', label: 'Location' },
      { key: 'policy', label: 'Policy' },
      { key: 'owner', label: 'Owner' },
      { key: 'department', label: 'Department' },
      { key: 'category', label: 'Category' },
      { key: 'reviewDate', label: 'Review date' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
    ],
  },
  'policy-exception': {
    name: 'Policy Exception Report',
    description: 'List of policy exceptions raised and their current status.',
    showCurrencyNote: false,
    extraFilters: [
      { key: 'status', label: 'Status' },
      { key: 'risk', label: 'Risk' },
    ],
    columns: [
      { key: 'location', label: 'Location' },
      { key: 'exception', label: 'Exception' },
      { key: 'policy', label: 'Policy' },
      { key: 'department', label: 'Department' },
      { key: 'status', label: 'Status' },
      { key: 'expires', label: 'Expires' },
      { key: 'risk', label: 'Risk' },
    ],
  },
  'policy-approval': {
    name: 'Policy Approval Report',
    description: 'Summary of policies submitted, approved, and rejected.',
    showCurrencyNote: false,
    extraFilters: [{ key: 'decision', label: 'Decision' }],
    columns: [
      { key: 'location', label: 'Location' },
      { key: 'policy', label: 'Policy' },
      { key: 'department', label: 'Department' },
      { key: 'submittedBy', label: 'Submitted by' },
      { key: 'approver', label: 'Approver' },
      { key: 'submitted', label: 'Submitted' },
      { key: 'decision', label: 'Decision' },
      { key: 'turnaround', label: 'Turnaround' },
    ],
  },
  'department-compliance': {
    name: 'Department Policy Compliance Report',
    description: 'Compliance of departments to required policies.',
    showCurrencyNote: false,
    extraFilters: [],
    columns: [
      { key: 'location', label: 'Location' },
      { key: 'department', label: 'Department' },
      { key: 'required', label: 'Required', align: 'right' },
      { key: 'completed', label: 'Completed', align: 'right' },
      { key: 'overdue', label: 'Overdue', align: 'right' },
      { key: 'compliance', label: 'Compliance', align: 'right' },
      { key: 'trend', label: 'Trend' },
    ],
  },
  'training-completion': {
    name: 'Training Completion Report',
    description: 'Training completion status of users by course and department.',
    showCurrencyNote: false,
    extraFilters: [
      { key: 'course', label: 'Course' },
      { key: 'progress', label: 'Completion status' },
    ],
    columns: [
      { key: 'location', label: 'Location' },
      { key: 'course', label: 'Course' },
      { key: 'department', label: 'Department' },
      { key: 'assigned', label: 'Assigned', align: 'right' },
      { key: 'completed', label: 'Completed', align: 'right' },
      { key: 'overdue', label: 'Overdue', align: 'right' },
      { key: 'rate', label: 'Rate', align: 'right' },
      { key: 'progress', label: 'Status' },
    ],
  },
  'access-permission': {
    name: 'Access & Permission Report',
    description: 'Summary of user roles, permissions, and access changes.',
    showCurrencyNote: false,
    extraFilters: [{ key: 'change', label: 'Change type' }],
    columns: [
      { key: 'location', label: 'Location' },
      { key: 'user', label: 'User' },
      { key: 'department', label: 'Department' },
      { key: 'change', label: 'Change' },
      { key: 'fromValue', label: 'From' },
      { key: 'toValue', label: 'To' },
      { key: 'changedBy', label: 'Changed by' },
      { key: 'date', label: 'Date' },
    ],
  },
  'policy-library-summary': {
    name: 'Policy Library Summary Report',
    description: 'Overall summary of policies by status and category.',
    showCurrencyNote: false,
    extraFilters: [
      { key: 'status', label: 'Status' },
      { key: 'category', label: 'Category' },
    ],
    columns: [
      { key: 'location', label: 'Location' },
      { key: 'category', label: 'Category' },
      { key: 'policy', label: 'Policy' },
      { key: 'department', label: 'Department' },
      { key: 'status', label: 'Status' },
      { key: 'owner', label: 'Owner' },
      { key: 'updated', label: 'Last update' },
      { key: 'version', label: 'Version' },
    ],
  },
  'policy-assignment': {
    name: 'Policy Assignment Report',
    description:
      'Assignments by policy, scope, due date, priority, and completion status.',
    showCurrencyNote: false,
    extraFilters: [
      { key: 'status', label: 'Status' },
      { key: 'scope', label: 'Scope' },
      { key: 'priority', label: 'Priority' },
    ],
    columns: [
      { key: 'policy', label: 'Policy' },
      { key: 'version', label: 'Version' },
      { key: 'scope', label: 'Scope' },
      { key: 'recipients', label: 'Recipients', align: 'right' },
      { key: 'startDate', label: 'Start date' },
      { key: 'dueDate', label: 'Due date' },
      { key: 'status', label: 'Status' },
      { key: 'priority', label: 'Priority' },
    ],
  },
};

const policyStatusLabel: Record<PolicyStatus, string> = {
  DRAFT: 'Draft',
  UNDER_REVIEW: 'In review',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived',
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async snapshot(id: string, query: Record<string, string | undefined>) {
    if (!this.isReportId(id)) {
      throw new BadRequestException('reportId is invalid.');
    }

    const range = this.parseRange(query.from, query.to);
    const rows = await this.buildRows(id, range);
    const definition = catalog[id];

    return {
      data: {
        id,
        name: definition.name,
        description: definition.description,
        showCurrencyNote: definition.showCurrencyNote,
        extraFilters: definition.extraFilters,
        columns: definition.columns,
        rows,
      },
    };
  }

  private async buildRows(id: ReportId, range: { from: Date; to: Date }) {
    switch (id) {
      case 'user-activity':
        return this.userActivity(range);
      case 'document-activity':
        return this.documentActivity(range);
      case 'policy-review':
        return this.policyReview(range);
      case 'policy-exception':
        return this.policyException(range);
      case 'policy-approval':
        return this.policyApproval(range);
      case 'department-compliance':
        return this.departmentCompliance(range);
      case 'training-completion':
        return this.trainingCompletion(range);
      case 'access-permission':
        return this.accessPermission(range);
      case 'policy-library-summary':
        return this.policyLibrarySummary(range);
      case 'policy-assignment':
        return this.policyAssignment(range);
    }
  }

  private async userActivity(range: { from: Date; to: Date }): Promise<ReportRow[]> {
    const events = await this.prisma.userActivity.findMany({
      where: { createdAt: { gte: range.from, lte: range.to } },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            department: true,
            departmentRef: { select: { name: true } },
            locationRef: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: ROW_LIMIT,
    });

    return events.map((event) => ({
      location: event.user.locationRef?.name || event.location || 'Unassigned',
      user: this.personName(event.user.firstName, event.user.lastName),
      department: event.user.departmentRef?.name || event.user.department || 'Unassigned',
      activity: event.title,
      device: this.deviceLabel(event.deviceName, event.browser, event.os),
      timestamp: this.formatDateTime(event.createdAt),
      status: event.status === UserActivityStatus.FAILED ? 'Failed' : 'Success',
    }));
  }

  private async documentActivity(range: { from: Date; to: Date }): Promise<ReportRow[]> {
    const [logs, views, users, policies] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: {
          createdAt: { gte: range.from, lte: range.to },
          resourceType: 'Policy',
          action: {
            in: [AuditAction.CREATE, AuditAction.UPDATE, AuditAction.DELETE, AuditAction.EXPORT],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: ROW_LIMIT,
      }),
      this.prisma.policyReadingProgress.findMany({
        where: { lastAccessedAt: { gte: range.from, lte: range.to } },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              department: true,
              departmentRef: { select: { name: true } },
              locationRef: { select: { name: true } },
            },
          },
          policy: {
            select: {
              title: true,
              department: true,
              category: { select: { name: true } },
            },
          },
        },
        orderBy: { lastAccessedAt: 'desc' },
        take: ROW_LIMIT,
      }),
      this.loadUserIndex(),
      this.loadPolicyIndex(),
    ]);

    const actionLabel: Record<string, string> = {
      CREATE: 'Uploaded',
      UPDATE: 'Updated',
      DELETE: 'Deleted',
      EXPORT: 'Downloaded',
    };

    const fromLogs = logs
      .filter((log) => this.isNamedResource(log.resource))
      .map((log) => {
      const actor = this.lookupUser(users, log.userId, log.userName);
      const policy = policies.get(log.resource.toLowerCase());
      return {
        sortAt: log.createdAt.getTime(),
        location: actor.location,
        document: log.resource || policy?.title || 'Policy',
        category: policy?.category || 'Uncategorized',
        action: actionLabel[log.action] ?? log.details ?? log.action,
        user: actor.name,
        department: actor.department,
        timestamp: this.formatDateTime(log.createdAt),
      };
      });

    const fromViews = views.map((view) => ({
      sortAt: view.lastAccessedAt.getTime(),
      location: view.user.locationRef?.name || 'Unassigned',
      document: view.policy.title,
      category: view.policy.category?.name || 'Uncategorized',
      action: 'Viewed',
      user: this.personName(view.user.firstName, view.user.lastName),
      department:
        view.user.departmentRef?.name || view.user.department || view.policy.department || 'Unassigned',
      timestamp: this.formatDateTime(view.lastAccessedAt),
    }));

    return [...fromLogs, ...fromViews]
      .sort((left, right) => right.sortAt - left.sortAt)
      .slice(0, ROW_LIMIT)
      .map(({ sortAt: _sortAt, ...row }) => row);
  }

  private async policyReview(range: { from: Date; to: Date }): Promise<ReportRow[]> {
    const policies = await this.prisma.policy.findMany({
      where: {
        OR: [
          { status: PolicyStatus.UNDER_REVIEW },
          { updatedAt: { gte: range.from, lte: range.to } },
        ],
      },
      include: { category: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: ROW_LIMIT,
    });

    const now = new Date();
    return policies.map((policy) => {
      const ageDays = this.dayDiff(policy.updatedAt, now);
      const status =
        policy.status === PolicyStatus.PUBLISHED
          ? 'Completed'
          : policy.status === PolicyStatus.UNDER_REVIEW && ageDays > 14
            ? 'Overdue'
            : policy.status === PolicyStatus.UNDER_REVIEW
              ? 'Upcoming'
              : policy.status === PolicyStatus.ARCHIVED
                ? 'Completed'
                : 'Upcoming';
      const priority =
        status === 'Overdue' ? 'High' : status === 'Upcoming' ? 'Medium' : 'Low';

      return {
        location: 'Organization-wide',
        policy: policy.title,
        owner: policy.createdBy || '—',
        department: policy.department || 'Unassigned',
        category: policy.category?.name || 'Uncategorized',
        reviewDate: this.formatDate(policy.updatedAt),
        status,
        priority,
      };
    });
  }

  private async policyException(range: { from: Date; to: Date }): Promise<ReportRow[]> {
    const assignments = await this.prisma.policyAssignment.findMany({
      where: {
        dueAt: { gte: range.from, lte: range.to },
        OR: [
          { status: PolicyAssignmentStatus.ACTIVE, dueAt: { lt: new Date() } },
          { status: PolicyAssignmentStatus.ARCHIVED },
        ],
      },
      include: {
        policy: { select: { title: true, department: true } },
      },
      orderBy: { dueAt: 'asc' },
      take: ROW_LIMIT,
    });

    const risk: Record<string, string> = {
      HIGH: 'High',
      MEDIUM: 'Medium',
      LOW: 'Low',
    };

    return assignments.map((assignment) => ({
      location:
        assignment.scopeKind === PolicyAssignmentScope.LOCATION
          ? assignment.scopeLabel
          : 'Organization-wide',
      exception:
        assignment.notes.trim() ||
        `Assignment past due for ${assignment.scopeLabel}`,
      policy: assignment.policy.title,
      department:
        assignment.scopeKind === PolicyAssignmentScope.DEPARTMENT
          ? assignment.scopeLabel
          : assignment.policy.department || 'Unassigned',
      status: assignment.status === PolicyAssignmentStatus.ARCHIVED ? 'Expired' : 'Open',
      expires: this.formatDate(assignment.dueAt),
      risk: risk[assignment.priority] ?? 'Medium',
    }));
  }

  private async policyApproval(range: { from: Date; to: Date }): Promise<ReportRow[]> {
    const policies = await this.prisma.policy.findMany({
      where: {
        OR: [
          { createdAt: { gte: range.from, lte: range.to } },
          { updatedAt: { gte: range.from, lte: range.to } },
        ],
      },
      include: { category: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: ROW_LIMIT,
    });

    const titles = policies.map((policy) => policy.title);
    const audits = titles.length
      ? await this.prisma.auditLog.findMany({
          where: {
            resourceType: 'Policy',
            resource: { in: titles },
            action: { in: [AuditAction.CREATE, AuditAction.UPDATE] },
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const latestActor = new Map<string, string>();
    for (const log of audits) {
      const key = log.resource.toLowerCase();
      if (!latestActor.has(key) && log.userName) {
        latestActor.set(key, log.userName);
      }
    }

    return policies.map((policy) => {
      const decision =
        policy.status === PolicyStatus.PUBLISHED
          ? 'Approved'
          : policy.status === PolicyStatus.ARCHIVED
            ? 'Rejected'
            : 'Pending';
      const turnaroundDays = this.dayDiff(policy.createdAt, policy.updatedAt);
      return {
        location: 'Organization-wide',
        policy: policy.title,
        department: policy.department || 'Unassigned',
        submittedBy: policy.createdBy || '—',
        approver:
          decision === 'Pending'
            ? '—'
            : latestActor.get(policy.title.toLowerCase()) || policy.createdBy || '—',
        submitted: this.formatDate(policy.createdAt),
        decision,
        turnaround: decision === 'Pending' ? '—' : `${Math.max(turnaroundDays, 0)} days`,
      };
    });
  }

  private async departmentCompliance(range: { from: Date; to: Date }): Promise<ReportRow[]> {
    const recipients = await this.assignmentRecipients(range);
    const completedKeys = await this.completedAssignmentKeys(recipients);

    const buckets = new Map<
      string,
      { location: string; department: string; required: number; completed: number; overdue: number }
    >();

    const now = new Date();
    for (const recipient of recipients) {
      const key = `${recipient.location}::${recipient.department}`;
      const bucket = buckets.get(key) ?? {
        location: recipient.location,
        department: recipient.department,
        required: 0,
        completed: 0,
        overdue: 0,
      };
      bucket.required += 1;
      if (completedKeys.has(this.assignmentKey(recipient))) {
        bucket.completed += 1;
      } else if (recipient.dueAt < now) {
        bucket.overdue += 1;
      }
      buckets.set(key, bucket);
    }

    return [...buckets.values()]
      .sort((left, right) => left.department.localeCompare(right.department))
      .map((bucket) => {
        const rate = bucket.required === 0 ? 0 : Math.round((bucket.completed / bucket.required) * 100);
        return {
          location: bucket.location,
          department: bucket.department,
          required: String(bucket.required),
          completed: String(bucket.completed),
          overdue: String(bucket.overdue),
          compliance: `${rate}%`,
          trend: bucket.overdue === 0 ? 'Up' : rate < 70 ? 'Down' : 'Steady',
        };
      });
  }

  private async trainingCompletion(range: { from: Date; to: Date }): Promise<ReportRow[]> {
    const recipients = await this.assignmentRecipients(range);
    const completedKeys = await this.completedAssignmentKeys(recipients);
    const now = new Date();

    const buckets = new Map<
      string,
      {
        location: string;
        course: string;
        department: string;
        assigned: number;
        completed: number;
        overdue: number;
      }
    >();

    for (const recipient of recipients) {
      const key = `${recipient.location}::${recipient.department}::${recipient.policyTitle}`;
      const bucket = buckets.get(key) ?? {
        location: recipient.location,
        course: recipient.policyTitle,
        department: recipient.department,
        assigned: 0,
        completed: 0,
        overdue: 0,
      };
      bucket.assigned += 1;
      if (completedKeys.has(this.assignmentKey(recipient))) {
        bucket.completed += 1;
      } else if (recipient.dueAt < now) {
        bucket.overdue += 1;
      }
      buckets.set(key, bucket);
    }

    return [...buckets.values()]
      .sort((left, right) => left.course.localeCompare(right.course))
      .map((bucket) => {
        const rate = bucket.assigned === 0 ? 0 : Math.round((bucket.completed / bucket.assigned) * 100);
        const progress =
          bucket.overdue === 0 && bucket.completed === bucket.assigned
            ? 'Completed'
            : bucket.completed === 0 && bucket.overdue > 0
              ? 'Overdue'
              : 'In progress';
        return {
          location: bucket.location,
          course: bucket.course,
          department: bucket.department,
          assigned: String(bucket.assigned),
          completed: String(bucket.completed),
          overdue: String(bucket.overdue),
          rate: `${rate}%`,
          progress,
        };
      });
  }

  private async accessPermission(range: { from: Date; to: Date }): Promise<ReportRow[]> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        createdAt: { gte: range.from, lte: range.to },
        resourceType: { in: ['User', 'Role'] },
        action: {
          in: [AuditAction.CREATE, AuditAction.UPDATE, AuditAction.DELETE],
        },
      },
      orderBy: { createdAt: 'desc' },
      take: ROW_LIMIT,
    });

    const users = await this.loadUserIndex();

    return logs.map((log) => {
      const subject = this.lookupUser(users, null, log.resource);
      const actor = this.lookupUser(users, log.userId, log.userName);
      const change = this.accessChangeLabel(log.action, log.details, log.resourceType);
      return {
        location: subject.location === 'Unassigned' ? actor.location : subject.location,
        user: subject.name === '—' ? log.resource || actor.name : subject.name,
        department: subject.department === 'Unassigned' ? actor.department : subject.department,
        change,
        fromValue: '—',
        toValue: log.details || '—',
        changedBy: actor.name,
        date: this.formatDate(log.createdAt),
      };
    });
  }

  private async policyLibrarySummary(range: { from: Date; to: Date }): Promise<ReportRow[]> {
    const policies = await this.prisma.policy.findMany({
      where: {
        OR: [
          { createdAt: { gte: range.from, lte: range.to } },
          { updatedAt: { gte: range.from, lte: range.to } },
        ],
      },
      include: { category: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: ROW_LIMIT,
    });

    return policies.map((policy) => ({
      location: 'Organization-wide',
      category: policy.category?.name || 'Uncategorized',
      policy: policy.title,
      department: policy.department || 'Unassigned',
      status: policyStatusLabel[policy.status],
      owner: policy.createdBy || '—',
      updated: this.formatDate(policy.updatedAt),
      version: `v${policy.version}.0`,
    }));
  }

  private async policyAssignment(range: { from: Date; to: Date }): Promise<ReportRow[]> {
    const [assignments, users] = await Promise.all([
      this.prisma.policyAssignment.findMany({
        where: {
          startAt: { lte: range.to },
          dueAt: { gte: range.from },
        },
        include: {
          policy: { select: { title: true, version: true } },
        },
        orderBy: [{ dueAt: 'asc' }, { startAt: 'desc' }],
        take: ROW_LIMIT,
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

    const statusLabel: Record<PolicyAssignmentStatus, string> = {
      ACTIVE: 'Active',
      COMPLETED: 'Completed',
      ARCHIVED: 'Archived',
    };
    const priorityLabel: Record<string, string> = {
      HIGH: 'High',
      MEDIUM: 'Medium',
      LOW: 'Low',
    };
    const scopeLabel: Record<PolicyAssignmentScope, string> = {
      ORGANIZATION: 'Organization-wide',
      DEPARTMENT: 'Department',
      LOCATION: 'Branch',
      ROLE: 'Role',
      USER: 'Specific Users',
    };

    return assignments.map((assignment) => {
      const recipients = users.filter((user) => {
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
            user.departmentRef?.name === assignment.scopeLabel
          );
        }
        if (assignment.scopeKind === PolicyAssignmentScope.LOCATION) {
          return (
            user.locationId === assignment.scopeTarget ||
            user.locationRef?.id === assignment.scopeTarget ||
            user.locationRef?.name === assignment.scopeLabel
          );
        }
        return (
          user.roleTitle === assignment.scopeTarget ||
          user.roleTitle === assignment.scopeLabel
        );
      }).length;

      return {
        policy: assignment.policy.title,
        version: `v${assignment.policy.version}.0`,
        scope:
          assignment.scopeKind === PolicyAssignmentScope.ORGANIZATION
            ? scopeLabel.ORGANIZATION
            : `${scopeLabel[assignment.scopeKind]} · ${assignment.scopeLabel}`,
        recipients: String(recipients),
        startDate: this.formatDate(assignment.startAt),
        dueDate: this.formatDate(assignment.dueAt),
        status: statusLabel[assignment.status],
        priority: priorityLabel[assignment.priority] ?? 'Medium',
      };
    });
  }

  private async assignmentRecipients(range: { from: Date; to: Date }): Promise<AssignmentRecipient[]> {
    const assignments = await this.prisma.policyAssignment.findMany({
      where: {
        status: {
          in: [PolicyAssignmentStatus.ACTIVE, PolicyAssignmentStatus.COMPLETED],
        },
        startAt: { lte: range.to },
        dueAt: { gte: range.from },
      },
      include: {
        policy: { select: { id: true, title: true } },
      },
    });

    const users = await this.prisma.user.findMany({
      where: { status: UserStatus.ACTIVE },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        department: true,
        departmentId: true,
        locationId: true,
        roleTitle: true,
        departmentRef: { select: { id: true, name: true } },
        locationRef: { select: { id: true, name: true } },
      },
    });

    const recipients: AssignmentRecipient[] = [];

    for (const assignment of assignments) {
      const matched = users.filter((user) => {
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
            user.departmentRef?.name === assignment.scopeLabel
          );
        }
        if (assignment.scopeKind === PolicyAssignmentScope.LOCATION) {
          return (
            user.locationId === assignment.scopeTarget ||
            user.locationRef?.id === assignment.scopeTarget ||
            user.locationRef?.name === assignment.scopeLabel
          );
        }
        return user.roleTitle === assignment.scopeTarget || user.roleTitle === assignment.scopeLabel;
      });

      for (const user of matched) {
        recipients.push({
          id: user.id,
          name: this.personName(user.firstName, user.lastName),
          department: user.departmentRef?.name || user.department || 'Unassigned',
          location: user.locationRef?.name || 'Unassigned',
          policyId: assignment.policy.id,
          policyTitle: assignment.policy.title,
          dueAt: assignment.dueAt,
          assignmentStatus: assignment.status,
        });
      }
    }

    return recipients;
  }

  private async completedAssignmentKeys(recipients: AssignmentRecipient[]) {
    const userIds = [...new Set(recipients.map((item) => item.id))];
    const policyIds = [...new Set(recipients.map((item) => item.policyId))];
    const completed = new Set<string>();

    if (userIds.length === 0 || policyIds.length === 0) {
      return completed;
    }

    const [progress, results] = await Promise.all([
      this.prisma.policyReadingProgress.findMany({
        where: {
          userId: { in: userIds },
          policyId: { in: policyIds },
          completedAt: { not: null },
        },
        select: { userId: true, policyId: true },
      }),
      this.prisma.testResult.findMany({
        where: {
          userId: { in: userIds },
          policyId: { in: policyIds },
          passed: true,
        },
        select: { userId: true, policyId: true },
      }),
    ]);

    for (const row of progress) {
      completed.add(`${row.userId}:${row.policyId}`);
    }
    for (const row of results) {
      completed.add(`${row.userId}:${row.policyId}`);
    }
    for (const recipient of recipients) {
      if (recipient.assignmentStatus === PolicyAssignmentStatus.COMPLETED) {
        completed.add(this.assignmentKey(recipient));
      }
    }

    return completed;
  }

  private assignmentKey(recipient: AssignmentRecipient) {
    return `${recipient.id}:${recipient.policyId}`;
  }

  private async loadUserIndex() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        department: true,
        departmentRef: { select: { name: true } },
        locationRef: { select: { name: true } },
      },
    });

    const index = new Map<string, UserScope>();
    for (const user of users) {
      const scope: UserScope = {
        id: user.id,
        name: this.personName(user.firstName, user.lastName),
        department: user.departmentRef?.name || user.department || 'Unassigned',
        location: user.locationRef?.name || 'Unassigned',
      };
      index.set(user.id.toLowerCase(), scope);
      index.set(user.email.toLowerCase(), scope);
      index.set(scope.name.toLowerCase(), scope);
    }
    return index;
  }

  private async loadPolicyIndex() {
    const policies = await this.prisma.policy.findMany({
      select: {
        title: true,
        department: true,
        category: { select: { name: true } },
      },
    });
    return new Map(
      policies.map((policy) => [
        policy.title.toLowerCase(),
        {
          title: policy.title,
          department: policy.department || 'Unassigned',
          category: policy.category?.name || 'Uncategorized',
        },
      ]),
    );
  }

  private lookupUser(index: Map<string, UserScope>, userId: string | null, name: string | null) {
    const byId = userId ? index.get(userId.toLowerCase()) : undefined;
    if (byId) return byId;
    const byName = name ? index.get(name.toLowerCase()) : undefined;
    if (byName) return byName;
    return {
      id: '',
      name: name || '—',
      department: 'Unassigned',
      location: 'Unassigned',
    };
  }

  private accessChangeLabel(action: AuditAction, details: string, resourceType: string) {
    if (details.trim()) {
      return details;
    }
    if (action === AuditAction.CREATE && resourceType === 'User') return 'Account created';
    if (action === AuditAction.CREATE && resourceType === 'Role') return 'Role created';
    if (action === AuditAction.DELETE && resourceType === 'User') return 'Access revoked';
    if (action === AuditAction.DELETE && resourceType === 'Role') return 'Role deleted';
    if (resourceType === 'Role') return 'Permission granted';
    if (action === AuditAction.LOGIN) return 'Logged In';
    if (action === AuditAction.LOGOUT) return 'Logged Out';
    return 'Role updated';
  }

  private parseRange(fromValue?: string, toValue?: string) {
    const from = this.parseDate(fromValue, false) ?? this.startOfDay(new Date());
    const to = this.parseDate(toValue, true) ?? this.endOfDay(new Date());
    if (to < from) {
      throw new BadRequestException('dateTo must be on or after dateFrom.');
    }
    return { from, to };
  }

  private parseDate(value: string | undefined, endOfDay: boolean) {
    if (!value?.trim()) return null;
    const date = new Date(value.includes('T') ? value : `${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      if (endOfDay) return this.endOfDay(date);
      return this.startOfDay(date);
    }
    return date;
  }

  private startOfDay(date: Date) {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  private endOfDay(date: Date) {
    const next = new Date(date);
    next.setHours(23, 59, 59, 999);
    return next;
  }

  private formatDate(date: Date) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private formatDateTime(date: Date) {
    const time = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `${this.formatDate(date)} ${time}`;
  }

  private dayDiff(from: Date, to: Date) {
    return Math.round((to.getTime() - from.getTime()) / 86_400_000);
  }

  private personName(firstName: string, lastName: string) {
    return `${firstName} ${lastName}`.trim() || 'Unknown user';
  }

  private deviceLabel(deviceName: string, browser: string, os: string) {
    if (deviceName.trim()) return deviceName;
    const parts = [browser, os].map((part) => part.trim()).filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : 'Unknown device';
  }

  private isNamedResource(value: string) {
    if (!value.trim() || value.startsWith('/')) {
      return false;
    }
    return !/^[0-9a-f-]{36}$/i.test(value);
  }

  private isReportId(value: string): value is ReportId {
    return REPORT_IDS.includes(value as ReportId);
  }
}

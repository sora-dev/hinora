import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentStatus,
  NotificationCategory,
  NotificationPriority,
  NotificationTrigger,
  PolicyAssignmentPriority,
  PolicyAssignmentScope,
  PolicyAssignmentStatus,
  Prisma,
  UserStatus,
} from '@prisma/client';
import { InboxEventsService } from '../notifications/inbox-events.service';
import { PolicyAssignmentsService } from '../policy-assignments/policy-assignments.service';
import { PrismaService } from '../prisma/prisma.service';

type TrackStatus = 'ON_TRACK' | 'AT_RISK' | 'OVERDUE' | 'NOT_STARTED';

type AssignmentRecord = {
  id: string;
  policyId: string;
  scopeKind: PolicyAssignmentScope;
  scopeTarget: string;
  scopeLabel: string;
  userIds: string[];
  startAt: Date;
  dueAt: Date;
  status: PolicyAssignmentStatus;
};

type UserRecord = {
  id: string;
  department: string;
  departmentId: string | null;
  locationId: string | null;
  roleTitle: string;
  departmentRef: { id: string; name: string } | null;
  locationRef: { id: string; name: string } | null;
};

@Injectable()
export class ComplianceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policyAssignments: PolicyAssignmentsService,
    private readonly inboxEvents: InboxEventsService,
  ) {}

  async getMine(userId: string) {
    const actorId = userId.trim();
    if (!actorId) {
      throw new BadRequestException('X-Hinora-User-Id is required.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true, status: true, firstName: true, lastName: true, preferredName: true },
    });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new NotFoundException(`User ${actorId} was not found.`);
    }

    const assignments = await this.policyAssignments.assignmentsForUser(actorId);
    const policyIds = [...new Set(assignments.map((row) => row.policyId))];
    const now = new Date();

    const scopedPolicyIds = policyIds.length > 0 ? policyIds : ['__none__'];
    const [progressRows, assessments, results, certificates] = await Promise.all([
      this.prisma.policyReadingProgress.findMany({
        where: { userId: actorId, policyId: { in: scopedPolicyIds } },
      }),
      this.prisma.assessment.findMany({
        where: {
          policyId: { in: scopedPolicyIds },
          status: { not: AssessmentStatus.ARCHIVED },
          questions: { some: {} },
        },
        include: {
          _count: { select: { questions: true } },
          policy: { select: { title: true, version: true } },
        },
      }),
      this.prisma.testResult.findMany({
        where: { userId: actorId, policyId: { in: scopedPolicyIds } },
        orderBy: { submittedAt: 'desc' },
      }),
      this.prisma.certificate.findMany({
        where: { userId: actorId },
        orderBy: { issuedAt: 'desc' },
        include: {
          policy: { select: { title: true, version: true } },
        },
      }),
    ]);

    const progressByPolicy = new Map(progressRows.map((row) => [row.policyId, row]));
    const assessmentByPolicy = new Map(assessments.map((row) => [row.policyId, row]));
    const latestResultByPolicy = new Map<string, (typeof results)[number]>();
    for (const result of results) {
      if (!latestResultByPolicy.has(result.policyId)) {
        latestResultByPolicy.set(result.policyId, result);
      }
    }

    const dueByPolicy = new Map<
      string,
      {
        dueAt: Date;
        startAt: Date;
        priority: PolicyAssignmentPriority;
        title: string;
        version: number;
        description: string | null;
        department: string;
        documentType: string;
      }
    >();
    for (const assignment of assignments) {
      const existing = dueByPolicy.get(assignment.policyId);
      if (!existing || assignment.dueAt < existing.dueAt) {
        dueByPolicy.set(assignment.policyId, {
          dueAt: assignment.dueAt,
          startAt: assignment.startAt,
          priority: assignment.priority,
          title: assignment.policy.title,
          version: assignment.policy.version,
          description: assignment.policy.description ?? assignment.policy.summaryShort,
          department: assignment.policy.department,
          documentType: assignment.policy.type,
        });
      } else if (assignment.startAt < existing.startAt) {
        existing.startAt = assignment.startAt;
      }
    }

    const tasks: Array<
      ReturnType<ComplianceService['toMyTask']> & {
        policyTitle?: string;
        policyVersion?: string;
        description?: string | null;
        instructions?: string | null;
        maximumAttempts?: number;
        timeLimitMinutes?: number;
        assignedAt?: string;
        department?: string;
        documentType?: string;
        requirePassToAcknowledge?: boolean;
        hasAssessment?: boolean;
        assessmentPassed?: boolean;
        readingComplete?: boolean;
        attempts?: Array<{
          id: string;
          attempt: number;
          submittedAt: string;
          score: number;
          correct: number;
          totalQuestions: number;
          passed: boolean;
        }>;
      }
    > = [];

    for (const [policyId, meta] of dueByPolicy) {
      const progress = progressByPolicy.get(policyId);
      const assessment = assessmentByPolicy.get(policyId);
      const result = latestResultByPolicy.get(policyId);
      const acknowledged = Boolean(progress?.completedAt);
      const score =
        result && result.totalQuestions > 0
          ? Math.round((result.score / result.totalQuestions) * 100)
          : null;
      const passed = Boolean(result?.passed);
      const readingPct = Math.max(0, Math.min(100, progress?.progressPercent ?? 0));

      tasks.push({
        ...this.toMyTask({
          id: `ack-${policyId}`,
          policyId,
          title: `${meta.title} Acknowledgement`,
          type: 'acknowledgement',
          priority: meta.priority,
          dueAt: meta.dueAt,
          now,
          done: acknowledged,
          started: readingPct > 0 || Boolean(progress),
          progressPct: acknowledged ? 100 : readingPct,
          completedAt: progress?.completedAt ?? null,
          href: `/employee/policy-library/${policyId}`,
          actionLabel: acknowledged ? 'View Policy' : 'Acknowledge',
        }),
        policyTitle: meta.title,
        policyVersion: `v${meta.version}`,
        description: meta.description,
        assignedAt: meta.startAt.toISOString(),
        department: meta.department,
        documentType: meta.documentType,
        requirePassToAcknowledge: Boolean(assessment?.requirePassToAcknowledge),
        hasAssessment: Boolean(assessment),
        assessmentPassed: passed,
        readingComplete: acknowledged || readingPct >= 100,
      });

      if (assessment) {
        const policyAttempts = results
          .filter((row) => row.policyId === policyId)
          .slice()
          .reverse()
          .map((row, index) => ({
            id: row.id,
            attempt: index + 1,
            submittedAt: row.submittedAt.toISOString(),
            score:
              row.totalQuestions > 0
                ? Math.round((row.score / row.totalQuestions) * 100)
                : 0,
            correct: row.score,
            totalQuestions: row.totalQuestions,
            passed: row.passed,
          }));

        tasks.push({
          ...this.toMyTask({
            id: `asmt-${policyId}`,
            policyId,
            title: assessment.title || `${meta.title} Assessment`,
            type: 'assessment',
            priority: meta.priority,
            dueAt: meta.dueAt,
            now,
            done: passed,
            started: Boolean(result),
            progressPct: passed ? 100 : result ? score ?? 0 : 0,
            completedAt: passed ? result?.submittedAt ?? null : null,
            href: `/employee/assessments/${policyId}`,
            actionLabel: passed
              ? 'View Results'
              : result
                ? 'Continue'
                : 'Start Assessment',
            questionCount: assessment._count.questions,
            passingScore: assessment.passingScore,
            score,
          }),
          policyTitle: meta.title,
          policyVersion: `v${meta.version}`,
          description: assessment.description,
          instructions: assessment.instructions,
          maximumAttempts: assessment.maximumAttempts,
          timeLimitMinutes: assessment.timeLimitMinutes,
          attempts: policyAttempts,
        });
      }
    }

    tasks.sort((left, right) => {
      const rank = { OVERDUE: 0, DUE_SOON: 1, IN_PROGRESS: 2, OPEN: 3, COMPLETED: 4 };
      if (rank[left.status] !== rank[right.status]) {
        return rank[left.status] - rank[right.status];
      }
      return new Date(left.dueAt).getTime() - new Date(right.dueAt).getTime();
    });

    const completed = tasks.filter((task) => task.status === 'COMPLETED').length;
    const overdue = tasks.filter((task) => task.status === 'OVERDUE').length;
    const inProgress = tasks.filter(
      (task) =>
        task.status === 'IN_PROGRESS' ||
        task.status === 'DUE_SOON' ||
        task.status === 'OPEN',
    ).length;
    const compliantPct =
      tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      data: {
        tasks,
        summary: {
          total: tasks.length,
          policyCount: dueByPolicy.size,
          completed,
          inProgress,
          overdue,
          dueSoon: tasks.filter((task) => task.status === 'DUE_SOON').length,
          completedThisMonth: tasks.filter(
            (task) =>
              task.status === 'COMPLETED' &&
              task.completedAt &&
              new Date(task.completedAt) >= monthStart,
          ).length,
          compliantPct,
        },
        upcoming: tasks
          .filter((task) => task.status !== 'COMPLETED')
          .slice(0, 3)
          .map((task) => ({
            id: task.id,
            title: task.title,
            dueAt: task.dueAt,
            dueLabel: task.dueLabel,
            status: task.status,
          })),
        certificates: certificates.map((row) => {
          const assessment = assessmentByPolicy.get(row.policyId);
          const result = latestResultByPolicy.get(row.policyId);
          const score =
            result && result.totalQuestions > 0
              ? Math.round((result.score / result.totalQuestions) * 100)
              : null;
          const recipientName =
            `${user.firstName} ${user.lastName}`.trim() || user.preferredName?.trim() || "Employee";
          return {
            id: row.id,
            policyId: row.policyId,
            title: assessment?.title || `${row.policy.title} Certificate`,
            policyTitle: row.policy.title,
            policyVersion: `v${row.policy.version}`,
            type: 'Assessment' as const,
            certificateNumber: row.certificateNumber,
            issuedAt: row.issuedAt.toISOString(),
            expiresAt: null,
            status: 'ACTIVE' as const,
            score,
            recipientName: recipientName || 'Employee',
            description: `This certificate is awarded upon successful completion of the ${
              assessment?.title || `${row.policy.title} Assessment`
            }.`,
          };
        }),
      },
    };
  }

  async acknowledgeMine(userId: string, policyId: string) {
    const actorId = userId.trim();
    const targetPolicyId = policyId.trim();
    if (!actorId) {
      throw new BadRequestException('X-Hinora-User-Id is required.');
    }
    if (!targetPolicyId) {
      throw new BadRequestException('policyId is required.');
    }

    const assignedIds = await this.policyAssignments.assignedPolicyIdsForUser(actorId);
    if (!assignedIds.includes(targetPolicyId)) {
      throw new ForbiddenException('This policy is not assigned to you.');
    }

    const [progress, assessment, latestResult] = await Promise.all([
      this.prisma.policyReadingProgress.findUnique({
        where: { userId_policyId: { userId: actorId, policyId: targetPolicyId } },
      }),
      this.prisma.assessment.findUnique({
        where: { policyId: targetPolicyId },
        include: { _count: { select: { questions: true } } },
      }),
      this.prisma.testResult.findFirst({
        where: { userId: actorId, policyId: targetPolicyId, passed: true },
        orderBy: { submittedAt: 'desc' },
      }),
    ]);

    if (progress?.completedAt) {
      return { data: { policyId: targetPolicyId, completedAt: progress.completedAt.toISOString() } };
    }

    const readingComplete = (progress?.progressPercent ?? 0) >= 100;
    if (!readingComplete) {
      throw new BadRequestException('Read the policy in full before acknowledging it.');
    }

    const assessmentRequired =
      Boolean(assessment) &&
      assessment?.status !== AssessmentStatus.ARCHIVED &&
      (assessment?._count.questions ?? 0) > 0 &&
      Boolean(assessment?.requirePassToAcknowledge);

    if (assessmentRequired && !latestResult) {
      throw new BadRequestException('Pass the policy assessment before acknowledging it.');
    }

    const now = new Date();
    const row = await this.prisma.policyReadingProgress.update({
      where: { userId_policyId: { userId: actorId, policyId: targetPolicyId } },
      data: { completedAt: now },
    });

    return { data: { policyId: targetPolicyId, completedAt: row.completedAt?.toISOString() ?? now.toISOString() } };
  }

  async listSummaries() {
    const policies = await this.prisma.policy.findMany({
      select: { id: true },
    });
    const summaries = await this.buildSummaries(policies.map((policy) => policy.id));
    return { data: summaries };
  }

  async getOverview(policyId: string) {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      select: {
        id: true,
        title: true,
        version: true,
        createdAt: true,
        createdBy: true,
      },
    });

    if (!policy) {
      throw new NotFoundException(`Policy ${policyId} was not found.`);
    }

    const [summary] = await this.buildSummaries([policyId]);
    const stats = summary ?? this.emptySummary(policyId);
    const [
      assessment,
      certificatesIssued,
      certificates,
      results,
      progress,
      assignments,
      auditLogs,
      notificationBatches,
      notificationRules,
    ] = await Promise.all([
        this.prisma.assessment.findUnique({
          where: { policyId },
          select: {
            passingScore: true,
            issueCertificateOnPass: true,
            showScoreImmediately: true,
          },
        }),
        this.prisma.certificate.count({
          where: { policyId },
        }),
        this.prisma.certificate.findMany({
          where: { policyId },
          orderBy: { issuedAt: 'desc' },
          take: 1,
          select: { issuedAt: true },
        }),
        this.prisma.testResult.findMany({
          where: { policyId },
          orderBy: { submittedAt: 'desc' },
          select: {
            userId: true,
            score: true,
            totalQuestions: true,
            passed: true,
            submittedAt: true,
          },
        }),
        this.prisma.policyReadingProgress.findMany({
          where: { policyId, completedAt: { not: null } },
          orderBy: { completedAt: 'desc' },
          take: 6,
          include: {
            user: { select: { firstName: true, lastName: true } },
          },
        }),
        this.prisma.policyAssignment.findMany({
          where: { policyId },
          orderBy: { createdAt: 'desc' },
          take: 4,
          select: {
            createdAt: true,
            scopeLabel: true,
            status: true,
          },
        }),
        this.prisma.auditLog.findMany({
          where: {
            OR: [
              { resource: policy.title },
              { resource: policyId },
              { details: { contains: policy.title, mode: 'insensitive' } },
            ],
          },
          orderBy: { createdAt: 'desc' },
          take: 8,
        }),
        this.prisma.notificationBatch.findMany({
          where: { policyId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true, deliveredCount: true },
        }),
        this.prisma.notificationRule.findMany({
          where: { policyId, enabled: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            trigger: true,
            offsetDays: true,
            lastFiredAt: true,
          },
        }),
      ]);

    const latestScoreByUser = new Map<string, number>();
    for (const result of results) {
      if (latestScoreByUser.has(result.userId) || result.totalQuestions <= 0) {
        continue;
      }
      latestScoreByUser.set(
        result.userId,
        Math.round((result.score / result.totalQuestions) * 100),
      );
    }
    const scores = [...latestScoreByUser.values()];
    const averageScore =
      scores.length === 0
        ? 0
        : Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);

    const reminderLogs = notificationBatches;
    const notificationsSent = reminderLogs.reduce(
      (sum, batch) => sum + batch.deliveredCount,
      0,
    );
    const lastNotificationAt = reminderLogs[0]?.createdAt ?? null;
    const nextNotificationAt = this.nextScheduledNotificationAt(
      stats.dueAt ? new Date(stats.dueAt) : null,
      notificationRules,
    );

    const activity = this.buildActivity({
      policyTitle: policy.title,
      version: policy.version,
      publishedAt: policy.createdAt,
      createdBy: policy.createdBy,
      progress,
      results,
      assignments,
      auditLogs,
    }).slice(0, 4);

    return {
      data: {
        ...stats,
        averageScore,
        passingScore: assessment?.passingScore ?? 80,
        hasAssessment: Boolean(assessment),
        certificatesIssued,
        lastCertificateAt: certificates[0]?.issuedAt.toISOString() ?? null,
        autoIssueCertificates: assessment?.issueCertificateOnPass ?? false,
        includeScoreInCertificate: assessment?.showScoreImmediately ?? false,
        notificationsSent,
        lastNotificationAt: lastNotificationAt?.toISOString() ?? null,
        nextNotificationAt: nextNotificationAt?.toISOString() ?? null,
        activity,
      },
    };
  }

  async getActivity(policyId: string) {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      select: {
        id: true,
        title: true,
        version: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
      },
    });

    if (!policy) {
      throw new NotFoundException(`Policy ${policyId} was not found.`);
    }

    const userName = {
      select: { firstName: true, lastName: true, roleTitle: true },
    };

    const [
      assignments,
      progress,
      results,
      certificates,
      batches,
      auditLogs,
      assignmentCount,
      attemptCount,
      certificateCount,
      notificationCount,
    ] = await Promise.all([
      this.prisma.policyAssignment.findMany({
        where: { policyId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { createdBy: userName },
      }),
      this.prisma.policyReadingProgress.findMany({
        where: { policyId, completedAt: { not: null } },
        orderBy: { completedAt: 'desc' },
        take: 25,
        include: { user: userName },
      }),
      this.prisma.testResult.findMany({
        where: { policyId },
        orderBy: { submittedAt: 'desc' },
        take: 25,
        include: { user: userName },
      }),
      this.prisma.certificate.findMany({
        where: { policyId },
        orderBy: { issuedAt: 'desc' },
        take: 20,
        include: { user: userName },
      }),
      this.prisma.notificationBatch.findMany({
        where: { policyId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.auditLog.findMany({
        where: {
          OR: [
            { resource: policy.title },
            { resource: policyId },
            { details: { contains: policy.title, mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          user: { select: { roleTitle: true } },
        },
      }),
      this.prisma.policyAssignment.count({ where: { policyId } }),
      this.prisma.testResult.count({ where: { policyId } }),
      this.prisma.certificate.count({ where: { policyId } }),
      this.prisma.notificationBatch.count({ where: { policyId } }),
    ]);

    const events: Array<{
      id: string;
      kind: string;
      title: string;
      description: string;
      actor: string;
      actorRole: string;
      at: Date;
      ipAddress?: string;
      userAgent?: string;
      changes: string[];
    }> = [];

    events.push({
      id: `published-${policy.id}`,
      kind: 'published',
      title: 'Policy Published',
      description: `${policy.title} was published and is now active.`,
      actor: policy.createdBy || 'System',
      actorRole: 'Administrator',
      at: policy.createdAt,
      changes: [`Policy version: ${policy.version}.0`, `Status: ${policy.status}`],
    });

    if (policy.updatedAt.getTime() - policy.createdAt.getTime() > 60_000) {
      events.push({
        id: `updated-${policy.id}-${policy.updatedAt.toISOString()}`,
        kind: 'update',
        title: 'Policy Updated',
        description: `Version ${policy.version}.0 was updated.`,
        actor: policy.createdBy || 'System',
        actorRole: 'Administrator',
        at: policy.updatedAt,
        changes: [`Policy version: ${policy.version}.0`],
      });
    }

    for (const assignment of assignments) {
      const actor = assignment.createdBy
        ? this.displayName(assignment.createdBy)
        : 'System';
      const audience =
        assignment.userIds.length > 0
          ? `${assignment.userIds.length} ${assignment.userIds.length === 1 ? 'employee' : 'employees'}`
          : assignment.scopeLabel || 'assigned employees';
      events.push({
        id: `assignment-${assignment.id}`,
        kind: 'assignment',
        title: 'Policy Assigned',
        description: `Assigned to ${audience}.`,
        actor,
        actorRole: assignment.createdBy?.roleTitle || 'Administrator',
        at: assignment.createdAt,
        changes: [
          `Scope: ${assignment.scopeLabel || assignment.scopeKind}`,
          `Due date: ${this.formatDate(assignment.dueAt)}`,
          `Status: ${assignment.status}`,
        ],
      });
    }

    for (const row of progress) {
      if (!row.completedAt) continue;
      const name = this.displayName(row.user);
      events.push({
        id: `reading-${row.id}`,
        kind: 'reading',
        title: 'Reading Completed',
        description: `${name} finished reading this policy.`,
        actor: name,
        actorRole: row.user.roleTitle || 'Employee',
        at: row.completedAt,
        changes: [`Progress: ${row.progressPercent}%`],
      });
    }

    for (const result of results) {
      const name = this.displayName(result.user);
      const score =
        result.totalQuestions > 0
          ? Math.round((result.score / result.totalQuestions) * 100)
          : 0;
      events.push({
        id: `assessment-${result.id}`,
        kind: result.passed ? 'completed' : 'assessment',
        title: result.passed ? 'Assessment Passed' : 'Assessment Attempted',
        description: `${name} ${result.passed ? 'passed' : 'attempted'} the assessment with ${score}%.`,
        actor: name,
        actorRole: result.user.roleTitle || 'Employee',
        at: result.submittedAt,
        changes: [
          `Score: ${score}%`,
          `Result: ${result.passed ? 'Passed' : 'Failed'}`,
          `Correct answers: ${result.score}/${result.totalQuestions}`,
        ],
      });
    }

    for (const certificate of certificates) {
      const name = this.displayName(certificate.user);
      events.push({
        id: `certificate-${certificate.id}`,
        kind: 'certificate',
        title: 'Certificate Issued',
        description: `Certificate ${certificate.certificateNumber} was issued to ${name}.`,
        actor: 'System',
        actorRole: 'Auto Update',
        at: certificate.issuedAt,
        changes: [`Certificate: ${certificate.certificateNumber}`, `Recipient: ${name}`],
      });
    }

    for (const batch of batches) {
      const isEscalation = /manager|escalat/i.test(`${batch.audience} ${batch.name}`);
      events.push({
        id: `notification-${batch.id}`,
        kind: isEscalation ? 'escalation' : 'notification',
        title: isEscalation ? 'Escalation Sent' : 'Notification Sent',
        description: `${batch.name} reached ${batch.deliveredCount} of ${batch.recipientCount} recipients.`,
        actor: 'System',
        actorRole: 'Auto Notification',
        at: batch.createdAt,
        changes: [
          `Audience: ${batch.audience}`,
          `Delivered: ${batch.deliveredCount}`,
          `Failed: ${batch.failedCount}`,
        ],
      });
    }

    for (const log of auditLogs) {
      if (/assigned|assignment created/i.test(log.details)) continue;
      events.push({
        id: `audit-${log.id}`,
        kind: this.auditActivityKind(log.action, log.details),
        title: this.auditActivityTitle(log.action, log.details),
        description: log.details || `${log.action} on ${log.resource || policy.title}`,
        actor: log.userName || 'System',
        actorRole: log.user?.roleTitle || 'Administrator',
        at: log.createdAt,
        ipAddress: log.ipAddress || undefined,
        changes: log.details ? [log.details] : [],
      });
    }

    const seen = new Set<string>();
    const items = events
      .sort((left, right) => right.at.getTime() - left.at.getTime())
      .filter((event) => {
        const key = `${event.kind}:${event.title}:${event.description}:${event.at.toISOString()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 80)
      .map((event) => ({
        id: event.id,
        kind: event.kind,
        title: event.title,
        description: event.description,
        actor: event.actor,
        actorRole: event.actorRole,
        timestamp: event.at.toISOString(),
        timestampLabel: this.formatEventTime(event.at),
        ipAddress: event.ipAddress ?? null,
        userAgent: event.userAgent ?? null,
        changes: event.changes,
      }));

    return {
      data: {
        policyId: policy.id,
        policyTitle: policy.title,
        policyVersion: `v${policy.version}.0`,
        events: items,
        related: {
          assignments: assignmentCount,
          assessmentAttempts: attemptCount,
          certificatesIssued: certificateCount,
          notificationsSent: notificationCount,
        },
      },
    };
  }

  async getEmployees(policyId: string) {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      select: { id: true },
    });

    if (!policy) {
      throw new NotFoundException(`Policy ${policyId} was not found.`);
    }

    const now = new Date();
    const [assignments, users] = await Promise.all([
      this.prisma.policyAssignment.findMany({
        where: {
          policyId,
          startAt: { lte: now },
          status: {
            in: [PolicyAssignmentStatus.ACTIVE, PolicyAssignmentStatus.COMPLETED],
          },
        },
      }),
      this.prisma.user.findMany({
        where: { status: UserStatus.ACTIVE },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          department: true,
          departmentId: true,
          locationId: true,
          roleTitle: true,
          departmentRef: { select: { id: true, name: true } },
          locationRef: { select: { id: true, name: true } },
        },
      }),
    ]);

    const recipients = new Map<
      string,
      {
        user: (typeof users)[number];
        dueDates: Date[];
        assignmentCompleted: boolean;
      }
    >();

    for (const assignment of assignments) {
      for (const user of users) {
        if (!this.assignmentAppliesToUser(assignment, user)) {
          continue;
        }
        const existing = recipients.get(user.id);
        if (!existing) {
          recipients.set(user.id, {
            user,
            dueDates: [assignment.dueAt],
            assignmentCompleted: assignment.status === PolicyAssignmentStatus.COMPLETED,
          });
          continue;
        }
        existing.dueDates.push(assignment.dueAt);
        if (assignment.status === PolicyAssignmentStatus.COMPLETED) {
          existing.assignmentCompleted = true;
        }
      }
    }

    const userIds = [...recipients.keys()];
    const [progressRows, resultRows] =
      userIds.length === 0
        ? [[], []]
        : await Promise.all([
            this.prisma.policyReadingProgress.findMany({
              where: { policyId, userId: { in: userIds } },
            }),
            this.prisma.testResult.findMany({
              where: { policyId, userId: { in: userIds } },
              orderBy: { submittedAt: 'desc' },
            }),
          ]);

    const progressByUser = new Map(progressRows.map((row) => [row.userId, row]));
    const latestResultByUser = new Map<string, (typeof resultRows)[number]>();
    for (const result of resultRows) {
      if (!latestResultByUser.has(result.userId)) {
        latestResultByUser.set(result.userId, result);
      }
    }

    const data = [...recipients.values()]
      .map(({ user, dueDates, assignmentCompleted }) => {
        const progress = progressByUser.get(user.id);
        const result = latestResultByUser.get(user.id);
        const done =
          assignmentCompleted ||
          Boolean(progress?.completedAt) ||
          Boolean(result?.passed);
        const dueAt =
          dueDates.slice().sort((left, right) => left.getTime() - right.getTime())[0] ??
          null;
        const overdue = Boolean(!done && dueAt && dueAt < now);
        const started = Boolean(progress) || Boolean(result);
        const status = done
          ? 'COMPLETED'
          : overdue
            ? 'OVERDUE'
            : started
              ? 'PENDING'
              : 'NOT_STARTED';
        const score =
          result && result.totalQuestions > 0
            ? Math.round((result.score / result.totalQuestions) * 100)
            : null;
        const lastActivityAt = [
          progress?.completedAt,
          progress?.lastAccessedAt,
          result?.submittedAt,
        ]
          .filter((value): value is Date => Boolean(value))
          .sort((left, right) => right.getTime() - left.getTime())[0];
        const completedAt = progress?.completedAt ?? (result?.passed ? result.submittedAt : null);
        const first = user.firstName.trim();
        const last = user.lastName.trim();
        const name = `${first} ${last}`.trim() || user.email;
        const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || name.slice(0, 2).toUpperCase();

        return {
          id: user.id,
          name,
          email: user.email,
          initials,
          department: user.departmentRef?.name || user.department || 'Unassigned',
          location: user.locationRef?.name || 'Unassigned',
          status,
          completionPct: done
            ? 100
            : Math.max(0, Math.min(100, progress?.progressPercent ?? 0)),
          assessmentScore: score,
          dueAt: dueAt?.toISOString() ?? null,
          completedAt: completedAt?.toISOString() ?? null,
          lastActivityAt: lastActivityAt?.toISOString() ?? null,
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name));

    return { data };
  }

  async getCertificates(policyId: string) {
    const policy = await this.assertPolicyRecord(policyId);
    const { data: employees } = await this.getEmployees(policyId);
    const [certificates, results] = await Promise.all([
      this.prisma.certificate.findMany({
        where: { policyId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              department: true,
              departmentRef: { select: { name: true } },
              locationRef: { select: { name: true } },
            },
          },
        },
        orderBy: { issuedAt: 'desc' },
      }),
      this.prisma.testResult.findMany({
        where: { policyId },
        orderBy: { submittedAt: 'desc' },
        select: {
          userId: true,
          passed: true,
          score: true,
          totalQuestions: true,
          submittedAt: true,
        },
      }),
    ]);

    const certByUser = new Map(certificates.map((row) => [row.userId, row]));
    const latestResultByUser = new Map<string, (typeof results)[number]>();
    for (const result of results) {
      if (!latestResultByUser.has(result.userId)) {
        latestResultByUser.set(result.userId, result);
      }
    }

    const rows: Array<ReturnType<ComplianceService['toCertificateRow']>> = [];
    const seen = new Set<string>();

    for (const employee of employees) {
      const cert = certByUser.get(employee.id);
      const result = latestResultByUser.get(employee.id);
      if (!cert && !result?.passed) continue;
      seen.add(employee.id);
      rows.push(
        this.toCertificateRow({
          userId: employee.id,
          name: employee.name,
          email: employee.email,
          initials: employee.initials,
          department: employee.department,
          location: employee.location,
          completedAt: employee.completedAt ?? result?.submittedAt.toISOString() ?? null,
          score: employee.assessmentScore,
          certificate: cert
            ? { id: cert.id, certificateNumber: cert.certificateNumber, issuedAt: cert.issuedAt }
            : null,
        }),
      );
    }

    for (const cert of certificates) {
      if (seen.has(cert.userId)) continue;
      const first = cert.user.firstName.trim();
      const last = cert.user.lastName.trim();
      const name = `${first} ${last}`.trim() || cert.user.email;
      const initials = `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || name.slice(0, 2).toUpperCase();
      const result = latestResultByUser.get(cert.userId);
      const score =
        result && result.totalQuestions > 0
          ? Math.round((result.score / result.totalQuestions) * 100)
          : null;
      rows.push(
        this.toCertificateRow({
          userId: cert.userId,
          name,
          email: cert.user.email,
          initials,
          department: cert.user.departmentRef?.name || cert.user.department || 'Unassigned',
          location: cert.user.locationRef?.name || 'Unassigned',
          completedAt: result?.submittedAt.toISOString() ?? cert.issuedAt.toISOString(),
          score,
          certificate: {
            id: cert.id,
            certificateNumber: cert.certificateNumber,
            issuedAt: cert.issuedAt,
          },
        }),
      );
    }

    const issued = rows.filter((row) => row.status === 'ISSUED').length;
    const pending = rows.filter((row) => row.status === 'PENDING').length;
    rows.sort((left, right) => left.name.localeCompare(right.name));

    return {
      data: {
        policyId: policy.id,
        policyTitle: policy.title,
        policyVersion: `v${policy.version}`,
        assigned: employees.length,
        stats: {
          issued,
          pending,
          expired: 0,
          revoked: 0,
        },
        rows,
      },
    };
  }

  async generateMissingCertificates(policyId: string) {
    const payload = await this.getCertificates(policyId);
    const pendingIds = payload.data.rows
      .filter((row) => row.status === 'PENDING')
      .map((row) => row.userId);
    const created = await this.issueForUsers(policyId, pendingIds);
    return { data: { created: created.length, certificateNumbers: created } };
  }

  async issueCertificate(policyId: string, userId: string) {
    const created = await this.issueForUsers(policyId, [userId]);
    if (created.length === 0) {
      const existing = await this.prisma.certificate.findFirst({
        where: { policyId, userId },
        select: { certificateNumber: true },
      });
      if (existing) {
        return { data: { created: 0, certificateNumber: existing.certificateNumber } };
      }
      throw new BadRequestException('This employee has not passed the assessment yet.');
    }
    return { data: { created: 1, certificateNumber: created[0] } };
  }

  async notifyCertificates(policyId: string, userIds?: string[]) {
    const policy = await this.assertPolicyRecord(policyId);
    const wanted = (userIds ?? []).map((id) => id.trim()).filter(Boolean);
    const certificates = await this.prisma.certificate.findMany({
      where: {
        policyId,
        ...(wanted.length > 0 ? { userId: { in: wanted } } : {}),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (certificates.length === 0) {
      throw new BadRequestException('No issued certificates match this request.');
    }

    await this.prisma.notificationMessage.createMany({
      data: certificates.map((row) => {
        const name = `${row.user.firstName} ${row.user.lastName}`.trim() || 'there';
        return {
          userId: row.userId,
          policyId,
          channel: 'inapp',
          title: 'Your certificate is ready',
          body: `Hi ${name}, your certificate for ${policy.title} (${row.certificateNumber}) is available to download.`,
          category: NotificationCategory.COMPLIANCE,
          priority: NotificationPriority.MEDIUM,
          metadata: {
            policyName: `${policy.title} v${policy.version}`,
            actionLabel: 'View Certificate',
          } as Prisma.InputJsonValue,
        };
      }),
    });
    this.inboxEvents.notify(certificates.map((row) => row.userId));
    return { data: { sent: certificates.length } };
  }

  private async assertPolicyRecord(policyId: string) {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      select: { id: true, title: true, version: true },
    });
    if (!policy) {
      throw new NotFoundException(`Policy ${policyId} was not found.`);
    }
    return policy;
  }

  private toCertificateRow(input: {
    userId: string;
    name: string;
    email: string;
    initials: string;
    department: string;
    location: string;
    completedAt: string | null;
    score: number | null;
    certificate: { id: string; certificateNumber: string; issuedAt: Date } | null;
  }) {
    return {
      id: input.userId,
      userId: input.userId,
      name: input.name,
      email: input.email,
      initials: input.initials,
      department: input.department,
      location: input.location,
      completedAt: input.completedAt,
      score: input.score,
      certificateId: input.certificate?.id ?? null,
      certificateNo: input.certificate?.certificateNumber ?? null,
      issuedAt: input.certificate?.issuedAt.toISOString() ?? null,
      status: input.certificate ? ('ISSUED' as const) : ('PENDING' as const),
    };
  }

  private async issueForUsers(policyId: string, userIds: string[]) {
    const unique = [...new Set(userIds.map((id) => id.trim()).filter(Boolean))];
    if (unique.length === 0) return [];

    const policy = await this.assertPolicyRecord(policyId);
    const [existing, passedRows] = await Promise.all([
      this.prisma.certificate.findMany({
        where: { policyId, userId: { in: unique } },
        select: { userId: true },
      }),
      this.prisma.testResult.findMany({
        where: { policyId, userId: { in: unique }, passed: true },
        select: { userId: true },
      }),
    ]);
    const have = new Set(existing.map((row) => row.userId));
    const passed = new Set(passedRows.map((row) => row.userId));
    const pending = unique.filter((id) => !have.has(id) && passed.has(id));
    if (pending.length === 0) return [];

    const created: string[] = [];
    for (const userId of pending) {
      const certificateNumber = await this.nextCertificateNumber(policyId);
      await this.prisma.certificate.create({
        data: { userId, policyId, certificateNumber },
      });
      created.push(certificateNumber);
    }

    await this.prisma.notificationMessage.createMany({
      data: pending.map((userId) => ({
        userId,
        policyId,
        channel: 'inapp',
        title: 'Certificate issued',
        body: `A completion certificate for ${policy.title} is now on your record.`,
        category: NotificationCategory.COMPLIANCE,
        priority: NotificationPriority.MEDIUM,
        metadata: {
          policyName: `${policy.title} v${policy.version}`,
          assignedBy: 'Compliance',
          actionLabel: 'View Certificate',
        } as Prisma.InputJsonValue,
      })),
    });
    this.inboxEvents.notify(pending);
    return created;
  }

  private async nextCertificateNumber(policyId: string) {
    const year = new Date().getFullYear();
    const prefix = `HN-${policyId.replace(/-/g, '').slice(0, 6).toUpperCase()}-${year}-`;
    const count = await this.prisma.certificate.count({ where: { policyId } });
    for (let index = count + 1; index < count + 1000; index += 1) {
      const certificateNumber = `${prefix}${String(index).padStart(4, '0')}`;
      const clash = await this.prisma.certificate.findUnique({
        where: { certificateNumber },
        select: { id: true },
      });
      if (!clash) return certificateNumber;
    }
    return `${prefix}${Date.now()}`;
  }

  async getAssessment(policyId: string) {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      select: { id: true, title: true },
    });

    if (!policy) {
      throw new NotFoundException(`Policy ${policyId} was not found.`);
    }

    const [assessment, results, [summary]] = await Promise.all([
      this.prisma.assessment.findUnique({
        where: { policyId },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            select: {
              id: true,
              type: true,
              prompt: true,
              order: true,
            },
          },
        },
      }),
      this.prisma.testResult.findMany({
        where: { policyId },
        orderBy: { submittedAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      }),
      this.buildSummaries([policyId]),
    ]);

    if (!assessment) {
      return {
        data: {
          exists: false,
          assigned: summary?.assigned ?? 0,
        },
      };
    }

    const latestByUser = new Map<string, (typeof results)[number]>();
    for (const result of results) {
      if (!latestByUser.has(result.userId)) {
        latestByUser.set(result.userId, result);
      }
    }

    const latest = [...latestByUser.values()];
    const scores = latest
      .filter((result) => result.totalQuestions > 0)
      .map((result) => Math.round((result.score / result.totalQuestions) * 100));
    const averageScore =
      scores.length === 0
        ? 0
        : Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
    const passed = latest.filter((result) => result.passed).length;
    const failed = latest.filter((result) => !result.passed).length;
    const attempted = latest.length;
    const assigned = summary?.assigned ?? 0;
    const notAttempted = Math.max(0, assigned - attempted);
    const averageAttempts =
      attempted === 0 ? 0 : Math.round((results.length / attempted) * 100) / 100;

    const buckets = [
      { label: '90% and above', min: 90, max: 101, color: '#10B981' },
      { label: '80%–89%', min: 80, max: 90, color: '#3B82F6' },
      { label: '70%–79%', min: 70, max: 80, color: '#F59E0B' },
      { label: 'Below 70%', min: 0, max: 70, color: '#EF4444' },
    ].map((bucket) => {
      const count = scores.filter(
        (score) => score >= bucket.min && score < bucket.max,
      ).length;
      return {
        label: bucket.label,
        count,
        pct: this.sharePct(count, scores.length),
        color: bucket.color,
      };
    });

    const typeCounts = new Map<string, number>();
    for (const question of assessment.questions) {
      const label = this.questionTypeLabel(question.type);
      typeCounts.set(label, (typeCounts.get(label) ?? 0) + 1);
    }

    const activity = latest.slice(0, 5).map((result) => {
      const score =
        result.totalQuestions > 0
          ? Math.round((result.score / result.totalQuestions) * 100)
          : 0;
      const name = `${result.user.firstName} ${result.user.lastName}`.trim();
      return {
        title: result.passed
          ? `${name} passed the assessment`
          : `${name} failed the assessment`,
        detail: `Score: ${score}% — ${result.passed ? 'Passed' : 'Failed'}`,
        time: this.formatRelative(result.submittedAt),
        kind: result.passed ? 'completed' : 'assessment',
      };
    });

    activity.push({
      title: 'Assessment updated',
      detail: `Updated by ${assessment.updatedBy}`,
      time: this.formatRelative(assessment.updatedAt),
      kind: 'update',
    });

    return {
      data: {
        exists: true,
        assigned,
        attempted,
        notAttempted,
        averageScore,
        passingScore: assessment.passingScore,
        passed,
        failed,
        passRate: this.sharePct(passed, assigned),
        averageAttempts,
        title: assessment.title,
        status: assessment.status,
        totalQuestions: assessment.questions.length,
        questionTypes: [...typeCounts.entries()]
          .map(([label, count]) => `${label} (${count})`)
          .join(', ') || 'None',
        maximumAttempts: assessment.maximumAttempts,
        timeLimitMinutes: assessment.timeLimitMinutes,
        randomizeQuestions: assessment.randomizeQuestions,
        showScoreImmediately: assessment.showScoreImmediately,
        updatedBy: assessment.updatedBy,
        updatedAt: assessment.updatedAt.toISOString(),
        questions: assessment.questions.map((question, index) => ({
          id: question.id,
          number: index + 1,
          prompt: question.prompt,
          type: this.questionTypeLabel(question.type),
        })),
        distribution: buckets,
        activity: activity.slice(0, 5),
      },
    };
  }

  private sharePct(count: number, total: number) {
    if (total <= 0) return 0;
    return Math.round((count / total) * 100);
  }

  private questionTypeLabel(type: string) {
    if (type === 'TRUE_FALSE') return 'True/False';
    return 'MCQ';
  }

  private async buildSummaries(policyIds: string[]) {
    if (policyIds.length === 0) {
      return [];
    }

    const [assignments, users, progress, results] = await Promise.all([
      this.prisma.policyAssignment.findMany({
        where: {
          policyId: { in: policyIds },
          startAt: { lte: new Date() },
          status: {
            in: [PolicyAssignmentStatus.ACTIVE, PolicyAssignmentStatus.COMPLETED],
          },
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
      this.prisma.policyReadingProgress.findMany({
        where: {
          policyId: { in: policyIds },
          completedAt: { not: null },
        },
        select: { userId: true, policyId: true },
      }),
      this.prisma.testResult.findMany({
        where: { policyId: { in: policyIds }, passed: true },
        select: { userId: true, policyId: true },
      }),
    ]);

    const completed = new Set<string>();
    for (const row of progress) {
      completed.add(`${row.userId}:${row.policyId}`);
    }
    for (const row of results) {
      completed.add(`${row.userId}:${row.policyId}`);
    }

    const now = new Date();
    const byPolicy = new Map<
      string,
      {
        assignedIds: Set<string>;
        completedIds: Set<string>;
        overdueIds: Set<string>;
        dueDates: Date[];
      }
    >();

    for (const policyId of policyIds) {
      byPolicy.set(policyId, {
        assignedIds: new Set(),
        completedIds: new Set(),
        overdueIds: new Set(),
        dueDates: [],
      });
    }

    for (const assignment of assignments) {
      const bucket = byPolicy.get(assignment.policyId);
      if (!bucket) {
        continue;
      }
      if (assignment.status === PolicyAssignmentStatus.ACTIVE) {
        bucket.dueDates.push(assignment.dueAt);
      }
      const recipients = users.filter((user) =>
        this.assignmentAppliesToUser(assignment, user),
      );
      for (const user of recipients) {
        bucket.assignedIds.add(user.id);
        const key = `${user.id}:${assignment.policyId}`;
        const done =
          completed.has(key) ||
          assignment.status === PolicyAssignmentStatus.COMPLETED;
        if (done) {
          bucket.completedIds.add(user.id);
        } else if (assignment.dueAt < now) {
          bucket.overdueIds.add(user.id);
        }
      }
    }

    return policyIds.map((policyId) => {
      const bucket = byPolicy.get(policyId);
      const assigned = bucket?.assignedIds.size ?? 0;
      const completedCount = bucket?.completedIds.size ?? 0;
      const overdue = [...(bucket?.overdueIds ?? [])].filter(
        (id) => !bucket?.completedIds.has(id),
      ).length;
      const pending = Math.max(0, assigned - completedCount - overdue);
      const completionPct =
        assigned === 0 ? 0 : Math.round((completedCount / assigned) * 100);
      const upcomingDue = (bucket?.dueDates ?? [])
        .filter((date) => date >= now)
        .sort((left, right) => left.getTime() - right.getTime())[0];
      const latestDue = (bucket?.dueDates ?? [])
        .slice()
        .sort((left, right) => right.getTime() - left.getTime())[0];

      return {
        policyId,
        assigned,
        completed: completedCount,
        pending,
        overdue,
        completionPct,
        dueAt: (upcomingDue ?? latestDue)?.toISOString() ?? null,
        status: this.trackStatus({
          assigned,
          completed: completedCount,
          overdue,
          completionPct,
        }),
      };
    });
  }

  private emptySummary(policyId: string) {
    return {
      policyId,
      assigned: 0,
      completed: 0,
      pending: 0,
      overdue: 0,
      completionPct: 0,
      dueAt: null as string | null,
      status: 'NOT_STARTED' as TrackStatus,
    };
  }

  private nextScheduledNotificationAt(
    dueAt: Date | null,
    rules: Array<{
      trigger: NotificationTrigger;
      offsetDays: number;
      lastFiredAt: Date | null;
    }>,
  ) {
    if (!dueAt || rules.length === 0) {
      return null;
    }
    const now = new Date();
    const candidates = rules
      .map((rule) => this.ruleFireAt(rule.trigger, rule.offsetDays, dueAt, rule.lastFiredAt, now))
      .filter((value): value is Date => value instanceof Date && value.getTime() > now.getTime())
      .sort((left, right) => left.getTime() - right.getTime());
    return candidates[0] ?? null;
  }

  private ruleFireAt(
    trigger: NotificationTrigger,
    offsetDays: number,
    dueAt: Date,
    lastFiredAt: Date | null,
    now: Date,
  ) {
    const due = new Date(dueAt);
    due.setHours(9, 0, 0, 0);
    if (trigger === NotificationTrigger.DAYS_BEFORE_DUE) {
      const at = new Date(due);
      at.setDate(at.getDate() - Math.max(0, offsetDays));
      return lastFiredAt ? null : at;
    }
    if (trigger === NotificationTrigger.ON_DUE_DATE) {
      return lastFiredAt ? null : due;
    }
    if (trigger === NotificationTrigger.DAYS_AFTER_DUE) {
      const at = new Date(due);
      at.setDate(at.getDate() + Math.max(0, offsetDays));
      return lastFiredAt ? null : at;
    }
    if (trigger === NotificationTrigger.EVERY_DAY_AFTER_DUE) {
      const at = new Date(due);
      at.setDate(at.getDate() + 1);
      if (now < at) return at;
      const next = new Date(now);
      next.setDate(next.getDate() + 1);
      next.setHours(9, 0, 0, 0);
      if (lastFiredAt) {
        const lastDay = new Date(lastFiredAt);
        lastDay.setHours(0, 0, 0, 0);
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        if (lastDay.getTime() === today.getTime()) {
          return next;
        }
      }
      return now <= at ? at : now;
    }
    return null;
  }

  private trackStatus(input: {
    assigned: number;
    completed: number;
    overdue: number;
    completionPct: number;
  }): TrackStatus {
    if (input.assigned === 0) {
      return 'NOT_STARTED';
    }
    if (input.overdue > 0) {
      return 'OVERDUE';
    }
    if (input.completed === 0) {
      return 'NOT_STARTED';
    }
    if (input.completionPct < 80) {
      return 'AT_RISK';
    }
    return 'ON_TRACK';
  }

  private assignmentAppliesToUser(assignment: AssignmentRecord, user: UserRecord) {
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
  }

  private buildActivity(input: {
    policyTitle: string;
    version: number;
    publishedAt: Date;
    createdBy: string;
    progress: Array<{
      completedAt: Date | null;
      user: { firstName: string; lastName: string };
    }>;
    results: Array<{
      submittedAt: Date;
      passed: boolean;
      score: number;
      totalQuestions: number;
    }>;
    assignments: Array<{
      createdAt: Date;
      scopeLabel: string;
      status: PolicyAssignmentStatus;
    }>;
    auditLogs: Array<{
      createdAt: Date;
      action: string;
      details: string;
      userName: string;
    }>;
  }) {
    const items: Array<{
      title: string;
      detail: string;
      at: Date;
      kind: 'completed' | 'assessment' | 'assignment' | 'published' | 'update';
    }> = [];

    for (const row of input.progress) {
      if (!row.completedAt) continue;
      items.push({
        title: 'Acknowledgement Completed',
        detail: `${row.user.firstName} ${row.user.lastName}`.trim(),
        at: row.completedAt,
        kind: 'completed',
      });
    }

    for (const result of input.results.slice(0, 4)) {
      const score =
        result.totalQuestions > 0
          ? Math.round((result.score / result.totalQuestions) * 100)
          : 0;
      items.push({
        title: result.passed ? 'Assessment Passed' : 'Assessment Failed',
        detail: `Score ${score}%`,
        at: result.submittedAt,
        kind: 'assessment',
      });
    }

    for (const assignment of input.assignments) {
      items.push({
        title: 'Policy Assigned',
        detail: assignment.scopeLabel || 'Assignment created',
        at: assignment.createdAt,
        kind: 'assignment',
      });
    }

    for (const log of input.auditLogs) {
      if (/policy assigned|assignment/i.test(log.details)) {
        continue;
      }
      if (/remind|notification|email/i.test(`${log.details} ${log.action}`)) {
        items.push({
          title: 'Notification Sent',
          detail: log.details || log.userName,
          at: log.createdAt,
          kind: 'update',
        });
        continue;
      }
      if (log.action === 'UPDATE') {
        items.push({
          title: 'Record Updated',
          detail: log.details || log.userName,
          at: log.createdAt,
          kind: 'update',
        });
      }
    }

    items.push({
      title: 'Policy Published',
      detail: `Version ${input.version}.0`,
      at: input.publishedAt,
      kind: 'published',
    });

    const seen = new Set<string>();
    return items
      .sort((left, right) => right.at.getTime() - left.at.getTime())
      .filter((item) => {
        const key = `${item.kind}:${item.title}:${item.detail}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((item) => ({
        title: item.title,
        detail: item.detail,
        time: this.formatRelative(item.at),
        kind: item.kind,
      }));
  }

  private toMyTask(input: {
    id: string;
    policyId: string;
    title: string;
    type: 'assessment' | 'acknowledgement';
    priority: PolicyAssignmentPriority;
    dueAt: Date;
    now: Date;
    done: boolean;
    started: boolean;
    progressPct: number;
    completedAt: Date | null;
    href: string;
    actionLabel: string;
    questionCount?: number;
    passingScore?: number;
    score?: number | null;
  }) {
    const dueSoonUntil = new Date(input.now);
    dueSoonUntil.setDate(dueSoonUntil.getDate() + 7);
    const status = (
      input.done
        ? 'COMPLETED'
        : input.dueAt < input.now
          ? 'OVERDUE'
          : input.dueAt <= dueSoonUntil
            ? 'DUE_SOON'
            : input.started
              ? 'IN_PROGRESS'
              : 'OPEN'
    ) as 'OVERDUE' | 'DUE_SOON' | 'IN_PROGRESS' | 'OPEN' | 'COMPLETED';

    return {
      id: input.id,
      policyId: input.policyId,
      title: input.title,
      type: input.type,
      priority: input.priority,
      status,
      dueAt: input.dueAt.toISOString(),
      dueLabel: this.formatDueLabel(input.dueAt, input.now, input.done, input.completedAt),
      questionCount: input.questionCount ?? null,
      passingScore: input.passingScore ?? null,
      score: input.score ?? null,
      progressPct: input.progressPct,
      completedAt: input.completedAt?.toISOString() ?? null,
      href: input.href,
      actionLabel: input.actionLabel,
    };
  }

  private formatDueLabel(
    dueAt: Date,
    now: Date,
    done: boolean,
    completedAt: Date | null,
  ) {
    const dateLabel = dueAt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    if (done) {
      const finished = completedAt ?? dueAt;
      return `Completed (${finished.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })})`;
    }
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const dueDay = new Date(dueAt);
    dueDay.setHours(0, 0, 0, 0);
    const days = Math.round((dueDay.getTime() - start.getTime()) / 86_400_000);
    if (days < 0) {
      const overdueBy = Math.abs(days);
      return overdueBy === 1
        ? `Overdue by 1 day (${dateLabel})`
        : `Overdue by ${overdueBy} days (${dateLabel})`;
    }
    if (days === 0) return `Due today (${dateLabel})`;
    if (days === 1) return `Due in 1 day (${dateLabel})`;
    return `Due in ${days} days (${dateLabel})`;
  }

  private formatRelative(date: Date) {
    const diffMs = Date.now() - date.getTime();
    const minutes = Math.max(1, Math.round(diffMs / 60_000));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 14) return `${days}d ago`;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private displayName(user: { firstName: string; lastName: string }) {
    return `${user.firstName} ${user.lastName}`.trim() || 'Unknown';
  }

  private formatDate(value: Date) {
    return value.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private formatEventTime(value: Date) {
    const date = value.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const time = value.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `${date} · ${time}`;
  }

  private auditActivityKind(action: string, details: string) {
    const haystack = `${action} ${details}`.toLowerCase();
    if (/remind|notification|email|in-app|inapp/.test(haystack)) return 'notification';
    if (/certificate/.test(haystack)) return 'certificate';
    if (/assess/.test(haystack)) return 'assessment';
    if (/publish/.test(haystack)) return 'published';
    if (action === 'CREATE') return 'update';
    return 'update';
  }

  private auditActivityTitle(action: string, details: string) {
    const haystack = `${action} ${details}`.toLowerCase();
    if (/remind|notification|email/.test(haystack)) return 'Notification Sent';
    if (/certificate/.test(haystack)) return 'Certificate Issued';
    if (/assess/.test(haystack)) return 'Assessment Updated';
    if (/publish/.test(haystack)) return 'Policy Published';
    if (action === 'CREATE') return 'Record Created';
    if (action === 'DELETE') return 'Record Deleted';
    return 'Record Updated';
  }
}

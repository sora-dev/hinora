import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssessmentDifficulty,
  AssessmentQuestionSource,
  AssessmentQuestionType,
  AssessmentStatus,
  UserStatus,
  type Assessment,
  type AssessmentQuestion,
  type AssessmentQuestionOption,
  type Policy,
} from '@prisma/client';
import { PolicyAssignmentsService } from '../policy-assignments/policy-assignments.service';
import { PrismaService } from '../prisma/prisma.service';

type IncomingOption = {
  text: string;
  isCorrect: boolean;
};

type IncomingQuestion = {
  id: string | null;
  type: AssessmentQuestionType;
  prompt: string;
  explanation: string | null;
  points: number;
  difficulty: AssessmentDifficulty;
  source: AssessmentQuestionSource;
  options: IncomingOption[];
};

type AssessmentSettingsInput = {
  title: string;
  description: string | null;
  instructions: string | null;
  status: AssessmentStatus;
  passingScore: number;
  maximumAttempts: number;
  timeLimitMinutes: number;
  retakeWaitHours: number;
  randomizeQuestions: boolean;
  shuffleAnswerChoices: boolean;
  showExplanationAfterAnswer: boolean;
  allowReviewAfterSubmission: boolean;
  showScoreImmediately: boolean;
  requirePassToAcknowledge: boolean;
  issueCertificateOnPass: boolean;
  notifyOnFailure: boolean;
};

type AssessmentWithQuestions = Assessment & {
  questions: (AssessmentQuestion & { options: AssessmentQuestionOption[] })[];
};

const maxQuestionsPerAssessment = 200;
const maxOptionsPerQuestion = 6;

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policyAssignments: PolicyAssignmentsService,
  ) {}

  /** Every policy, with a summary of its assessment. Powers the policy picker. */
  async listAssessments() {
    const policies = await this.prisma.policy.findMany({
      where: { isActive: true },
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
        assessment: {
          select: {
            id: true,
            status: true,
            updatedAt: true,
            _count: { select: { questions: true } },
          },
        },
      },
    });
    const assignedCounts = await this.policyAssignments.assignedUserCountsByPolicy(
      policies.map((policy) => policy.id),
    );

    return {
      data: policies.map((policy) => ({
        ...this.toPolicySummary(policy, assignedCounts.get(policy.id) ?? 0),
        hasAssessment: policy.assessment !== null,
        assessmentStatus: policy.assessment?.status ?? null,
        questionCount: policy.assessment?._count.questions ?? 0,
        assessmentUpdatedAt: policy.assessment?.updatedAt.toISOString() ?? null,
      })),
    };
  }

  async getAssessmentForPolicy(policyId: string) {
    const [policy, assessment, assignedCount] = await Promise.all([
      this.prisma.policy.findUnique({ where: { id: policyId } }),
      this.prisma.assessment.findUnique({
        where: { policyId },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: { options: { orderBy: { order: 'asc' } } },
          },
        },
      }),
      this.policyAssignments.countAssignedUsersForPolicy(policyId),
    ]);

    if (!policy) {
      throw new NotFoundException(`Policy ${policyId} was not found.`);
    }

    return {
      data: {
        policy: this.toPolicySummary(policy, assignedCount),
        assessment: assessment ? this.toAssessmentDetail(assessment) : null,
      },
    };
  }

  async getTakeForPolicy(policyId: string, userId: string) {
    const actorId = userId.trim();
    if (!actorId) {
      throw new BadRequestException('X-Hinora-User-Id is required.');
    }

    const [user, policy, assessment] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: actorId },
        select: { id: true, status: true },
      }),
      this.prisma.policy.findUnique({
        where: { id: policyId },
        select: { id: true, title: true, version: true },
      }),
      this.prisma.assessment.findUnique({
        where: { policyId },
        include: {
          questions: {
            orderBy: { order: 'asc' },
            include: { options: { orderBy: { order: 'asc' } } },
          },
        },
      }),
    ]);

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new NotFoundException(`User ${actorId} was not found.`);
    }
    if (!policy) {
      throw new NotFoundException(`Policy ${policyId} was not found.`);
    }
    if (!assessment || !this.isBuiltAssessment(assessment)) {
      throw new NotFoundException('No assessment is available for this policy.');
    }

    const assignedIds = await this.policyAssignments.assignedPolicyIdsForUser(actorId);
    if (!assignedIds.includes(policyId)) {
      throw new ForbiddenException('This assessment is not assigned to you.');
    }

    const [results, assignment, draft] = await Promise.all([
      this.prisma.testResult.findMany({
        where: { userId: actorId, policyId },
        orderBy: { submittedAt: 'desc' },
      }),
      this.policyAssignments.assignmentsForUser(actorId),
      this.prisma.assessmentDraft.findUnique({
        where: { userId_policyId: { userId: actorId, policyId } },
      }),
    ]);

    const dueAt =
      assignment
        .filter((row) => row.policyId === policyId)
        .sort((left, right) => left.dueAt.getTime() - right.dueAt.getTime())[0]?.dueAt ?? null;
    const attemptCount = results.length;
    const latest = results[0] ?? null;
    const passed = Boolean(latest?.passed);
    const remainingAttempts =
      assessment.maximumAttempts === 0
        ? null
        : Math.max(0, assessment.maximumAttempts - attemptCount);
    const canTake = !passed && (remainingAttempts === null || remainingAttempts > 0);

    const questions = canTake
      ? this.presentTakeQuestions(assessment)
      : [];

    return {
      data: {
        policyId: policy.id,
        policyTitle: policy.title,
        policyVersion: `v${policy.version}`,
        title: assessment.title,
        description: assessment.description,
        instructions: assessment.instructions,
        passingScore: assessment.passingScore,
        maximumAttempts: assessment.maximumAttempts,
        timeLimitMinutes: assessment.timeLimitMinutes,
        attemptCount,
        remainingAttempts,
        canTake,
        dueAt: dueAt?.toISOString() ?? null,
        lastResult: latest
          ? {
              percent:
                latest.totalQuestions > 0
                  ? Math.round((latest.score / latest.totalQuestions) * 100)
                  : 0,
              correct: latest.score,
              totalQuestions: latest.totalQuestions,
              passed: latest.passed,
              submittedAt: latest.submittedAt.toISOString(),
            }
          : null,
        draft: canTake ? this.toDraftRecord(draft) : null,
        questions,
      },
    };
  }

  async submitTakeForPolicy(
    policyId: string,
    userId: string,
    body: Record<string, unknown>,
  ) {
    const take = await this.getTakeForPolicy(policyId, userId);
    if (!take.data.canTake) {
      throw new BadRequestException('You cannot take this assessment again.');
    }

    const assessment = await this.prisma.assessment.findUnique({
      where: { policyId },
      include: {
        questions: {
          include: { options: true },
        },
      },
    });
    if (!assessment) {
      throw new NotFoundException('No published assessment is available for this policy.');
    }

    const answers = this.readAnswers(body.answers);
    let correct = 0;
    for (const question of assessment.questions) {
      const selected = answers[question.id];
      const match = question.options.find((option) => option.id === selected);
      if (match?.isCorrect) {
        correct += 1;
      }
    }

    const totalQuestions = assessment.questions.length;
    const percent = totalQuestions > 0 ? Math.round((correct / totalQuestions) * 100) : 0;
    const passed = percent >= assessment.passingScore;

    const result = await this.prisma.testResult.create({
      data: {
        userId: userId.trim(),
        policyId,
        score: correct,
        totalQuestions,
        passed,
      },
    });

    let certificateNumber: string | null = null;
    if (passed && assessment.issueCertificateOnPass) {
      const existing = await this.prisma.certificate.findFirst({
        where: { userId: userId.trim(), policyId },
      });
      if (!existing) {
        const created = await this.prisma.certificate.create({
          data: {
            userId: userId.trim(),
            policyId,
            certificateNumber: `HN-${policyId.slice(0, 8).toUpperCase()}-${Date.now()}`,
          },
        });
        certificateNumber = created.certificateNumber;
      } else {
        certificateNumber = existing.certificateNumber;
      }
    }

    await this.prisma.assessmentDraft.deleteMany({
      where: { userId: userId.trim(), policyId },
    });

    return {
      data: {
        passed,
        percent,
        correct,
        totalQuestions,
        passingScore: assessment.passingScore,
        showScoreImmediately: assessment.showScoreImmediately,
        certificateNumber,
        submittedAt: result.submittedAt.toISOString(),
      },
    };
  }

  async saveDraftForPolicy(
    policyId: string,
    userId: string,
    body: Record<string, unknown>,
  ) {
    const take = await this.getTakeForPolicy(policyId, userId);
    if (!take.data.canTake) {
      throw new BadRequestException('You cannot update a draft for this assessment.');
    }

    const actorId = userId.trim();
    const answers = this.readAnswers(body.answers);
    const bookmarks = this.readBookmarks(body.bookmarks);
    const questionIndex = this.readQuestionIndex(body.index ?? body.questionIndex);
    const requestedStart =
      typeof body.startedAt === 'string' ? new Date(body.startedAt) : null;
    const startedAt =
      requestedStart && !Number.isNaN(requestedStart.getTime())
        ? requestedStart
        : new Date();

    const existing = await this.prisma.assessmentDraft.findUnique({
      where: { userId_policyId: { userId: actorId, policyId } },
    });

    const row = await this.prisma.assessmentDraft.upsert({
      where: { userId_policyId: { userId: actorId, policyId } },
      create: {
        userId: actorId,
        policyId,
        answers,
        bookmarks,
        questionIndex,
        startedAt,
      },
      update: {
        answers,
        bookmarks,
        questionIndex,
        startedAt: existing?.startedAt ?? startedAt,
      },
    });

    return { data: this.toDraftRecord(row) };
  }

  async clearDraftForPolicy(policyId: string, userId: string) {
    const actorId = userId.trim();
    if (!actorId) {
      throw new BadRequestException('X-Hinora-User-Id is required.');
    }
    await this.prisma.assessmentDraft.deleteMany({
      where: { userId: actorId, policyId },
    });
    return { data: { cleared: true } };
  }

  async saveAssessmentForPolicy(
    policyId: string,
    body: Record<string, unknown>,
  ) {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      throw new NotFoundException(`Policy ${policyId} was not found.`);
    }

    const settings = this.parseSettings(body, policy);
    const questions = this.parseQuestions(body.questions);
    const actor = this.normalizeOptionalString(body.updatedBy) ?? 'system';
    if (questions.length > 0 && settings.status !== AssessmentStatus.ARCHIVED) {
      settings.status = AssessmentStatus.PUBLISHED;
    } else if (questions.length === 0 && settings.status !== AssessmentStatus.ARCHIVED) {
      settings.status = AssessmentStatus.DRAFT;
    }

    await this.prisma.$transaction(
      async (tx) => {
        const assessment = await tx.assessment.upsert({
          where: { policyId },
          create: { policyId, ...settings, createdBy: actor, updatedBy: actor },
          update: { ...settings, updatedBy: actor },
        });

        const existing = await tx.assessmentQuestion.findMany({
          where: { assessmentId: assessment.id },
          select: { id: true },
        });
        const existingIds = new Set(existing.map((question) => question.id));

        // Rows are deleted and re-inserted in one transaction, reusing the
        // incoming id where it already exists so question identity survives a
        // save. This keeps the write to a handful of statements regardless of
        // how many questions the assessment has.
        const questionRows = questions.map((question, index) => ({
          id:
            question.id && existingIds.has(question.id)
              ? question.id
              : randomUUID(),
          assessmentId: assessment.id,
          type: question.type,
          prompt: question.prompt,
          explanation: question.explanation,
          points: question.points,
          difficulty: question.difficulty,
          source: question.source,
          order: index,
        }));

        const optionRows = questionRows.flatMap((row, questionIndex) =>
          questions[questionIndex].options.map((option, optionIndex) => ({
            questionId: row.id,
            text: option.text,
            isCorrect: option.isCorrect,
            order: optionIndex,
          })),
        );

        await tx.assessmentQuestion.deleteMany({
          where: { assessmentId: assessment.id },
        });

        if (questionRows.length > 0) {
          await tx.assessmentQuestion.createMany({ data: questionRows });
          await tx.assessmentQuestionOption.createMany({ data: optionRows });
        }
      },
      { timeout: 20000 },
    );

    return this.getAssessmentForPolicy(policyId);
  }

  async deleteAssessmentForPolicy(policyId: string) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { policyId },
      select: { id: true },
    });

    if (!assessment) {
      throw new NotFoundException(
        `No assessment exists for policy ${policyId}.`,
      );
    }

    await this.prisma.assessment.delete({ where: { policyId } });

    return { data: { id: assessment.id, policyId } };
  }

  private isBuiltAssessment(assessment: {
    status: AssessmentStatus;
    questions: unknown[];
  }) {
    return assessment.status !== AssessmentStatus.ARCHIVED && assessment.questions.length > 0;
  }

  private toPolicySummary(
    policy: Policy & {
      category?: { id: string; name: string; color: string } | null;
    },
    assignedCount: number,
  ) {
    return {
      id: policy.id,
      title: policy.title,
      version: `v${policy.version}.0`,
      status: policy.status,
      fileName: policy.fileName,
      department: policy.department,
      category: policy.category
        ? {
            id: policy.category.id,
            name: policy.category.name,
            color: policy.category.color,
          }
        : null,
      updatedAt: policy.updatedAt.toISOString(),
      assignedCount,
    };
  }

  private presentTakeQuestions(assessment: AssessmentWithQuestions) {
    const questions = assessment.randomizeQuestions
      ? this.shuffle(assessment.questions)
      : [...assessment.questions];

    return questions.map((question) => {
      const options = assessment.shuffleAnswerChoices
        ? this.shuffle(question.options)
        : [...question.options];
      return {
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        options: options.map((option) => ({
          id: option.id,
          text: option.text,
        })),
      };
    });
  }

  private readAnswers(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {} as Record<string, string>;
    }
    const answers: Record<string, string> = {};
    for (const [questionId, optionId] of Object.entries(value)) {
      if (typeof optionId === 'string' && optionId.trim()) {
        answers[questionId] = optionId.trim();
      }
    }
    return answers;
  }

  private readBookmarks(value: unknown) {
    if (!Array.isArray(value)) return [] as string[];
    return [
      ...new Set(
        value
          .filter((item): item is string => typeof item === 'string')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ];
  }

  private readQuestionIndex(value: unknown) {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(500, Math.floor(parsed)));
  }

  private toDraftRecord(
    row: {
      answers: unknown;
      bookmarks: string[];
      questionIndex: number;
      startedAt: Date;
    } | null,
  ) {
    if (!row) return null;
    return {
      answers: this.readAnswers(row.answers),
      bookmarks: row.bookmarks,
      index: row.questionIndex,
      startedAt: row.startedAt.toISOString(),
    };
  }

  private shuffle<T>(items: T[]) {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      const current = copy[index];
      copy[index] = copy[swap];
      copy[swap] = current;
    }
    return copy;
  }

  private toAssessmentDetail(assessment: AssessmentWithQuestions) {
    return {
      id: assessment.id,
      policyId: assessment.policyId,
      title: assessment.title,
      description: assessment.description,
      instructions: assessment.instructions,
      status: assessment.status,
      passingScore: assessment.passingScore,
      maximumAttempts: assessment.maximumAttempts,
      timeLimitMinutes: assessment.timeLimitMinutes,
      retakeWaitHours: assessment.retakeWaitHours,
      randomizeQuestions: assessment.randomizeQuestions,
      shuffleAnswerChoices: assessment.shuffleAnswerChoices,
      showExplanationAfterAnswer: assessment.showExplanationAfterAnswer,
      allowReviewAfterSubmission: assessment.allowReviewAfterSubmission,
      showScoreImmediately: assessment.showScoreImmediately,
      requirePassToAcknowledge: assessment.requirePassToAcknowledge,
      issueCertificateOnPass: assessment.issueCertificateOnPass,
      notifyOnFailure: assessment.notifyOnFailure,
      updatedBy: assessment.updatedBy,
      updatedAt: assessment.updatedAt.toISOString(),
      questions: assessment.questions.map((question) => ({
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        explanation: question.explanation,
        points: question.points,
        difficulty: question.difficulty,
        source: question.source,
        options: question.options.map((option) => ({
          id: option.id,
          text: option.text,
          isCorrect: option.isCorrect,
        })),
      })),
    };
  }

  private parseSettings(
    body: Record<string, unknown>,
    policy: Policy,
  ): AssessmentSettingsInput {
    return {
      title:
        this.normalizeOptionalString(body.title) ??
        `${policy.title} Assessment`,
      description: this.normalizeOptionalString(body.description),
      instructions: this.normalizeOptionalString(body.instructions),
      status: this.parseEnum(
        body.status,
        AssessmentStatus,
        AssessmentStatus.DRAFT,
        'status',
      ),
      passingScore: this.parseInteger(
        body.passingScore,
        80,
        0,
        100,
        'passingScore',
      ),
      maximumAttempts: this.parseInteger(
        body.maximumAttempts,
        0,
        0,
        50,
        'maximumAttempts',
      ),
      timeLimitMinutes: this.parseInteger(
        body.timeLimitMinutes,
        20,
        0,
        480,
        'timeLimitMinutes',
      ),
      retakeWaitHours: this.parseInteger(
        body.retakeWaitHours,
        0,
        0,
        720,
        'retakeWaitHours',
      ),
      randomizeQuestions: this.parseBoolean(body.randomizeQuestions, true),
      shuffleAnswerChoices: this.parseBoolean(body.shuffleAnswerChoices, true),
      showExplanationAfterAnswer: this.parseBoolean(
        body.showExplanationAfterAnswer,
        true,
      ),
      allowReviewAfterSubmission: this.parseBoolean(
        body.allowReviewAfterSubmission,
        true,
      ),
      showScoreImmediately: this.parseBoolean(body.showScoreImmediately, true),
      requirePassToAcknowledge: this.parseBoolean(
        body.requirePassToAcknowledge,
        true,
      ),
      issueCertificateOnPass: this.parseBoolean(
        body.issueCertificateOnPass,
        true,
      ),
      notifyOnFailure: this.parseBoolean(body.notifyOnFailure, false),
    };
  }

  private parseQuestions(value: unknown): IncomingQuestion[] {
    if (value === undefined || value === null) {
      return [];
    }

    if (!Array.isArray(value)) {
      throw new BadRequestException('questions must be an array.');
    }

    if (value.length > maxQuestionsPerAssessment) {
      throw new BadRequestException(
        `An assessment cannot have more than ${maxQuestionsPerAssessment} questions.`,
      );
    }

    return value.map((entry, index) =>
      this.parseQuestion(entry, `questions[${index}]`),
    );
  }

  private parseQuestion(value: unknown, path: string): IncomingQuestion {
    if (typeof value !== 'object' || value === null) {
      throw new BadRequestException(`${path} must be an object.`);
    }

    const record = value as Record<string, unknown>;
    const prompt = this.normalizeOptionalString(record.prompt);

    if (!prompt) {
      throw new BadRequestException(`${path}.prompt is required.`);
    }

    const type = this.parseEnum(
      record.type,
      AssessmentQuestionType,
      AssessmentQuestionType.MULTIPLE_CHOICE,
      `${path}.type`,
    );

    const options = this.parseOptions(record.options, path);

    if (type === AssessmentQuestionType.TRUE_FALSE && options.length !== 2) {
      throw new BadRequestException(
        `${path} is a true/false question and must have exactly 2 options.`,
      );
    }

    const correctCount = options.filter((option) => option.isCorrect).length;

    if (correctCount !== 1) {
      throw new BadRequestException(
        `${path} must have exactly one correct option.`,
      );
    }

    return {
      id: this.normalizeOptionalString(record.id),
      type,
      prompt,
      explanation: this.normalizeOptionalString(record.explanation),
      points: this.parseInteger(record.points, 1, 1, 100, `${path}.points`),
      difficulty: this.parseEnum(
        record.difficulty,
        AssessmentDifficulty,
        AssessmentDifficulty.MEDIUM,
        `${path}.difficulty`,
      ),
      source: this.parseEnum(
        record.source,
        AssessmentQuestionSource,
        AssessmentQuestionSource.MANUAL,
        `${path}.source`,
      ),
      options,
    };
  }

  private parseOptions(value: unknown, path: string): IncomingOption[] {
    if (!Array.isArray(value) || value.length < 2) {
      throw new BadRequestException(
        `${path}.options must have at least 2 entries.`,
      );
    }

    if (value.length > maxOptionsPerQuestion) {
      throw new BadRequestException(
        `${path}.options cannot have more than ${maxOptionsPerQuestion} entries.`,
      );
    }

    return value.map((entry, index) => {
      if (typeof entry !== 'object' || entry === null) {
        throw new BadRequestException(
          `${path}.options[${index}] must be an object.`,
        );
      }

      const record = entry as Record<string, unknown>;
      const text = this.normalizeOptionalString(record.text);

      if (!text) {
        throw new BadRequestException(
          `${path}.options[${index}].text is required.`,
        );
      }

      return { text, isCorrect: this.parseBoolean(record.isCorrect, false) };
    });
  }

  private parseEnum<T extends Record<string, string>>(
    value: unknown,
    options: T,
    fallback: T[keyof T],
    field: string,
  ): T[keyof T] {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }

    if (typeof value !== 'string' || !Object.values(options).includes(value)) {
      throw new BadRequestException(
        `${field} must be one of: ${Object.values(options).join(', ')}.`,
      );
    }

    return value as T[keyof T];
  }

  private parseInteger(
    value: unknown,
    fallback: number,
    min: number,
    max: number,
    field: string,
  ) {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }

    const parsed = typeof value === 'number' ? value : Number(value);

    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
      throw new BadRequestException(
        `${field} must be a whole number between ${min} and ${max}.`,
      );
    }

    return parsed;
  }

  private parseBoolean(value: unknown, fallback: boolean) {
    if (typeof value === 'boolean') {
      return value;
    }

    if (value === 'true') return true;
    if (value === 'false') return false;

    return fallback;
  }

  private normalizeOptionalString(value: unknown) {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();

    return trimmed.length > 0 ? trimmed : null;
  }
}

import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
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
  constructor(private readonly prisma: PrismaService) {}

  /** Every policy, with a summary of its assessment. Powers the policy picker. */
  async listAssessments() {
    const [policies, assignedCount] = await Promise.all([
      this.prisma.policy.findMany({
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
      }),
      this.countAssignedEmployees(),
    ]);

    return {
      data: policies.map((policy) => ({
        ...this.toPolicySummary(policy, assignedCount),
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
      this.countAssignedEmployees(),
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

  /**
   * There is no policy assignment model yet, so every active employee is
   * treated as assigned. Replace this once Policy Assignments ships.
   */
  private countAssignedEmployees() {
    return this.prisma.user.count({ where: { status: UserStatus.ACTIVE } });
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

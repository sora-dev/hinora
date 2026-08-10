import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PolicyAnalysisStatus,
  PolicyDocumentType,
  PolicyStatus,
  Prisma,
} from '@prisma/client';
import * as fs from 'node:fs';
import { join } from 'node:path';
import { PolicyAnalysisService } from './policy-analysis.service';
import { PolicyContentExtractorService } from './policy-content-extractor.service';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from '../storage/supabase-storage.service';

type ListPoliciesQuery = Record<string, string | undefined>;

const policyInclude = {
  category: {
    select: {
      id: true,
      name: true,
      code: true,
      color: true,
    },
  },
} satisfies Prisma.PolicyInclude;

type PolicyWithCategory = Prisma.PolicyGetPayload<{
  include: typeof policyInclude;
}>;

@Injectable()
export class PoliciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policyContentExtractor: PolicyContentExtractorService,
    private readonly policyAnalysisService: PolicyAnalysisService,
    private readonly storage: SupabaseStorageService,
  ) {}

  async listPolicies(query: ListPoliciesQuery) {
    const page = this.parsePositiveInt(query.page, 1);
    const pageSize = this.parsePositiveInt(query.pageSize, 10);
    const search = this.normalizeOptionalString(query.search);
    const categoryId = this.normalizeOptionalString(query.categoryId);
    const status = this.parseOptionalPolicyStatus(query.status);

    const where: Prisma.PolicyWhereInput = {
      AND: [
        search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } },
                { department: { contains: search, mode: 'insensitive' } },
                {
                  category: {
                    name: { contains: search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {},
        categoryId ? { categoryId } : {},
        status ? { status } : {},
      ],
    };

    const [policies, total, allPolicies, categories] = await Promise.all([
      this.prisma.policy.findMany({
        where,
        include: policyInclude,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.policy.count({ where }),
      this.prisma.policy.findMany(),
      this.prisma.category.findMany({
        select: {
          id: true,
          name: true,
          code: true,
        },
        orderBy: [{ name: 'asc' }],
      }),
    ]);

    return {
      data: policies.map((policy) => this.toPolicyResponse(policy)),
      stats: {
        totalPolicies: allPolicies.length,
        publishedPolicies: allPolicies.filter(
          (policy) => policy.status === PolicyStatus.PUBLISHED,
        ).length,
        draftPolicies: allPolicies.filter(
          (policy) => policy.status === PolicyStatus.DRAFT,
        ).length,
        underReviewPolicies: allPolicies.filter(
          (policy) => policy.status === PolicyStatus.UNDER_REVIEW,
        ).length,
      },
      filters: {
        categories,
        statuses: Object.values(PolicyStatus),
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async uploadPolicy(file: Express.Multer.File | undefined, body: Record<string, unknown>) {
    if (!file) {
      throw new BadRequestException('file is required.');
    }

    if (!file.buffer?.length) {
      throw new BadRequestException(
        'file buffer is missing. Policy uploads must use memory storage.',
      );
    }

    const title = this.readRequiredString(body.title, 'title');
    const description = this.normalizeOptionalString(body.description);
    const categoryId = this.readRequiredString(body.categoryId, 'categoryId');
    const department = this.readRequiredString(body.department, 'department');
    const type = this.parsePolicyDocumentType(body.type);
    const status = this.parsePolicyStatus(body.status);
    const createdBy =
      this.normalizeOptionalString(body.createdBy) ?? 'John Dela Cruz';

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category ${categoryId} was not found.`);
    }

    const uploaded = await this.storage.uploadPolicyFile(file);

    try {
      const extractedContent =
        await this.policyContentExtractor.extractFromUploadedFile(file);

      const createdPolicy = await this.prisma.policy.create({
        data: {
          title,
          description,
          fileName: file.originalname,
          filePath: uploaded.filePath,
          fileType: file.mimetype,
          department,
          type,
          status,
          createdBy,
          categoryId,
          content: extractedContent,
          analysisStatus: PolicyAnalysisStatus.IN_PROGRESS,
          analysisRequestedAt: new Date(),
          isActive: status !== PolicyStatus.ARCHIVED,
        },
        include: policyInclude,
      });

      const policy = await this.persistPolicyAnalysis(createdPolicy.id, createdBy);

      return {
        data: this.toPolicyResponse(policy),
      };
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async getPolicyFile(id: string) {
    const policy = await this.findPolicyById(id);

    if (!policy) {
      throw new NotFoundException(`Policy ${id} was not found.`);
    }

    if (this.storage.isStorageFilePath(policy.filePath)) {
      const url = await this.storage.createSignedUrl(policy.filePath);
      return { kind: 'redirect' as const, url };
    }

    if (this.storage.isLegacyLocalFilePath(policy.filePath)) {
      const absolutePath = this.resolveLegacyLocalPath(policy.filePath);

      if (!absolutePath || !fs.existsSync(absolutePath)) {
        throw new NotFoundException(
          'This policy file is missing from local storage. Re-upload the PDF so it is stored in Supabase Storage.',
        );
      }

      return {
        kind: 'buffer' as const,
        buffer: fs.readFileSync(absolutePath),
        contentType: policy.fileType || 'application/pdf',
        fileName: policy.fileName,
      };
    }

    // Fallback: treat unknown paths as storage object keys.
    const url = await this.storage.createSignedUrl(policy.filePath);
    return { kind: 'redirect' as const, url };
  }

  async getPolicyById(id: string) {
    const foundPolicy = await this.findPolicyById(id);

    if (!foundPolicy) {
      throw new NotFoundException(`Policy ${id} was not found.`);
    }

    const policy = await this.ensurePolicyContent(foundPolicy);

    const relatedPolicies = await this.prisma.policy.findMany({
      where: {
        id: { not: policy.id },
        categoryId: policy.categoryId ?? undefined,
        status: PolicyStatus.PUBLISHED,
      },
      include: policyInclude,
      orderBy: [{ updatedAt: 'desc' }],
      take: 4,
    });

    return {
      data: {
        ...this.toPolicyResponse(policy),
        content: policy.content,
        version: policy.version,
        isActive: policy.isActive,
        summaryShort: policy.summaryShort,
        summaryLong: policy.summaryLong,
        keyPoints: this.readStringArray(policy.keyPoints),
        suggestedQuestions: this.readStringArray(policy.suggestedQuestions),
      },
      relatedPolicies: relatedPolicies.map((relatedPolicy) =>
        this.toPolicyResponse(relatedPolicy),
      ),
    };
  }

  async reanalyzePolicy(id: string, body: Record<string, unknown>) {
    const requestedBy =
      this.normalizeOptionalString(body.requestedBy) ?? 'John Dela Cruz';

    const policy = await this.findPolicyById(id);

    if (!policy) {
      throw new NotFoundException(`Policy ${id} was not found.`);
    }

    const analyzedPolicy = await this.persistPolicyAnalysis(
      policy.id,
      requestedBy,
      true,
    );

    return {
      data: this.toPolicyResponse(analyzedPolicy),
      message: 'Policy analysis refreshed successfully.',
    };
  }

  private findPolicyById(id: string) {
    return this.prisma.policy.findUnique({
      where: { id },
      include: policyInclude,
    });
  }

  private toPolicyResponse(policy: PolicyWithCategory) {
    return {
      id: policy.id,
      title: policy.title,
      description: policy.description,
      fileName: policy.fileName,
      filePath: policy.filePath,
      fileType: policy.fileType,
      department: policy.department,
      type: policy.type,
      status: policy.status,
      version: policy.version,
      isActive: policy.isActive,
      createdAt: policy.createdAt,
      updatedAt: policy.updatedAt,
      createdBy: policy.createdBy,
      category: policy.category,
      analysisStatus: policy.analysisStatus,
      analysisProvider: policy.analysisProvider,
      analysisModel: policy.analysisModel,
      analysisError: policy.analysisError,
      analysisRequestedAt: policy.analysisRequestedAt,
      analysisCompletedAt: policy.analysisCompletedAt,
      summaryShort: policy.summaryShort,
      summaryLong: policy.summaryLong,
      keyPoints: this.readStringArray(policy.keyPoints),
      suggestedQuestions: this.readStringArray(policy.suggestedQuestions),
    };
  }

  private async ensurePolicyContent(policy: PolicyWithCategory) {
    if (policy.content) {
      return policy;
    }

    let extractedContent: string | null = null;

    if (this.storage.isStorageFilePath(policy.filePath)) {
      try {
        const buffer = await this.storage.downloadFile(policy.filePath);
        extractedContent = await this.policyContentExtractor.extractFromBuffer(
          buffer,
          policy.fileType,
          policy.fileName,
        );
      } catch {
        extractedContent = null;
      }
    } else {
      extractedContent = await this.policyContentExtractor.extractFromStoredFile(
        policy.filePath,
        policy.fileType,
      );
    }

    if (!extractedContent) {
      return policy;
    }

    return this.prisma.policy.update({
      where: { id: policy.id },
      data: {
        content: extractedContent,
      },
      include: policyInclude,
    });
  }

  private resolveLegacyLocalPath(filePath: string) {
    const normalizedPath = filePath.replace(/^\/+/, '');
    const candidates = [
      join(process.cwd(), normalizedPath),
      join(process.cwd(), 'apps', 'backend', normalizedPath),
    ];

    return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
  }

  private async persistPolicyAnalysis(
    policyId: string,
    requestedBy: string,
    refreshRequestedAt = false,
  ) {
    const foundPolicy = await this.findPolicyById(policyId);

    if (!foundPolicy) {
      throw new NotFoundException(`Policy ${policyId} was not found.`);
    }

    const policy = await this.ensurePolicyContent(foundPolicy);

    const requestedAt = new Date();

    await this.prisma.policy.update({
      where: { id: policy.id },
      data: {
        analysisStatus: PolicyAnalysisStatus.IN_PROGRESS,
        analysisRequestedAt: refreshRequestedAt ? requestedAt : policy.analysisRequestedAt ?? requestedAt,
        analysisCompletedAt: null,
        analysisError: null,
      },
    });

    try {
      const analysis = await this.policyAnalysisService.analyzePolicy({
        id: policy.id,
        title: policy.title,
        description: policy.description,
        department: policy.department,
        type: policy.type,
        status: policy.status,
        createdBy: policy.createdBy,
        categoryName: policy.category?.name ?? null,
        content: policy.content,
      });

      return this.prisma.policy.update({
        where: { id: policy.id },
        data: {
          analysisStatus: PolicyAnalysisStatus.COMPLETED,
          analysisProvider: analysis.analysisProvider,
          analysisModel: analysis.analysisModel,
          analysisError: null,
          analysisCompletedAt: new Date(),
          summaryShort: analysis.summaryShort,
          summaryLong: analysis.summaryLong,
          keyPoints: analysis.keyPoints,
          suggestedQuestions: analysis.suggestedQuestions,
        },
        include: policyInclude,
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Policy analysis failed.';

      const failedPolicy = await this.prisma.policy.update({
        where: { id: policy.id },
        data: {
          analysisStatus: PolicyAnalysisStatus.FAILED,
          analysisProvider: null,
          analysisModel: null,
          analysisError: message,
          analysisCompletedAt: null,
        },
        include: policyInclude,
      });

      return failedPolicy;
    }
  }

  private readStringArray(value: Prisma.JsonValue | null) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((item): item is string => typeof item === 'string');
  }

  private parsePositiveInt(value: string | undefined, fallback: number) {
    const parsed = Number.parseInt(value ?? '', 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private parsePolicyStatus(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return PolicyStatus.DRAFT;
    }

    if (!Object.values(PolicyStatus).includes(value as PolicyStatus)) {
      throw new BadRequestException(
        'status must be DRAFT, UNDER_REVIEW, PUBLISHED, or ARCHIVED.',
      );
    }

    return value as PolicyStatus;
  }

  private parseOptionalPolicyStatus(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    return this.parsePolicyStatus(value);
  }

  private parsePolicyDocumentType(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return PolicyDocumentType.POLICY;
    }

    if (!Object.values(PolicyDocumentType).includes(value as PolicyDocumentType)) {
      throw new BadRequestException(
        'type must be POLICY, GUIDELINE, or PROCEDURE.',
      );
    }

    return value as PolicyDocumentType;
  }

  private readRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${fieldName} is required.`);
    }

    return value.trim();
  }

  private normalizeOptionalString(value: unknown) {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new BadRequestException(
          'A policy with the same unique value already exists.',
        );
      }
    }

    throw error;
  }
}

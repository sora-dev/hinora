import {
  BadRequestException,
  ForbiddenException,
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
import { PolicyAssignmentsService } from '../policy-assignments/policy-assignments.service';
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
    private readonly policyAssignments: PolicyAssignmentsService,
  ) {}

  async listPolicies(query: ListPoliciesQuery, actorUserId?: string) {
    const page = this.parsePositiveInt(query.page, 1);
    const pageSize = this.parsePositiveInt(query.pageSize, 10);
    const search = this.normalizeOptionalString(query.search);
    const categoryId = this.normalizeOptionalString(query.categoryId);
    const status = this.parseOptionalPolicyStatus(query.status);
    const assignedPolicyIds = await this.resolveAssignedPolicyIds(
      query,
      actorUserId,
    );

    if (assignedPolicyIds && assignedPolicyIds.length === 0) {
      const categories = await this.prisma.category.findMany({
        select: {
          id: true,
          name: true,
          code: true,
        },
        orderBy: [{ name: 'asc' }],
      });

      return {
        data: [],
        stats: {
          totalPolicies: 0,
          publishedPolicies: 0,
          draftPolicies: 0,
          underReviewPolicies: 0,
        },
        categoryCounts: {} as Record<string, number>,
        filters: {
          categories,
          statuses: Object.values(PolicyStatus),
        },
        pagination: {
          page,
          pageSize,
          total: 0,
          totalPages: 1,
        },
      };
    }

    const assignedWhere: Prisma.PolicyWhereInput = assignedPolicyIds
      ? { id: { in: assignedPolicyIds } }
      : {};

    const where: Prisma.PolicyWhereInput = {
      AND: [
        assignedWhere,
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

    const [policies, total, scopedPolicies, categories] = await Promise.all([
      this.prisma.policy.findMany({
        where,
        include: policyInclude,
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.policy.count({ where }),
      this.prisma.policy.findMany({
        where: assignedWhere,
        select: {
          status: true,
          categoryId: true,
        },
      }),
      this.prisma.category.findMany({
        select: {
          id: true,
          name: true,
          code: true,
        },
        orderBy: [{ name: 'asc' }],
      }),
    ]);

    const categoryCounts = scopedPolicies.reduce<Record<string, number>>(
      (counts, policy) => {
        if (!policy.categoryId) {
          return counts;
        }

        counts[policy.categoryId] = (counts[policy.categoryId] ?? 0) + 1;
        return counts;
      },
      {},
    );

    return {
      data: policies.map((policy) => this.toPolicyResponse(policy)),
      stats: {
        totalPolicies: scopedPolicies.length,
        publishedPolicies: scopedPolicies.filter(
          (policy) => policy.status === PolicyStatus.PUBLISHED,
        ).length,
        draftPolicies: scopedPolicies.filter(
          (policy) => policy.status === PolicyStatus.DRAFT,
        ).length,
        underReviewPolicies: scopedPolicies.filter(
          (policy) => policy.status === PolicyStatus.UNDER_REVIEW,
        ).length,
      },
      categoryCounts,
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

  async updatePolicy(
    id: string,
    file: Express.Multer.File | undefined,
    body: Record<string, unknown>,
  ) {
    const existing = await this.findPolicyById(id);

    if (!existing) {
      throw new NotFoundException(`Policy ${id} was not found.`);
    }

    if (file && !file.buffer?.length) {
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
    const updatedBy =
      this.normalizeOptionalString(body.updatedBy) ??
      this.normalizeOptionalString(body.createdBy) ??
      'Admin User';

    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category ${categoryId} was not found.`);
    }

    const data: Prisma.PolicyUncheckedUpdateInput = {
      title,
      description,
      department,
      type,
      status,
      categoryId,
      version: existing.version,
      isActive: status !== PolicyStatus.ARCHIVED,
    };

    if (file) {
      const uploaded = await this.storage.uploadPolicyFile(file);
      const extractedContent =
        await this.policyContentExtractor.extractFromUploadedFile(file);
      data.version = existing.version + 1;
      data.fileName = file.originalname;
      data.filePath = uploaded.filePath;
      data.fileType = file.mimetype;
      data.content = extractedContent;
      data.analysisStatus = PolicyAnalysisStatus.IN_PROGRESS;
      data.analysisProvider = null;
      data.analysisModel = null;
      data.analysisError = null;
      data.analysisRequestedAt = new Date();
      data.analysisCompletedAt = null;
    }

    try {
      const updatedPolicy = await this.prisma.policy.update({
        where: { id },
        data,
        include: policyInclude,
      });

      if (file) {
        const analyzed = await this.persistPolicyAnalysis(
          updatedPolicy.id,
          updatedBy,
          true,
        );

        return {
          data: this.toPolicyResponse(analyzed),
        };
      }

      return {
        data: this.toPolicyResponse(updatedPolicy),
      };
    } catch (error: unknown) {
      this.handlePrismaError(error);
    }
  }

  async getPolicyFile(
    id: string,
    query: ListPoliciesQuery = {},
    actorUserId?: string,
  ) {
    await this.assertLibraryAccess(id, query, actorUserId);
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

  async getPolicyById(
    id: string,
    query: ListPoliciesQuery = {},
    actorUserId?: string,
  ) {
    const assignedPolicyIds = await this.assertLibraryAccess(
      id,
      query,
      actorUserId,
    );
    const foundPolicy = await this.findPolicyById(id);

    if (!foundPolicy) {
      throw new NotFoundException(`Policy ${id} was not found.`);
    }

    const policy = await this.ensurePolicyContent(foundPolicy);

    const relatedPolicies = await this.prisma.policy.findMany({
      where: {
        AND: [
          { id: { not: policy.id } },
          assignedPolicyIds ? { id: { in: assignedPolicyIds } } : {},
          { categoryId: policy.categoryId ?? undefined },
          { status: PolicyStatus.PUBLISHED },
        ],
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

  private isAssignedLibraryQuery(query: ListPoliciesQuery) {
    const flag = (
      query.assignedToMe ??
      query.visibility ??
      ''
    ).toLowerCase();

    return flag === '1' || flag === 'true' || flag === 'assigned';
  }

  private async resolveAssignedPolicyIds(
    query: ListPoliciesQuery,
    actorUserId?: string,
  ) {
    if (!this.isAssignedLibraryQuery(query)) {
      return null;
    }

    const userId =
      this.normalizeOptionalString(actorUserId) ??
      this.normalizeOptionalString(query.userId);

    if (!userId) {
      return [];
    }

    return this.policyAssignments.assignedPolicyIdsForUser(userId);
  }

  private async assertLibraryAccess(
    policyId: string,
    query: ListPoliciesQuery,
    actorUserId?: string,
  ) {
    const assignedPolicyIds = await this.resolveAssignedPolicyIds(
      query,
      actorUserId,
    );

    if (!assignedPolicyIds) {
      return null;
    }

    if (!assignedPolicyIds.includes(policyId)) {
      throw new ForbiddenException('This policy is not assigned to you.');
    }

    return assignedPolicyIds;
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

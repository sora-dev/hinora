import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReadingProgressService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(query: Record<string, unknown>) {
    const userId = await this.resolveUserId(query);
    const limit = this.readOptionalPositiveInt(query.limit) ?? 10;

    const rows = await this.prisma.policyReadingProgress.findMany({
      where: { userId },
      include: {
        policy: {
          select: {
            id: true,
            title: true,
            department: true,
            type: true,
            status: true,
            fileName: true,
            category: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
      orderBy: { lastAccessedAt: 'desc' },
      take: limit,
    });

    return {
      data: rows.map((row) => this.toProgressRecord(row)),
    };
  }

  async getForUserPolicy(policyId: string, query: Record<string, unknown>) {
    const userId = await this.resolveUserId(query);
    await this.assertPolicyExists(policyId);

    const row = await this.prisma.policyReadingProgress.findUnique({
      where: {
        userId_policyId: {
          userId,
          policyId,
        },
      },
      include: {
        policy: {
          select: {
            id: true,
            title: true,
            department: true,
            type: true,
            status: true,
            fileName: true,
            category: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    });

    if (!row) {
      return {
        data: null,
      };
    }

    return {
      data: this.toProgressRecord(row),
    };
  }

  async upsertProgress(body: Record<string, unknown>) {
    const userId = await this.resolveUserId(body);
    const policyId = this.readRequiredString(body.policyId, 'policyId');
    const progressPercent = this.readBoundedInt(
      body.progressPercent,
      'progressPercent',
      0,
      100,
    );
    const pagesViewed = this.readBoundedInt(body.pagesViewed, 'pagesViewed', 0, 500);
    const scrollDepthPercent = this.readBoundedInt(
      body.scrollDepthPercent,
      'scrollDepthPercent',
      0,
      100,
    );
    const timeSpentSeconds = this.readBoundedInt(
      body.timeSpentSeconds,
      'timeSpentSeconds',
      0,
      60 * 60 * 24 * 30,
    );

    await this.assertPolicyExists(policyId);

    const existing = await this.prisma.policyReadingProgress.findUnique({
      where: {
        userId_policyId: {
          userId,
          policyId,
        },
      },
    });

    const nextProgress = Math.max(existing?.progressPercent ?? 0, progressPercent);
    const nextPages = Math.max(existing?.pagesViewed ?? 0, pagesViewed);
    const nextScroll = Math.max(existing?.scrollDepthPercent ?? 0, scrollDepthPercent);
    const nextTime = Math.max(existing?.timeSpentSeconds ?? 0, timeSpentSeconds);
    const completedAt =
      nextProgress >= 100
        ? (existing?.completedAt ?? new Date())
        : existing?.completedAt ?? null;

    const row = await this.prisma.policyReadingProgress.upsert({
      where: {
        userId_policyId: {
          userId,
          policyId,
        },
      },
      create: {
        userId,
        policyId,
        progressPercent: nextProgress,
        pagesViewed: nextPages,
        scrollDepthPercent: nextScroll,
        timeSpentSeconds: nextTime,
        lastAccessedAt: new Date(),
        completedAt,
      },
      update: {
        progressPercent: nextProgress,
        pagesViewed: nextPages,
        scrollDepthPercent: nextScroll,
        timeSpentSeconds: nextTime,
        lastAccessedAt: new Date(),
        completedAt,
      },
      include: {
        policy: {
          select: {
            id: true,
            title: true,
            department: true,
            type: true,
            status: true,
            fileName: true,
            category: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        },
      },
    });

    return {
      data: this.toProgressRecord(row),
    };
  }

  private toProgressRecord(row: {
    id: string;
    userId: string;
    policyId: string;
    progressPercent: number;
    pagesViewed: number;
    scrollDepthPercent: number;
    timeSpentSeconds: number;
    lastAccessedAt: Date;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    policy: {
      id: string;
      title: string;
      department: string;
      type: string;
      status: string;
      fileName: string;
      category: {
        id: string;
        name: string;
        color: string;
      } | null;
    };
  }) {
    return {
      id: row.id,
      userId: row.userId,
      policyId: row.policyId,
      progressPercent: row.progressPercent,
      pagesViewed: row.pagesViewed,
      scrollDepthPercent: row.scrollDepthPercent,
      timeSpentSeconds: row.timeSpentSeconds,
      lastAccessedAt: row.lastAccessedAt,
      completedAt: row.completedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      policy: row.policy,
    };
  }

  private async resolveUserId(input: Record<string, unknown>) {
    const userId =
      typeof input.userId === 'string' && input.userId.trim()
        ? input.userId.trim()
        : undefined;
    const email =
      typeof input.email === 'string' && input.email.trim()
        ? input.email.trim().toLowerCase()
        : undefined;

    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        throw new NotFoundException(`User ${userId} was not found.`);
      }

      return user.id;
    }

    if (email) {
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

      if (!user) {
        throw new NotFoundException(`User ${email} was not found.`);
      }

      return user.id;
    }

    throw new BadRequestException('userId or email is required.');
  }

  private async assertPolicyExists(policyId: string) {
    const policy = await this.prisma.policy.findUnique({
      where: { id: policyId },
      select: { id: true },
    });

    if (!policy) {
      throw new NotFoundException(`Policy ${policyId} was not found.`);
    }
  }

  private readRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${fieldName} is required.`);
    }

    return value.trim();
  }

  private readOptionalPositiveInt(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    const parsed = typeof value === 'number' ? value : Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException('limit must be a positive integer.');
    }

    return parsed;
  }

  private readBoundedInt(
    value: unknown,
    fieldName: string,
    min: number,
    max: number,
  ) {
    const parsed = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      throw new BadRequestException(`${fieldName} must be an integer.`);
    }

    if (parsed < min || parsed > max) {
      throw new BadRequestException(
        `${fieldName} must be between ${min} and ${max}.`,
      );
    }

    return parsed;
  }
}

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  AuditAction,
  AuditEventStatus,
  Prisma,
  UserActivityKind,
  UserActivityStatus,
} from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { describeAuditEvent, shouldSkipAudit } from './audit.mapper';

type RequestWithFile = Request & {
  file?: { originalname?: string };
};

const actorHeaderNames = {
  userId: 'x-hinora-user-id',
  email: 'x-hinora-user-email',
  name: 'x-hinora-user-name',
};

const userTones = [
  'bg-blue-100 text-[var(--color-active-menu)]',
  'bg-violet-100 text-violet-700',
  'bg-sky-100 text-sky-700',
  'bg-amber-100 text-amber-700',
  'bg-slate-100 text-slate-600',
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-600',
];

@Injectable()
export class AuditService implements OnModuleInit {
  private readonly logger = new Logger(AuditService.name);
  private backfillStarted = false;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    void this.backfillFromUserActivity();
  }

  async recordFromRequest(request: RequestWithFile, result: unknown, error: unknown) {
    const path = this.requestPath(request);
    const method = (request.method || 'GET').toUpperCase();
    if (shouldSkipAudit(method, path)) {
      return null;
    }

    const event = describeAuditEvent({
      method,
      path,
      body: this.requestBody(request),
      file: request.file,
      result,
      error,
    });

    const actor = await this.resolveActor(request, result);
    const resource =
      !event.resource || /^[0-9a-f-]{36}$/i.test(event.resource)
        ? actor.userName
        : event.resource;
    return this.record({
      ...event,
      resource,
      ...actor,
      ipAddress: this.clientIp(request),
    });
  }

  async recordClientEvent(
    request: Request,
    body: Record<string, unknown>,
  ) {
    const action = this.parseAction(body.action) ?? AuditAction.UPDATE;
    const actor = await this.resolveActor(request, null);

    return this.record({
      action,
      module: this.readString(body.module) || 'System',
      resourceType: this.readString(body.resourceType) || 'Resource',
      resource: this.readString(body.resource),
      details: this.readString(body.details) || this.defaultDetails(action),
      status: this.parseStatus(body.status) ?? AuditEventStatus.SUCCESS,
      ...actor,
      ipAddress: this.clientIp(request),
    });
  }

  async list(query: Record<string, string | undefined>) {
    await this.backfillFromUserActivity();

    const page = this.parsePositiveInt(query.page, 1);
    const pageSize = Math.min(this.parsePositiveInt(query.pageSize, 10), 100);
    const exportAll = query.export === '1' || query.export === 'true';
    const where = this.buildWhere(query);
    const statsWhere = this.buildWhere({ ...query, search: undefined });

    const [rows, total, successCount, failedCount, uniqueUsers, filterUsers, filterModules, filterTypes] =
      await Promise.all([
        this.prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: exportAll ? 0 : (page - 1) * pageSize,
          take: exportAll ? 5000 : pageSize,
        }),
        this.prisma.auditLog.count({ where }),
        this.prisma.auditLog.count({
          where: { ...statsWhere, status: AuditEventStatus.SUCCESS },
        }),
        this.prisma.auditLog.count({
          where: { ...statsWhere, status: AuditEventStatus.FAILED },
        }),
        this.prisma.auditLog.findMany({
          where: statsWhere,
          distinct: ['userName'],
          select: { userName: true },
        }),
        this.prisma.auditLog.findMany({
          distinct: ['userName'],
          select: { userName: true },
          orderBy: { userName: 'asc' },
        }),
        this.prisma.auditLog.findMany({
          distinct: ['module'],
          select: { module: true },
          orderBy: { module: 'asc' },
        }),
        this.prisma.auditLog.findMany({
          distinct: ['resourceType'],
          select: { resourceType: true },
          orderBy: { resourceType: 'asc' },
        }),
      ]);

    return {
      items: rows.map((row) => this.serialize(row)),
      total,
      page,
      pageSize: exportAll ? rows.length : pageSize,
      stats: {
        total: successCount + failedCount,
        uniqueUsers: uniqueUsers.length,
        success: successCount,
        failed: failedCount,
      },
      filters: {
        users: filterUsers.map((row) => row.userName).filter(Boolean),
        modules: filterModules.map((row) => row.module).filter(Boolean),
        resourceTypes: filterTypes.map((row) => row.resourceType).filter(Boolean),
      },
    };
  }

  async record(input: {
    userId?: string | null;
    userName: string;
    userInitials: string;
    action: AuditAction;
    module: string;
    resourceType: string;
    resource: string;
    details: string;
    ipAddress: string;
    status: AuditEventStatus;
    createdAt?: Date;
  }) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          userId: input.userId || null,
          userName: input.userName || 'System',
          userInitials: input.userInitials || this.initials(input.userName),
          action: input.action,
          module: input.module,
          resourceType: input.resourceType,
          resource: input.resource,
          details: input.details,
          ipAddress: input.ipAddress,
          status: input.status,
          createdAt: input.createdAt,
        },
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Unable to write audit log: ${message}`);
      return null;
    }
  }

  private async backfillFromUserActivity() {
    if (this.backfillStarted) {
      return;
    }
    this.backfillStarted = true;

    try {
      const activities = await this.prisma.userActivity.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (activities.length === 0) {
        return;
      }

      const existing = await this.prisma.auditLog.findMany({
        where: {
          createdAt: {
            gte: activities[0].createdAt,
            lte: activities[activities.length - 1].createdAt,
          },
        },
        select: { userId: true, createdAt: true, action: true },
      });

      const data = activities.flatMap((activity) => {
        const mapped = this.fromUserActivity(activity);
        const alreadyLogged = existing.some(
          (row) =>
            row.userId === mapped.userId &&
            row.action === mapped.action &&
            Math.abs(row.createdAt.getTime() - activity.createdAt.getTime()) <
              60_000,
        );
        if (alreadyLogged) {
          return [];
        }
        existing.push({
          userId: mapped.userId,
          createdAt: activity.createdAt,
          action: mapped.action,
        });
        return [mapped];
      });

      if (data.length === 0) {
        return;
      }

      await this.prisma.auditLog.createMany({ data });
    } catch (error: unknown) {
      this.backfillStarted = false;
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Unable to backfill audit logs: ${message}`);
    }
  }

  private fromUserActivity(activity: {
    userId: string;
    kind: UserActivityKind;
    title: string;
    description: string;
    status: UserActivityStatus;
    ipAddress: string;
    createdAt: Date;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  }) {
    const userName = `${activity.user.firstName} ${activity.user.lastName}`.trim();
    const mapping = this.activityMapping(activity.kind);

    return {
      userId: activity.userId,
      userName: userName || activity.user.email,
      userInitials: this.initials(userName || activity.user.email),
      action: mapping.action,
      module: mapping.module,
      resourceType: mapping.resourceType,
      resource: activity.user.email,
      details: activity.description || mapping.details,
      ipAddress: activity.ipAddress,
      status:
        activity.status === UserActivityStatus.FAILED
          ? AuditEventStatus.FAILED
          : AuditEventStatus.SUCCESS,
      createdAt: activity.createdAt,
    };
  }

  private activityMapping(kind: UserActivityKind) {
    if (kind === UserActivityKind.LOGIN) {
      return {
        action: AuditAction.LOGIN,
        module: 'Authentication',
        resourceType: 'Session',
        details: 'User logged in',
      };
    }
    if (kind === UserActivityKind.FAILED_LOGIN) {
      return {
        action: AuditAction.FAILED_LOGIN,
        module: 'Authentication',
        resourceType: 'Session',
        details: 'Invalid credentials',
      };
    }
    if (kind === UserActivityKind.LOGOUT) {
      return {
        action: AuditAction.LOGOUT,
        module: 'Authentication',
        resourceType: 'Session',
        details: 'User logged out',
      };
    }
    if (kind === UserActivityKind.PASSWORD) {
      return {
        action: AuditAction.UPDATE,
        module: 'Users',
        resourceType: 'User',
        details: 'Password changed',
      };
    }
    if (kind === UserActivityKind.PROFILE) {
      return {
        action: AuditAction.UPDATE,
        module: 'Users',
        resourceType: 'User',
        details: 'Profile updated',
      };
    }
    if (kind === UserActivityKind.DEVICE) {
      return {
        action: AuditAction.UPDATE,
        module: 'Authentication',
        resourceType: 'Session',
        details: 'Device session changed',
      };
    }
    return {
      action: AuditAction.EXPORT,
      module: 'Reports',
      resourceType: 'Report',
      details: 'Account activity exported',
    };
  }

  private buildWhere(query: Record<string, string | undefined>): Prisma.AuditLogWhereInput {
    const from = this.parseDate(query.from, false);
    const to = this.parseDate(query.to, true);
    const action = this.parseAction(query.action);
    const status = this.parseStatus(query.status);
    const search = this.readString(query.search);
    const user = this.readString(query.user);
    const module = this.readString(query.module);
    const resourceType = this.readString(query.resourceType);
    const resource = this.readString(query.resource);
    const ipAddress = this.readString(query.ipAddress);

    return {
      AND: [
        from || to
          ? {
              createdAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {}),
              },
            }
          : {},
        action ? { action } : {},
        status ? { status } : {},
        user ? { userName: user } : {},
        module ? { module } : {},
        resourceType ? { resourceType } : {},
        resource ? { resource: { contains: resource, mode: 'insensitive' } } : {},
        ipAddress ? { ipAddress: { contains: ipAddress } } : {},
        search
          ? {
              OR: [
                { userName: { contains: search, mode: 'insensitive' } },
                { resource: { contains: search, mode: 'insensitive' } },
                { details: { contains: search, mode: 'insensitive' } },
                { module: { contains: search, mode: 'insensitive' } },
                { resourceType: { contains: search, mode: 'insensitive' } },
                { ipAddress: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {},
      ],
    };
  }

  private serialize(row: {
    id: string;
    createdAt: Date;
    userName: string;
    userInitials: string;
    action: AuditAction;
    module: string;
    resourceType: string;
    resource: string;
    details: string;
    ipAddress: string;
    status: AuditEventStatus;
  }) {
    return {
      id: row.id,
      at: row.createdAt.toISOString(),
      user: {
        name: row.userName,
        initials: row.userInitials || this.initials(row.userName),
        tone: this.toneFor(row.userName),
      },
      action: this.toClientAction(row.action),
      module: row.module,
      resourceType: row.resourceType,
      resource: row.resource,
      details: row.details,
      ipAddress: row.ipAddress,
      status: row.status === AuditEventStatus.FAILED ? 'Failed' : 'Success',
    };
  }

  private async resolveActor(request: Request, result: unknown) {
    const body = this.requestBody(request);
    const resultRecord =
      result && typeof result === 'object' && !Array.isArray(result)
        ? (result as Record<string, unknown>)
        : null;
    const resultUser =
      resultRecord?.user && typeof resultRecord.user === 'object'
        ? (resultRecord.user as Record<string, unknown>)
        : null;

    const headerUserId = this.readHeader(request, actorHeaderNames.userId);
    const headerEmail = this.readHeader(request, actorHeaderNames.email);
    const headerName = this.readHeader(request, actorHeaderNames.name);

    const userId = this.readString(
      headerUserId || resultUser?.id || body.userId,
    );
    const email = this.readString(
      headerEmail || resultUser?.email || body.email,
    ).toLowerCase();
    const named = this.readString(
      headerName || resultUser?.fullName || resultUser?.name,
    );

    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, firstName: true, lastName: true },
      });
      if (user) {
        const userName =
          named || `${user.firstName} ${user.lastName}`.trim() || user.email;
        return {
          userId: user.id,
          userName,
          userInitials: this.initials(userName),
        };
      }
    }

    if (email) {
      const user = await this.prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, firstName: true, lastName: true },
      });
      if (user) {
        const userName =
          named || `${user.firstName} ${user.lastName}`.trim() || user.email;
        return {
          userId: user.id,
          userName,
          userInitials: this.initials(userName),
        };
      }

      return {
        userId: null,
        userName: named || email,
        userInitials: this.initials(named || email),
      };
    }

    if (named) {
      return {
        userId: null,
        userName: named,
        userInitials: this.initials(named),
      };
    }

    return {
      userId: null,
      userName: 'System',
      userInitials: 'SY',
    };
  }

  private requestPath(request: Request) {
    const raw = (request.path || request.url || '/').split('?')[0] ?? '/';
    return raw.replace(/\/+$/, '') || '/';
  }

  private requestBody(request: Request): Record<string, unknown> {
    return request.body && typeof request.body === 'object' && !Array.isArray(request.body)
      ? (request.body as Record<string, unknown>)
      : {};
  }

  private clientIp(request: Request) {
    const forwarded = this.readHeader(request, 'x-forwarded-for');
    const raw = forwarded
      ? forwarded.split(',')[0]?.trim() || ''
      : this.readHeader(request, 'x-real-ip') ||
        request.ip ||
        request.socket?.remoteAddress ||
        '';
    return raw.replace(/^::ffff:/, '');
  }

  private readHeader(request: Request, name: string) {
    const value = request.headers[name] ?? request.headers[name.toLowerCase()];
    if (Array.isArray(value)) {
      return value[0]?.trim() ?? '';
    }
    return value?.trim() ?? '';
  }

  private parseAction(value: unknown): AuditAction | undefined {
    const raw = this.readString(value).toUpperCase().replace(/\s+/g, '_');
    if (!raw) return undefined;
    return (Object.values(AuditAction) as string[]).includes(raw)
      ? (raw as AuditAction)
      : undefined;
  }

  private parseStatus(value: unknown): AuditEventStatus | undefined {
    const raw = this.readString(value).toUpperCase();
    if (raw === 'SUCCESS' || raw === 'FAILED') {
      return raw as AuditEventStatus;
    }
    if (raw === 'SUCCESSFUL') return AuditEventStatus.SUCCESS;
    return undefined;
  }

  private parseDate(value: string | undefined, endOfDay: boolean) {
    const text = this.readString(value);
    if (!text) return undefined;
    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return undefined;
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      if (endOfDay) {
        date.setHours(23, 59, 59, 999);
      } else {
        date.setHours(0, 0, 0, 0);
      }
    }
    return date;
  }

  private parsePositiveInt(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private readString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : '';
  }

  private toClientAction(action: AuditAction) {
    return action === AuditAction.FAILED_LOGIN ? 'FAILED LOGIN' : action;
  }

  private defaultDetails(action: AuditAction) {
    if (action === AuditAction.EXPORT) return 'Data exported';
    if (action === AuditAction.LOGIN) return 'User logged in';
    if (action === AuditAction.LOGOUT) return 'User logged out';
    if (action === AuditAction.CREATE) return 'Record created';
    if (action === AuditAction.DELETE) return 'Record deleted';
    return 'Record updated';
  }

  private initials(name: string) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'SY';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }

  private toneFor(name: string) {
    let hash = 0;
    for (const char of name) {
      hash = (hash + char.charCodeAt(0)) % userTones.length;
    }
    return userTones[hash] ?? userTones[0];
  }
}

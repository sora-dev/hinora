import { BadRequestException, Injectable } from '@nestjs/common';
import {
  UserActivityKind,
  UserActivityStatus,
  type UserActivity,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type ActivityDeviceContext = {
  deviceName?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  location?: string;
};

type RecordActivityInput = {
  userId: string;
  kind: UserActivityKind;
  title: string;
  description: string;
  status?: UserActivityStatus;
  extra?: string;
  device?: ActivityDeviceContext;
  createdAt?: Date;
};

const kindCopy: Record<
  UserActivityKind,
  { title: string; description: string; extra: string }
> = {
  LOGIN: {
    title: 'Logged In',
    description: 'Successful login',
    extra: 'Signed in with email and password. Session created on this device.',
  },
  FAILED_LOGIN: {
    title: 'Failed Login Attempt',
    description: 'Incorrect password entered',
    extra: 'Sign-in was blocked after an incorrect password. No session was created.',
  },
  LOGOUT: {
    title: 'Logged Out',
    description: 'Signed out of this device',
    extra: 'The session on this device was ended.',
  },
  PASSWORD: {
    title: 'Password Changed',
    description: 'Account password was updated',
    extra: 'Password change completed from account security settings.',
  },
  PROFILE: {
    title: 'Profile Updated',
    description: 'Personal information was saved',
    extra: 'Profile fields were updated from the Personal Information tab.',
  },
  DEVICE: {
    title: 'Device Session Changed',
    description: 'A signed-in device was updated',
    extra: 'A device session was signed out from Devices & Sessions.',
  },
  EXPORT: {
    title: 'Data Exported',
    description: 'Account activity export prepared',
    extra: 'An activity export file was downloaded from this account.',
  },
};

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordActivityInput) {
    const copy = kindCopy[input.kind];
    try {
      return await this.prisma.userActivity.create({
        data: {
          userId: input.userId,
          kind: input.kind,
          title: input.title || copy.title,
          description: input.description || copy.description,
          status: input.status ?? UserActivityStatus.SUCCESS,
          extra: input.extra || copy.extra,
          deviceName: input.device?.deviceName?.trim() || '',
          deviceType: input.device?.deviceType?.trim() || 'desktop',
          browser: input.device?.browser?.trim() || '',
          os: input.device?.os?.trim() || '',
          ipAddress: input.device?.ipAddress?.trim() || '',
          location: input.device?.location?.trim() || '',
          createdAt: input.createdAt,
        },
      });
    } catch {
      return null;
    }
  }

  async recordKind(
    userId: string,
    kind: UserActivityKind,
    options?: {
      status?: UserActivityStatus;
      extra?: string;
      device?: ActivityDeviceContext;
      title?: string;
      description?: string;
    },
  ) {
    const copy = kindCopy[kind];
    return this.record({
      userId,
      kind,
      title: options?.title || copy.title,
      description: options?.description || copy.description,
      status: options?.status,
      extra: options?.extra,
      device: options?.device ?? (await this.latestDevice(userId)),
    });
  }

  async listForUser(userId: string) {
    if (!userId.trim()) {
      throw new BadRequestException('userId is required.');
    }

    await this.backfillFromSessions(userId);

    const rows = await this.prisma.userActivity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => this.serialize(row));
  }

  private async latestDevice(userId: string): Promise<ActivityDeviceContext | undefined> {
    const session = await this.prisma.userSession.findFirst({
      where: { userId, revokedAt: null },
      orderBy: { lastActiveAt: 'desc' },
    });
    if (!session) {
      return undefined;
    }
    return {
      deviceName: session.deviceName,
      deviceType: session.deviceType,
      browser: session.browser,
      os: session.os,
      ipAddress: session.ipAddress,
      location: session.location,
    };
  }

  private async backfillFromSessions(userId: string) {
    try {
      const sessions = await this.prisma.userSession.findMany({
        where: { userId },
        orderBy: { firstLoginAt: 'desc' },
      });
      if (sessions.length === 0) {
        return;
      }

      const existing = await this.prisma.userActivity.findMany({
        where: {
          userId,
          kind: { in: [UserActivityKind.LOGIN, UserActivityKind.LOGOUT] },
        },
        select: { kind: true, createdAt: true, deviceName: true },
      });

      const hasNearby = (
        kind: UserActivityKind,
        at: Date,
        deviceName: string,
      ) =>
        existing.some(
          (row) =>
            row.kind === kind &&
            row.deviceName === deviceName &&
            Math.abs(row.createdAt.getTime() - at.getTime()) < 60_000,
        );

      const data = sessions.flatMap((session) => {
        const device = {
          deviceName: session.deviceName,
          deviceType: session.deviceType,
          browser: session.browser,
          os: session.os,
          ipAddress: session.ipAddress,
          location: session.location,
        };
        const rows: Array<{
          userId: string;
          kind: UserActivityKind;
          title: string;
          description: string;
          status: UserActivityStatus;
          extra: string;
          deviceName: string;
          deviceType: string;
          browser: string;
          os: string;
          ipAddress: string;
          location: string;
          createdAt: Date;
        }> = [];

        if (!hasNearby(UserActivityKind.LOGIN, session.firstLoginAt, session.deviceName)) {
          rows.push({
            userId,
            kind: UserActivityKind.LOGIN,
            title: kindCopy.LOGIN.title,
            description: kindCopy.LOGIN.description,
            status: UserActivityStatus.SUCCESS,
            extra: kindCopy.LOGIN.extra,
            ...device,
            createdAt: session.firstLoginAt,
          });
        }

        if (
          session.revokedAt &&
          !hasNearby(UserActivityKind.LOGOUT, session.revokedAt, session.deviceName)
        ) {
          rows.push({
            userId,
            kind: UserActivityKind.LOGOUT,
            title: kindCopy.LOGOUT.title,
            description: kindCopy.LOGOUT.description,
            status: UserActivityStatus.SUCCESS,
            extra: kindCopy.LOGOUT.extra,
            ...device,
            createdAt: session.revokedAt,
          });
        }

        return rows;
      });

      if (data.length === 0) {
        return;
      }

      await this.prisma.userActivity.createMany({ data });
    } catch {
      return;
    }
  }

  private serialize(row: UserActivity) {
    return {
      id: row.id,
      kind: this.toClientKind(row.kind),
      title: row.title,
      description: row.description,
      status: row.status === UserActivityStatus.FAILED ? 'Failed' : 'Success',
      deviceName: row.deviceName || 'Unknown device',
      deviceType: row.deviceType || 'desktop',
      browser: row.browser,
      os: row.os,
      ip: row.ipAddress,
      location: row.location || 'Unknown location',
      extra: row.extra,
      dateValue: row.createdAt.toISOString(),
      date: this.formatDate(row.createdAt),
    };
  }

  private toClientKind(kind: UserActivityKind) {
    if (kind === UserActivityKind.FAILED_LOGIN) return 'failed_login';
    if (kind === UserActivityKind.LOGOUT) return 'logout';
    if (kind === UserActivityKind.PASSWORD) return 'password';
    if (kind === UserActivityKind.PROFILE) return 'profile';
    if (kind === UserActivityKind.DEVICE) return 'device';
    if (kind === UserActivityKind.EXPORT) return 'export';
    return 'login';
  }

  private formatDate(date: Date) {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}

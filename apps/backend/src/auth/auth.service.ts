import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RolesPermissionsService } from '../roles-permissions/roles-permissions.service';
import { DeviceInfoService } from './device-info.service';
import { ActivityService } from '../activity/activity.service';
import { UserActivityKind, UserActivityStatus } from '@prisma/client';

type RequestMeta = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly rolesPermissionsService: RolesPermissionsService,
    private readonly deviceInfoService: DeviceInfoService,
    private readonly activityService: ActivityService,
  ) {}

  async login(body: Record<string, unknown>, requestMeta: RequestMeta) {
    const email = this.readRequiredString(body.email, 'email').toLowerCase();
    const password = this.readRequiredString(body.password, 'password');

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      void this.activityService.recordKind(user.id, UserActivityKind.FAILED_LOGIN, {
        status: UserActivityStatus.FAILED,
        device: this.readDevicePayload(body, requestMeta),
      });
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (user.status === UserStatus.LOCKED) {
      throw new ForbiddenException(
        'Your account is locked. Please contact an administrator.',
      );
    }

    if (user.status === UserStatus.INACTIVE) {
      throw new ForbiddenException(
        'Your account is inactive. Please contact an administrator.',
      );
    }

    const redirectTo = await this.rolesPermissionsService.resolveLoginRedirect(
      user.roleTitle,
      user.role,
    );

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    const session = await this.captureSession(updatedUser.id, body, requestMeta);
    void this.activityService.recordKind(updatedUser.id, UserActivityKind.LOGIN, {
      device: {
        deviceName: session.deviceName,
        deviceType: session.deviceType,
        browser: session.browser,
        os: session.os,
        ipAddress: session.ipAddress,
        location: session.location,
      },
    });

    const payload = {
      sub: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
      sessionId: session.id,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
      sessionId: session.id,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        fullName: `${updatedUser.firstName} ${updatedUser.lastName}`.trim(),
        department: updatedUser.department,
        role: updatedUser.role,
        roleTitle: updatedUser.roleTitle,
        status: updatedUser.status,
        mustChangePassword: updatedUser.mustChangePassword,
        lastLoginAt: updatedUser.lastLoginAt,
      },
      redirectTo,
    };
  }

  async listSessions(query: Record<string, string | undefined>) {
    const userId = this.readRequiredField(query.userId, 'userId');
    const currentSessionId = query.sessionId?.trim() || undefined;

    const sessions = await this.prisma.userSession.findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastActiveAt: 'desc' },
    });

    const currentSession =
      sessions.find((session) => session.id === currentSessionId) ?? null;
    const otherSessions = sessions.filter(
      (session) => session.id !== currentSession?.id,
    );

    return {
      currentSession: currentSession
        ? this.serializeSession(currentSession, true)
        : null,
      otherSessions: otherSessions.map((session) =>
        this.serializeSession(session, false),
      ),
      totalDevices: sessions.length,
    };
  }

  async touchSession(body: Record<string, unknown>, requestMeta: RequestMeta) {
    const userId = this.readRequiredField(body.userId, 'userId');
    const session = await this.captureSession(userId, body, requestMeta, {
      sessionId:
        typeof body.sessionId === 'string' ? body.sessionId.trim() : undefined,
    });

    return this.serializeSession(session, true);
  }

  async revokeSession(sessionId: string, body: Record<string, unknown>) {
    const userId = this.readRequiredField(body.userId, 'userId');
    const currentSessionId =
      typeof body.sessionId === 'string' ? body.sessionId.trim() : '';

    if (sessionId === currentSessionId) {
      throw new BadRequestException(
        'Use sign out to end your current session.',
      );
    }

    const session = await this.prisma.userSession.findFirst({
      where: { id: sessionId, userId, revokedAt: null },
    });

    if (!session) {
      throw new NotFoundException('Session was not found.');
    }

    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    void this.activityService.recordKind(userId, UserActivityKind.DEVICE, {
      title: 'Signed Out a Device',
      description: `${session.deviceName} was signed out`,
      device: {
        deviceName: session.deviceName,
        deviceType: session.deviceType,
        browser: session.browser,
        os: session.os,
        ipAddress: session.ipAddress,
        location: session.location,
      },
    });

    return { ok: true };
  }

  async revokeOtherSessions(body: Record<string, unknown>) {
    const userId = this.readRequiredField(body.userId, 'userId');
    const currentSessionId = this.readRequiredField(body.sessionId, 'sessionId');

    await this.prisma.userSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        id: { not: currentSessionId },
      },
      data: { revokedAt: new Date() },
    });
    void this.activityService.recordKind(userId, UserActivityKind.DEVICE, {
      title: 'Other Devices Signed Out',
      description: 'All other signed-in devices were signed out',
    });

    return { ok: true };
  }

  async logout(body: Record<string, unknown>) {
    const userId = this.readRequiredField(body.userId, 'userId');
    const sessionId =
      typeof body.sessionId === 'string' ? body.sessionId.trim() : '';

    if (sessionId) {
      const session = await this.prisma.userSession.findFirst({
        where: { id: sessionId, userId, revokedAt: null },
      });
      await this.prisma.userSession.updateMany({
        where: { id: sessionId, userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      void this.activityService.recordKind(userId, UserActivityKind.LOGOUT, {
        device: session
          ? {
              deviceName: session.deviceName,
              deviceType: session.deviceType,
              browser: session.browser,
              os: session.os,
              ipAddress: session.ipAddress,
              location: session.location,
            }
          : undefined,
      });
    }

    return { ok: true };
  }

  async listActivity(query: Record<string, string | undefined>) {
    const userId = this.readRequiredField(query.userId, 'userId');
    return this.activityService.listForUser(userId);
  }

  async recordExport(body: Record<string, unknown>) {
    const userId = this.readRequiredField(body.userId, 'userId');
    await this.activityService.recordKind(userId, UserActivityKind.EXPORT);
    return { ok: true };
  }

  private async captureSession(
    userId: string,
    body: Record<string, unknown>,
    requestMeta: RequestMeta,
    options?: { sessionId?: string },
  ) {
    const device = this.readDevicePayload(body, requestMeta);
    const ipAddress = this.deviceInfoService.getClientIp(
      requestMeta.headers,
      requestMeta.ip,
    );
    const now = new Date();

    const existing = await this.findReusableSession(
      userId,
      options?.sessionId,
      device.fingerprint,
    );

    if (existing) {
      const location =
        existing.ipAddress === ipAddress && existing.location
          ? existing.location
          : await this.deviceInfoService.resolveLocation(ipAddress);

      return this.prisma.userSession.update({
        where: { id: existing.id },
        data: {
          fingerprint: device.fingerprint || existing.fingerprint,
          deviceName: device.deviceName,
          deviceType: device.deviceType,
          browser: device.browser,
          os: device.os,
          userAgent: device.userAgent,
          ipAddress: ipAddress || existing.ipAddress,
          location,
          lastActiveAt: now,
        },
      });
    }

    const location = await this.deviceInfoService.resolveLocation(ipAddress);

    return this.prisma.userSession.create({
      data: {
        userId,
        fingerprint: device.fingerprint,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        browser: device.browser,
        os: device.os,
        userAgent: device.userAgent,
        ipAddress,
        location,
        firstLoginAt: now,
        lastActiveAt: now,
      },
    });
  }

  private async findReusableSession(
    userId: string,
    sessionId?: string,
    fingerprint?: string,
  ) {
    if (sessionId) {
      const byId = await this.prisma.userSession.findFirst({
        where: { id: sessionId, userId, revokedAt: null },
      });
      if (byId) {
        return byId;
      }
    }

    if (fingerprint) {
      return this.prisma.userSession.findFirst({
        where: { userId, fingerprint, revokedAt: null },
        orderBy: { lastActiveAt: 'desc' },
      });
    }

    return null;
  }

  private readDevicePayload(
    body: Record<string, unknown>,
    requestMeta: RequestMeta,
  ) {
    const userAgent =
      this.readOptionalString(body.userAgent) ||
      this.readHeader(requestMeta.headers, 'user-agent');
    const parsed = this.deviceInfoService.parseUserAgent(userAgent);
    const platform = this.readOptionalString(body.platform);
    const os = this.refineOs(
      this.readOptionalString(body.os) || parsed.os,
      platform,
    );
    const deviceType =
      this.readOptionalString(body.deviceType) || parsed.deviceType;
    const deviceName =
      this.readOptionalString(body.deviceName) ||
      this.refineDeviceName(parsed.deviceName, os, deviceType);

    return {
      fingerprint: this.readOptionalString(body.fingerprint),
      userAgent,
      deviceName,
      deviceType,
      browser: this.readOptionalString(body.browser) || parsed.browser,
      os,
    };
  }

  private refineOs(os: string, platform?: string) {
    if (!platform) {
      return os;
    }
    if (/Mac/i.test(platform) && os === 'Unknown OS') {
      return 'macOS';
    }
    if (/Win/i.test(platform) && os === 'Unknown OS') {
      return 'Windows';
    }
    return os;
  }

  private refineDeviceName(deviceName: string, os: string, deviceType: string) {
    if (deviceName === 'Mac' && (deviceType === 'laptop' || os.includes('macOS'))) {
      return 'Mac (macOS)';
    }
    return deviceName;
  }

  private serializeSession(
    session: {
      id: string;
      deviceName: string;
      deviceType: string;
      browser: string;
      os: string;
      userAgent: string;
      ipAddress: string;
      location: string;
      firstLoginAt: Date;
      lastActiveAt: Date;
    },
    isCurrent: boolean,
  ) {
    return {
      id: session.id,
      deviceName: session.deviceName,
      deviceType: session.deviceType,
      browser: session.browser,
      os: session.os,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      location: session.location,
      firstLoginAt: session.firstLoginAt.toISOString(),
      lastActiveAt: session.lastActiveAt.toISOString(),
      isCurrent,
    };
  }

  private readOptionalString(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private readRequiredField(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException(`${fieldName} is required.`);
    }
    return value.trim();
  }

  private readHeader(
    headers: Record<string, string | string[] | undefined>,
    name: string,
  ) {
    const value = headers[name] ?? headers[name.toLowerCase()];
    if (Array.isArray(value)) {
      return value[0]?.trim() ?? '';
    }
    return value?.trim() ?? '';
  }

  private readRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new UnauthorizedException(`${fieldName} is required.`);
    }

    return value.trim();
  }
}

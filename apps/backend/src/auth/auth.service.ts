import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(body: Record<string, unknown>) {
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

    const redirectTo =
      user.role === Role.EMPLOYEE ? '/employee/dashboard' : '/admin/dashboard';

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    const payload = {
      sub: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
    };

    return {
      accessToken: await this.jwtService.signAsync(payload),
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
        lastLoginAt: updatedUser.lastLoginAt,
      },
      redirectTo,
    };
  }

  private readRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== 'string' || !value.trim()) {
      throw new UnauthorizedException(`${fieldName} is required.`);
    }

    return value.trim();
  }
}

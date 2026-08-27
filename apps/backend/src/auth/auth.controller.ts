import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: Record<string, unknown>, @Req() request: Request) {
    return this.authService.login(body, this.toRequestMeta(request));
  }

  @Get('activity')
  listActivity(@Query() query: Record<string, string | undefined>) {
    return this.authService.listActivity(query);
  }

  @Post('activity/export')
  recordExport(@Body() body: Record<string, unknown>) {
    return this.authService.recordExport(body);
  }

  @Get('sessions')
  listSessions(@Query() query: Record<string, string | undefined>) {
    return this.authService.listSessions(query);
  }

  @Post('sessions/touch')
  touchSession(
    @Body() body: Record<string, unknown>,
    @Req() request: Request,
  ) {
    return this.authService.touchSession(body, this.toRequestMeta(request));
  }

  @Post('sessions/revoke-others')
  revokeOtherSessions(@Body() body: Record<string, unknown>) {
    return this.authService.revokeOtherSessions(body);
  }

  @Post('sessions/:id/revoke')
  revokeSession(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.authService.revokeSession(id, body);
  }

  @Post('logout')
  logout(@Body() body: Record<string, unknown>) {
    return this.authService.logout(body);
  }

  private toRequestMeta(request: Request) {
    return {
      headers: request.headers as Record<string, string | string[] | undefined>,
      ip: request.ip || request.socket?.remoteAddress || '',
    };
  }
}

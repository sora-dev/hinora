import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuditService } from './audit.service';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@Query() query: Record<string, string | undefined>) {
    return this.auditService.list(query);
  }

  @Post()
  create(@Body() body: Record<string, unknown>, @Req() request: Request) {
    return this.auditService.recordClientEvent(request, body);
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ComplianceNotificationsService } from './compliance-notifications.service';
import { ComplianceService } from './compliance.service';

@Controller('compliance')
export class ComplianceController {
  constructor(
    private readonly complianceService: ComplianceService,
    private readonly notifications: ComplianceNotificationsService,
  ) {}

  @Get('me')
  getMine(@Headers('x-hinora-user-id') userId?: string) {
    if (!userId?.trim()) {
      throw new BadRequestException('X-Hinora-User-Id is required.');
    }
    return this.complianceService.getMine(userId);
  }

  @Post('me/acknowledge')
  acknowledgeMine(
    @Body() body: Record<string, unknown>,
    @Headers('x-hinora-user-id') userId?: string,
  ) {
    if (!userId?.trim()) {
      throw new BadRequestException('X-Hinora-User-Id is required.');
    }
    const policyId = typeof body.policyId === 'string' ? body.policyId : '';
    return this.complianceService.acknowledgeMine(userId, policyId);
  }

  @Get('summaries')
  listSummaries() {
    return this.complianceService.listSummaries();
  }

  @Get('policies/:policyId/overview')
  getOverview(@Param('policyId') policyId: string) {
    return this.complianceService.getOverview(policyId);
  }

  @Get('policies/:policyId/activity')
  getActivity(@Param('policyId') policyId: string) {
    return this.complianceService.getActivity(policyId);
  }

  @Get('policies/:policyId/employees')
  getEmployees(@Param('policyId') policyId: string) {
    return this.complianceService.getEmployees(policyId);
  }

  @Get('policies/:policyId/certificates')
  getCertificates(@Param('policyId') policyId: string) {
    return this.complianceService.getCertificates(policyId);
  }

  @Post('policies/:policyId/certificates/generate-missing')
  generateMissingCertificates(@Param('policyId') policyId: string) {
    return this.complianceService.generateMissingCertificates(policyId);
  }

  @Post('policies/:policyId/certificates/notify')
  notifyCertificates(
    @Param('policyId') policyId: string,
    @Body() body: Record<string, unknown>,
  ) {
    const userIds = Array.isArray(body.userIds)
      ? body.userIds.filter((value): value is string => typeof value === 'string')
      : undefined;
    return this.complianceService.notifyCertificates(policyId, userIds);
  }

  @Post('policies/:policyId/certificates/:userId/issue')
  issueCertificate(
    @Param('policyId') policyId: string,
    @Param('userId') userId: string,
  ) {
    return this.complianceService.issueCertificate(policyId, userId);
  }

  @Get('policies/:policyId/assessment')
  getAssessment(@Param('policyId') policyId: string) {
    return this.complianceService.getAssessment(policyId);
  }

  @Get('policies/:policyId/notifications')
  getNotifications(@Param('policyId') policyId: string) {
    return this.notifications.getForPolicy(policyId);
  }

  @Post('policies/:policyId/notifications/send')
  sendNotification(
    @Param('policyId') policyId: string,
    @Body() body: Record<string, unknown>,
    @Headers('x-hinora-user-id') userId?: string,
  ) {
    return this.notifications.sendNow(policyId, body ?? {}, userId);
  }

  @Post('policies/:policyId/notifications/rules')
  createNotificationRule(
    @Param('policyId') policyId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.notifications.createRule(policyId, body ?? {});
  }

  @Patch('policies/:policyId/notifications/rules/:ruleId')
  updateNotificationRule(
    @Param('policyId') policyId: string,
    @Param('ruleId') ruleId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.notifications.updateRule(policyId, ruleId, body ?? {});
  }

  @Delete('policies/:policyId/notifications/rules/:ruleId')
  deleteNotificationRule(
    @Param('policyId') policyId: string,
    @Param('ruleId') ruleId: string,
  ) {
    return this.notifications.deleteRule(policyId, ruleId);
  }
}

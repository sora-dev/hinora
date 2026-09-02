import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PolicyAssignmentsModule } from '../policy-assignments/policy-assignments.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ComplianceController } from './compliance.controller';
import { ComplianceNotificationsService } from './compliance-notifications.service';
import { ComplianceService } from './compliance.service';

@Module({
  imports: [PrismaModule, PolicyAssignmentsModule, NotificationsModule],
  controllers: [ComplianceController],
  providers: [ComplianceService, ComplianceNotificationsService],
  exports: [ComplianceService, ComplianceNotificationsService],
})
export class ComplianceModule {}

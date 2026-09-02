import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PolicyAssignmentsController } from './policy-assignments.controller';
import { PolicyAssignmentsService } from './policy-assignments.service';

@Module({
  imports: [NotificationsModule],
  controllers: [PolicyAssignmentsController],
  providers: [PolicyAssignmentsService],
  exports: [PolicyAssignmentsService],
})
export class PolicyAssignmentsModule {}

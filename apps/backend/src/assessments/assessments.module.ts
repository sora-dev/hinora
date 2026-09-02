import { Module } from '@nestjs/common';
import { PolicyAssignmentsModule } from '../policy-assignments/policy-assignments.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';

@Module({
  imports: [PrismaModule, PolicyAssignmentsModule],
  controllers: [AssessmentsController],
  providers: [AssessmentsService],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}

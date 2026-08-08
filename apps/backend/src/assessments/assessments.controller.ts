import { Body, Controller, Delete, Get, Param, Put } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';

@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get()
  listAssessments() {
    return this.assessmentsService.listAssessments();
  }

  @Get('policy/:policyId')
  getAssessmentForPolicy(@Param('policyId') policyId: string) {
    return this.assessmentsService.getAssessmentForPolicy(policyId);
  }

  @Put('policy/:policyId')
  saveAssessmentForPolicy(
    @Param('policyId') policyId: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.assessmentsService.saveAssessmentForPolicy(policyId, body);
  }

  @Delete('policy/:policyId')
  deleteAssessmentForPolicy(@Param('policyId') policyId: string) {
    return this.assessmentsService.deleteAssessmentForPolicy(policyId);
  }
}

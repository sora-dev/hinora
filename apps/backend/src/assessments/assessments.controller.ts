import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { AssessmentsService } from './assessments.service';

@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get()
  listAssessments() {
    return this.assessmentsService.listAssessments();
  }

  @Get('policy/:policyId/take')
  getTakeForPolicy(
    @Param('policyId') policyId: string,
    @Headers('x-hinora-user-id') userId?: string,
  ) {
    if (!userId?.trim()) {
      throw new BadRequestException('X-Hinora-User-Id is required.');
    }
    return this.assessmentsService.getTakeForPolicy(policyId, userId);
  }

  @Post('policy/:policyId/submit')
  submitTakeForPolicy(
    @Param('policyId') policyId: string,
    @Headers('x-hinora-user-id') userId?: string,
    @Body() body?: Record<string, unknown>,
  ) {
    if (!userId?.trim()) {
      throw new BadRequestException('X-Hinora-User-Id is required.');
    }
    return this.assessmentsService.submitTakeForPolicy(policyId, userId, body ?? {});
  }

  @Put('policy/:policyId/draft')
  saveDraftForPolicy(
    @Param('policyId') policyId: string,
    @Headers('x-hinora-user-id') userId?: string,
    @Body() body?: Record<string, unknown>,
  ) {
    if (!userId?.trim()) {
      throw new BadRequestException('X-Hinora-User-Id is required.');
    }
    return this.assessmentsService.saveDraftForPolicy(policyId, userId, body ?? {});
  }

  @Delete('policy/:policyId/draft')
  clearDraftForPolicy(
    @Param('policyId') policyId: string,
    @Headers('x-hinora-user-id') userId?: string,
  ) {
    if (!userId?.trim()) {
      throw new BadRequestException('X-Hinora-User-Id is required.');
    }
    return this.assessmentsService.clearDraftForPolicy(policyId, userId);
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

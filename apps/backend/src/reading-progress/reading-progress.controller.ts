import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ReadingProgressService } from './reading-progress.service';

@Controller('reading-progress')
export class ReadingProgressController {
  constructor(private readonly readingProgressService: ReadingProgressService) {}

  @Get()
  listForUser(@Query() query: Record<string, unknown>) {
    return this.readingProgressService.listForUser(query);
  }

  @Get(':policyId')
  getForUserPolicy(
    @Param('policyId') policyId: string,
    @Query() query: Record<string, unknown>,
  ) {
    return this.readingProgressService.getForUserPolicy(policyId, query);
  }

  @Put()
  upsertProgress(@Body() body: Record<string, unknown>) {
    return this.readingProgressService.upsertProgress(body);
  }
}

import { Controller, Get, Param, Query } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(':id')
  snapshot(
    @Param('id') id: string,
    @Query() query: Record<string, string | undefined>,
  ) {
    return this.reportsService.snapshot(id, query);
  }
}

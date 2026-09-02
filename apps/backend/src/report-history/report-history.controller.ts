import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ReportHistoryService } from './report-history.service';

@Controller('report-history')
export class ReportHistoryController {
  constructor(private readonly reportHistoryService: ReportHistoryService) {}

  @Get()
  list() {
    return this.reportHistoryService.list();
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.reportHistoryService.create(body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.reportHistoryService.remove(id);
  }
}

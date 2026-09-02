import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PolicyAssignmentsService } from './policy-assignments.service';

@Controller('policy-assignments')
export class PolicyAssignmentsController {
  constructor(private readonly assignmentsService: PolicyAssignmentsService) {}

  @Get()
  list(@Query() query: Record<string, string | undefined>) {
    return this.assignmentsService.list(query);
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.assignmentsService.create(body);
  }

  @Post(':id/duplicate')
  duplicate(@Param('id') id: string) {
    return this.assignmentsService.duplicate(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.assignmentsService.updateStatus(id, body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.assignmentsService.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.assignmentsService.remove(id);
  }
}

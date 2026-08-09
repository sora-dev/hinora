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
import { DepartmentsService } from './departments.service';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  listDepartments(@Query() query: Record<string, string | undefined>) {
    return this.departmentsService.listDepartments(query);
  }

  @Get('options')
  listOptions() {
    return this.departmentsService.listOptions();
  }

  @Get(':id')
  getDepartment(@Param('id') id: string) {
    return this.departmentsService.getDepartment(id);
  }

  @Post()
  createDepartment(@Body() body: Record<string, unknown>) {
    return this.departmentsService.createDepartment(body);
  }

  @Patch(':id')
  updateDepartment(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.departmentsService.updateDepartment(id, body);
  }

  @Delete(':id')
  deleteDepartment(@Param('id') id: string) {
    return this.departmentsService.deleteDepartment(id);
  }
}

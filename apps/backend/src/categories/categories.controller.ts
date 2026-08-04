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
import { CategoriesService } from './categories.service';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  listCategories(@Query() query: Record<string, string | undefined>) {
    return this.categoriesService.listCategories(query);
  }

  @Get('options')
  listOptions() {
    return this.categoriesService.listOptions();
  }

  @Get(':id')
  getCategory(@Param('id') id: string) {
    return this.categoriesService.getCategory(id);
  }

  @Post()
  createCategory(@Body() body: Record<string, unknown>) {
    return this.categoriesService.createCategory(body);
  }

  @Patch(':id')
  updateCategory(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.categoriesService.updateCategory(id, body);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.categoriesService.updateStatus(id, body);
  }

  @Delete(':id')
  deleteCategory(@Param('id') id: string) {
    return this.categoriesService.deleteCategory(id);
  }
}

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { BookmarksService } from './bookmarks.service';

@Controller('bookmarks')
export class BookmarksController {
  constructor(private readonly bookmarks: BookmarksService) {}

  @Get()
  list(
    @Headers('x-hinora-user-id') userId?: string,
    @Query() query?: Record<string, string | undefined>,
  ) {
    return this.bookmarks.list(this.requireUser(userId), query ?? {});
  }

  @Get('ids')
  ids(@Headers('x-hinora-user-id') userId?: string) {
    return this.bookmarks.ids(this.requireUser(userId));
  }

  @Get('status')
  status(
    @Headers('x-hinora-user-id') userId?: string,
    @Query('policyId') policyId?: string,
  ) {
    return this.bookmarks.status(this.requireUser(userId), policyId ?? '');
  }

  @Get('collections')
  collections(@Headers('x-hinora-user-id') userId?: string) {
    return this.bookmarks.listCollections(this.requireUser(userId));
  }

  @Post()
  create(
    @Body() body: Record<string, unknown>,
    @Headers('x-hinora-user-id') userId?: string,
  ) {
    return this.bookmarks.create(this.requireUser(userId), body);
  }

  @Post('collections')
  createCollection(
    @Body() body: Record<string, unknown>,
    @Headers('x-hinora-user-id') userId?: string,
  ) {
    return this.bookmarks.createCollection(this.requireUser(userId), body);
  }

  @Patch('collections/:id')
  updateCollection(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Headers('x-hinora-user-id') userId?: string,
  ) {
    return this.bookmarks.updateCollection(this.requireUser(userId), id, body);
  }

  @Delete('collections/:id')
  removeCollection(
    @Param('id') id: string,
    @Headers('x-hinora-user-id') userId?: string,
  ) {
    return this.bookmarks.removeCollection(this.requireUser(userId), id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Headers('x-hinora-user-id') userId?: string,
  ) {
    return this.bookmarks.update(this.requireUser(userId), id, body);
  }

  @Delete('policy/:policyId')
  removeByPolicy(
    @Param('policyId') policyId: string,
    @Headers('x-hinora-user-id') userId?: string,
  ) {
    return this.bookmarks.removeByPolicy(this.requireUser(userId), policyId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Headers('x-hinora-user-id') userId?: string) {
    return this.bookmarks.remove(this.requireUser(userId), id);
  }

  private requireUser(userId?: string) {
    const actorId = userId?.trim();
    if (!actorId) {
      throw new BadRequestException('X-Hinora-User-Id is required.');
    }
    return actorId;
  }
}

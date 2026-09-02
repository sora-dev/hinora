import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Headers,
  MessageEvent,
  Param,
  Patch,
  Post,
  Query,
  Sse,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { InboxEventsService } from './inbox-events.service';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly events: InboxEventsService,
  ) {}

  @Sse('inbox/stream')
  @Header('Cache-Control', 'no-cache, no-transform')
  @Header('Connection', 'keep-alive')
  @Header('X-Accel-Buffering', 'no')
  stream(
    @Headers('x-hinora-user-id') headerId?: string,
    @Query('userId') queryId?: string,
  ): Observable<MessageEvent> {
    return this.events.stream(this.requireUser(headerId || queryId));
  }

  @Get('inbox')
  list(
    @Headers('x-hinora-user-id') userId?: string,
    @Query() query?: Record<string, string | undefined>,
  ) {
    return this.notifications.list(this.requireUser(userId), query ?? {});
  }

  @Get('inbox/unread-count')
  unreadCount(@Headers('x-hinora-user-id') userId?: string) {
    return this.notifications.unreadCount(this.requireUser(userId));
  }

  @Post('inbox/read-all')
  markAllRead(@Headers('x-hinora-user-id') userId?: string) {
    return this.notifications.markAllRead(this.requireUser(userId));
  }

  @Patch('inbox/:id/read')
  markRead(
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
    @Headers('x-hinora-user-id') userId?: string,
  ) {
    return this.notifications.markRead(this.requireUser(userId), id, body.read !== false);
  }

  @Delete('inbox/:id')
  remove(@Param('id') id: string, @Headers('x-hinora-user-id') userId?: string) {
    return this.notifications.remove(this.requireUser(userId), id);
  }

  private requireUser(userId?: string) {
    const actorId = userId?.trim();
    if (!actorId) {
      throw new BadRequestException('X-Hinora-User-Id is required.');
    }
    return actorId;
  }
}

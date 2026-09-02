import { Global, Module } from '@nestjs/common';
import { InboxEventsService } from './inbox-events.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, InboxEventsService],
  exports: [NotificationsService, InboxEventsService],
})
export class NotificationsModule {}

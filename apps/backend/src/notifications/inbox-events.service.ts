import { Injectable, MessageEvent } from '@nestjs/common';
import { EventEmitter } from 'node:events';
import { Observable } from 'rxjs';

const globalForInbox = globalThis as typeof globalThis & {
  __hinoraInboxBus?: EventEmitter;
};

if (!globalForInbox.__hinoraInboxBus) {
  globalForInbox.__hinoraInboxBus = new EventEmitter();
  globalForInbox.__hinoraInboxBus.setMaxListeners(0);
}

const inboxBus = globalForInbox.__hinoraInboxBus;

function frame(type: string): MessageEvent {
  return { data: { type } };
}

@Injectable()
export class InboxEventsService {
  notify(userIds: Iterable<string | null | undefined>) {
    const unique = new Set(
      [...userIds].map((id) => id?.trim()).filter((id): id is string => Boolean(id)),
    );
    for (const userId of unique) {
      inboxBus.emit('inbox-updated', userId);
    }
  }

  stream(userId: string): Observable<MessageEvent> {
    return new Observable((subscriber) => {
      subscriber.next(frame('connected'));
      const onUpdate = (id: string) => {
        if (id === userId) {
          subscriber.next(frame('inbox-updated'));
        }
      };
      inboxBus.on('inbox-updated', onUpdate);
      const ping = setInterval(() => {
        subscriber.next(frame('ping'));
      }, 25_000);
      return () => {
        inboxBus.off('inbox-updated', onUpdate);
        clearInterval(ping);
      };
    });
  }
}

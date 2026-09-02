import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { catchError, tap } from 'rxjs/operators';
import { throwError, type Observable } from 'rxjs';
import { AuditService } from './audit.service';
import { shouldSkipAudit } from './audit.mapper';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const path = (request.path || request.url || '/').split('?')[0] ?? '/';
    const method = (request.method || 'GET').toUpperCase();

    if (shouldSkipAudit(method, path.replace(/\/+$/, '') || '/')) {
      return next.handle();
    }

    return next.handle().pipe(
      tap((result) => {
        void this.auditService.recordFromRequest(request, result, null);
      }),
      catchError((error: unknown) => {
        void this.auditService.recordFromRequest(request, null, error);
        return throwError(() => error);
      }),
    );
  }
}

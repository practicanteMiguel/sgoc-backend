import {
  Injectable, NestInterceptor,
  ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../audit/audit.service';

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

const EXCLUDED_PATHS = [
  '/auth/login',
  '/auth/logout',
  '/auth/refresh',
  '/auth/verify-email',
  '/users/me/change-password',
];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip, body, params } = request;

    if (!WRITE_METHODS.includes(method)) return next.handle();

    const cleanPath = url.split('?')[0].replace('/api/v1', '');
    const isExcluded = EXCLUDED_PATHS.some((p) => cleanPath.includes(p));
    if (isExcluded) return next.handle();

    const actionMap: Record<string, string> = {
      POST:   'CREATE',
      PUT:    'UPDATE',
      PATCH:  'UPDATE',
      DELETE: 'DELETE',
    };

    const pathParts  = cleanPath.split('/').filter(Boolean);
    const moduleName = pathParts[0] ?? 'unknown';

    // ✅ FIX — safeBody es Record o undefined, nunca null
    const safeBody: Record<string, any> | undefined =
      body && Object.keys(body).length > 0
        ? this.sanitizeBody({ ...body })
        : undefined; // ← undefined en lugar de null

    return next.handle().pipe(
      tap({
        next: async (responseData) => {
          try {
            const entityId =
              responseData?.id  ??
              params?.id        ??
              pathParts[1]      ??
              undefined; // ← undefined en lugar de null

            await this.auditService.log({
              user_id:     user?.id,
              action:      actionMap[method],
              entity_type: moduleName,
              entity_id:   entityId,
              // ✅ FIX — undefined en DELETE en lugar de null
              new_values:  method !== 'DELETE' ? safeBody : undefined,
              ip_address:  ip,
              module:      moduleName,
            });
          } catch (err) {
            console.error('[AuditInterceptor] Error al guardar log:', err);
          }
        },
      }),
    );
  }

  private sanitizeBody(
    body: Record<string, any>,
  ): Record<string, any> {
    const sensitive = [
      'password', 'password_hash', 'current_password',
      'new_password', 'refresh_token', 'token',
    ];
    sensitive.forEach((field) => {
      if (body[field] !== undefined) body[field] = '[REDACTED]';
    });
    return body;
  }
}
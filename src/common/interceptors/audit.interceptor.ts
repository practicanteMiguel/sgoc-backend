import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../audit/audit.service';

const WRITE_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, ip, body } = request;

    if (!WRITE_METHODS.includes(method)) return next.handle();

    const actionMap: Record<string, string> = {
      POST: 'CREATE', PUT: 'UPDATE',
      PATCH: 'UPDATE', DELETE: 'DELETE',
    };

    const moduleName = url.split('/')[3] ?? 'unknown'; // /api/v1/{module}/...

    return next.handle().pipe(
      tap(async (responseData) => {
        await this.auditService.log({
          user_id: user?.id,
          action: actionMap[method],
          entity_type: moduleName,
          entity_id: responseData?.id ?? request.params?.id,
          new_values: method !== 'DELETE' ? body : null,
          ip_address: ip,
          module: moduleName,
        });
      }),
    );
  }
}
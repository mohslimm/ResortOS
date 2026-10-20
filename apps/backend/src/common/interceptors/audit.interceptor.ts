import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma.service';
import { TenantContext } from '../../tenant/tenant.context';

/**
 * AuditInterceptor — automatically logs all mutating actions (POST, PATCH, DELETE)
 * to the database for compliance and traceability.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('AuditInterceptor');

  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body, ip } = request;

    // Only log mutations (POST, PATCH, DELETE)
    // We exclude GET for performance and noise reduction
    if (!['POST', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async () => {
        try {
          const tenantId = TenantContext.getStore()?.tenantId;

          // Skip logging if no tenant context or no authenticated user
          if (!tenantId || !user) return;

          // Heuristic extraction for module and eventType from URL
          // Format: /api/v1/:module/:submodule/...
          const parts = url.split('/').filter(Boolean);
          const moduleName = parts[2]?.toUpperCase() || 'CORE';
          const entityName = parts[3] || 'resource';
          const eventType = `${entityName}.${method.toLowerCase()}`;

          // Sanitize payload (remove sensitive fields if any)
          const sanitizedBody = { ...body };
          delete sanitizedBody.password;
          delete sanitizedBody.passwordHash;

          await this.prisma.auditLog.create({
            data: {
              tenantId,
              actorId: user.sub,
              module: moduleName,
              eventType,
              payload: sanitizedBody,
              ipAddress: ip || 'unknown',
            },
          });
        } catch (err) {
          // Failure to log should not break the main business flow
          const errMsg = err instanceof Error ? err.message : String(err);
          this.logger.error(`Failed to create audit log: ${errMsg}`);
        }
      }),
    );
  }
}

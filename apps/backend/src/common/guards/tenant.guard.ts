import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { TenantContext } from '../../tenant/tenant.context';
import type { JwtPayload } from '../../auth/jwt.payload';

/**
 * TenantGuard — enforces Multi-Tenant Isolation.
 * Verifies that the tenantId in TenantContext matches the user's tenantId.
 * SUPER_ADMIN is exempt from this check.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;

    if (!user) {
      return true; // Let JwtAuthGuard handle unauthenticated access
    }

    // SUPER_ADMIN can jump between tenants (using the header)
    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }

    const currentTenantId = TenantContext.getStore()?.tenantId;

    if (currentTenantId && user.tenantId !== currentTenantId) {
      throw new ForbiddenException(
        "Accès refusé : Tentative d'accès à un tenant non autorisé.",
      );
    }

    return true;
  }
}

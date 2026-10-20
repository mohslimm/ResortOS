import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { TenantContext } from '../../tenant/tenant.context';
import type { JwtPayload } from '../../auth/jwt.payload';

/**
 * RolesGuard — enforces RBAC and Multi-Tenant Isolation.
 * Must be used after JwtAuthGuard so req.user is populated.
 * SUPER_ADMIN bypasses all role and tenant checks.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();

    if (!user) {
      return true; // Let JwtAuthGuard handle it if used locally
    }

    // 1. TENANT ISOLATION CHECK
    // SUPER_ADMIN can jump between tenants via x-tenant-id header
    if (user.role !== Role.SUPER_ADMIN) {
      const currentTenantId = TenantContext.getStore()?.tenantId;
      if (currentTenantId && user.tenantId !== currentTenantId) {
        throw new ForbiddenException(
          "Accès refusé : Tentative d'accès à un tenant non autorisé.",
        );
      }
    }

    // 2. RBAC CHECK
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator → route is open to any authenticated user
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // SUPER_ADMIN has universal access
    if (user.role === Role.SUPER_ADMIN) {
      return true;
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `Rôle requis: ${requiredRoles.join(' ou ')}. Votre rôle: ${user.role}`,
      );
    }

    return true;
  }
}

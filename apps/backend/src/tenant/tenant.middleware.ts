import {
  Injectable,
  NestMiddleware,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContext } from './tenant.context';
import { PrismaService } from '../prisma.service';

/**
 * TenantMiddleware — applied globally to every route.
 *
 * Resolution order:
 * 1. x-tenant-id HTTP header (used by dashboard and API clients)
 * 2. JWT payload (injected after JwtAuthGuard runs — set by JwtStrategy)
 * 3. Fallback to the first active tenant in development/database if neither is present.
 *
 * SUPER_ADMIN role bypasses tenant isolation (handled in guards).
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const url = req.originalUrl || req.url;
    const isAuthRoute = url.includes('/auth/');
    if (isAuthRoute) {
      return next();
    }

    const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
    const jwtTenantId = (req as Request & { user?: { tenantId?: string } }).user
      ?.tenantId;

    let tenantId = headerTenantId ?? jwtTenantId;

    // Fallback to first active tenant if none provided (e.g. initial dev dashboard load)
    if (!tenantId) {
      const firstTenant = await this.prisma.tenant.findFirst({
        where: { isActive: true },
        select: { id: true },
      });
      if (firstTenant) {
        tenantId = firstTenant.id;
      }
    }

    if (!tenantId) {
      throw new BadRequestException('Missing x-tenant-id header');
    }

    TenantContext.run({ tenantId }, () => next());
  }
}


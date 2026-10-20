import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TenantContext } from './tenant.context';
import type { Tenant } from '@prisma/client';

@Injectable()
export class TenantService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the current tenant ID from AsyncLocalStorage.
   * Throws if called outside a tenant context.
   */
  getCurrentTenantId(): string {
    const store = TenantContext.getStore();
    if (!store) {
      throw new Error(
        'TenantService.getCurrentTenantId() called outside tenant context',
      );
    }
    return store.tenantId;
  }

  /**
   * Validates that a tenant exists and is active.
   */
  async validateTenant(tenantId: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId, isActive: true },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant not found or suspended`);
    }
    return tenant;
  }
}

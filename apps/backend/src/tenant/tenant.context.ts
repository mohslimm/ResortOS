import { AsyncLocalStorage } from 'async_hooks';

export interface TenantStore {
  tenantId: string;
}

/**
 * AsyncLocalStorage-based tenant context.
 * Provides tenant isolation across async call chains without
 * passing tenantId as a parameter to every function.
 *
 * Usage:
 *   const { tenantId } = TenantContext.getStore()!;
 */
export const TenantContext = new AsyncLocalStorage<TenantStore>();

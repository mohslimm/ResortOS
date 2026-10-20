import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '../../auth/jwt.payload';

/**
 * Extracts the authenticated user from the request.
 * @example @CurrentUser() user: JwtPayload
 * @example @CurrentUser('tenantId') tenantId: string
 */
export const CurrentUser = createParamDecorator(
  (
    field: keyof JwtPayload | undefined,
    ctx: ExecutionContext,
  ): JwtPayload | unknown => {
    const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
    const user = request.user;
    return field ? user[field] : user;
  },
);

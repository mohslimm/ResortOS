import { Role } from '@prisma/client';

/**
 * Shape of the JWT access token payload.
 * Injected into req.user by JwtStrategy.validate().
 */
export interface JwtPayload {
  sub: string; // userId
  tenantId: string;
  role: Role;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Shape of the JWT refresh token payload.
 */
export interface JwtRefreshPayload extends JwtPayload {
  refreshToken: string; // Raw refresh token (for rotation validation)
}

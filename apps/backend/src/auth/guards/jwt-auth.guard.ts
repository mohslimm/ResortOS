import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Protects routes with JWT access token */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

/** Protects the refresh endpoint — uses httpOnly cookie */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}

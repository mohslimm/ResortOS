import { Injectable, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import type { JwtPayload, JwtRefreshPayload } from '../jwt.payload';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Primary: httpOnly cookie
        (req: Request) => req.cookies?.refresh_token as string | null,
        // Fallback: Authorization header (for API clients)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
      algorithms: ['HS256'],
    });
  }

  async validate(
    req: Request,
    payload: JwtPayload,
  ): Promise<JwtRefreshPayload> {
    const rawRefreshToken =
      (req.cookies?.refresh_token as string | undefined) ??
      req.headers.authorization?.replace('Bearer ', '');

    if (!rawRefreshToken) {
      throw new ForbiddenException('Refresh token manquant');
    }

    return { ...payload, refreshToken: rawRefreshToken };
  }
}

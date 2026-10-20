import {
  Controller,
  Post,
  Body,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtRefreshGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload, JwtRefreshPayload } from './jwt.payload';

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/api/v1/auth/refresh',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/register
   * Creates a new tenant + admin user atomically.
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
  ): Promise<{ access_token: string; tenantId: string }> {
    return this.authService.register(dto);
  }

  /**
   * POST /api/v1/auth/login
   * Returns access_token in body + refresh_token in httpOnly cookie.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ access_token: string; user: object }> {
    const result = await this.authService.login(dto);
    res.cookie('refresh_token', result.refresh_token, REFRESH_COOKIE_OPTIONS);
    return { access_token: result.access_token, user: result.user };
  }

  /**
   * POST /api/v1/auth/refresh
   * Rotates refresh token — reads from httpOnly cookie.
   */
  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  async refresh(
    @CurrentUser() user: JwtRefreshPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ access_token: string }> {
    const tokens = await this.authService.refreshTokens(user);
    res.cookie('refresh_token', tokens.refresh_token, REFRESH_COOKIE_OPTIONS);
    return { access_token: tokens.access_token };
  }

  /**
   * POST /api/v1/auth/logout
   * Clears refresh token from DB and cookie.
   */
  @Post('logout')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    await this.authService.logout(user.sub);
    res.clearCookie('refresh_token', { path: '/api/v1/auth/refresh' });
    return { message: 'Déconnexion réussie' };
  }
}

import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma.service';
import { EventProducerService } from '../events/event-producer.service';
import { EVENT_TYPES } from '../events/event.types';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { JwtPayload, JwtRefreshPayload } from './jwt.payload';
import { Role } from '@prisma/client';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly events: EventProducerService,
  ) {}

  // ─── REGISTER ───────────────────────────────────────────────────

  async register(
    dto: RegisterDto,
  ): Promise<{ access_token: string; tenantId: string }> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.adminEmail },
    });
    if (existingUser) {
      throw new ConflictException('Un compte avec cet email existe déjà');
    }

    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });
    if (existingTenant) {
      throw new ConflictException('Ce slug est déjà utilisé');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    // Atomic: create tenant + admin user + subscription in one transaction
    const { tenant, user } = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: dto.tenantName, slug: dto.tenantSlug },
      });

      await tx.subscription.create({
        data: { tenantId: tenant.id },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: dto.adminName,
          email: dto.adminEmail,
          passwordHash,
          role: Role.ADMIN,
        },
      });

      return { tenant, user };
    });

    const tokens = await this.generateTokens({
      sub: user.id,
      tenantId: tenant.id,
      role: user.role,
      email: user.email,
    });

    await this.storeRefreshToken(user.id, tokens.refresh_token);

    this.logger.log(`Tenant enregistré: ${tenant.slug} | Admin: ${user.email}`);

    return { access_token: tokens.access_token, tenantId: tenant.id };
  }

  // ─── LOGIN ──────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<{
    access_token: string;
    refresh_token: string;
    user: { id: string; name: string; role: Role; tenantId: string };
  }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.isActive) {
      await this.events.emit(
        EVENT_TYPES.AUTH_LOGIN_FAILED,
        user?.tenantId || 'GLOBAL',
        'auth',
        {
          email: dto.email,
          reason: 'User not found or inactive',
        },
      );
      throw new UnauthorizedException('Identifiants invalides');
    }

    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      await this.events.emit(
        EVENT_TYPES.AUTH_LOGIN_FAILED,
        user.tenantId,
        'auth',
        {
          email: dto.email,
          reason: 'Invalid password',
        },
      );
      throw new UnauthorizedException('Identifiants invalides');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    });

    await this.storeRefreshToken(user.id, tokens.refresh_token);

    // Emit Event
    await this.events.emit(
      EVENT_TYPES.AUTH_LOGIN_SUCCESS,
      user.tenantId,
      'auth',
      {
        userId: user.id,
        email: user.email,
      },
    );

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  // ─── REFRESH ────────────────────────────────────────────────────

  async refreshTokens(payload: JwtRefreshPayload): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user?.refreshToken) {
      throw new ForbiddenException('Accès refusé — reconnectez-vous');
    }

    const tokenMatches = await bcrypt.compare(
      payload.refreshToken,
      user.refreshToken,
    );
    if (!tokenMatches) {
      throw new ForbiddenException('Refresh token invalide');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      email: user.email,
    });

    await this.storeRefreshToken(user.id, tokens.refresh_token);

    return tokens;
  }

  // ─── LOGOUT ─────────────────────────────────────────────────────

  async logout(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  // ─── HELPERS ────────────────────────────────────────────────────

  private async generateTokens(
    payload: Omit<JwtPayload, 'iat' | 'exp'>,
  ): Promise<{ access_token: string; refresh_token: string }> {
    const [access_token, refresh_token] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
        algorithm: 'HS256',
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
        algorithm: 'HS256',
      }),
    ]);

    return { access_token, refresh_token };
  }

  private async storeRefreshToken(
    userId: string,
    rawToken: string,
  ): Promise<void> {
    const hash = await bcrypt.hash(rawToken, BCRYPT_ROUNDS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hash },
    });
  }
}

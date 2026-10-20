import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantModule } from './tenant/tenant.module';
import { TenantMiddleware } from './tenant/tenant.middleware';
import { PrismaService } from './prisma.service';
import { PmsModule } from './pms/pms.module';
import { HrModule } from './hr/hr.module';
import { ParkingModule } from './parking/parking.module';
import { HousekeepingModule } from './housekeeping/housekeeping.module';
import { HealthController } from './health.controller';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { EventModule } from './events/event.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    EventModule,
    AnalyticsModule,
    RealtimeModule,
    // ─── Config (env validation) ──────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: (config: Record<string, string>) => {
        const required = [
          'DATABASE_URL',
          'JWT_SECRET',
          'JWT_REFRESH_SECRET',
          'REDIS_HOST',
          'REDIS_PORT',
        ];
        for (const key of required) {
          if (!config[key]) {
            throw new Error(`Variable d'environnement manquante: ${key}`);
          }
        }
        return config;
      },
    }),

    // ─── Rate limiting ────────────────────────────────────────────
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60_000, // 1 minute window
        limit: 100, // 100 requests per minute
      },
      {
        name: 'auth',
        ttl: 900_000, // 15 minute window
        limit: 10, // 10 attempts per 15 min (auth routes override below)
      },
    ]),

    // ─── Feature modules ──────────────────────────────────────────
    AuthModule,
    TenantModule,
    UsersModule,
    // ─── ERP Modules (Phase 2) ────────────────────────────────────
    PmsModule,
    HrModule,
    ParkingModule,
    HousekeepingModule,
  ],

  controllers: [HealthController],

  providers: [
    PrismaService,
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'api/v1/auth/register', method: RequestMethod.POST },
        { path: 'api/v1/auth/login', method: RequestMethod.POST },
      )
      .forRoutes('*');
  }
}

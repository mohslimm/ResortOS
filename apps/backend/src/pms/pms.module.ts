import { Module } from '@nestjs/common';
import { RoomsService } from './rooms/rooms.service';
import { RoomsController } from './rooms/rooms.controller';
import { BookingsService } from './bookings/bookings.service';
import { BookingsController } from './bookings/bookings.controller';
import { PrismaService } from '../prisma.service';
import { TenantModule } from '../tenant/tenant.module';

@Module({
  imports: [TenantModule],
  providers: [RoomsService, BookingsService, PrismaService],
  controllers: [RoomsController, BookingsController],
  exports: [RoomsService, BookingsService],
})
export class PmsModule {}

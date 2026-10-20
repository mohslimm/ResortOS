import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/booking.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, BookingStatus } from '@prisma/client';

@Controller('pms/bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /** GET /api/v1/pms/bookings?status=CONFIRMED */
  @Get()
  findAll(@Query('status') status?: BookingStatus) {
    return this.bookingsService.findAll(status);
  }

  /** GET /api/v1/pms/bookings/:id */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookingsService.findOne(id);
  }

  /** POST /api/v1/pms/bookings */
  @Post()
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.STAFF)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateBookingDto) {
    return this.bookingsService.create(dto);
  }

  /** PATCH /api/v1/pms/bookings/:id/check-in */
  @Patch(':id/check-in')
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.STAFF)
  checkIn(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookingsService.checkIn(id);
  }

  /** PATCH /api/v1/pms/bookings/:id/check-out */
  @Patch(':id/check-out')
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.STAFF)
  checkOut(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookingsService.checkOut(id);
  }

  /** PATCH /api/v1/pms/bookings/:id/cancel */
  @Patch(':id/cancel')
  @Roles(Role.ADMIN, Role.DIRECTOR)
  cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.bookingsService.cancel(id);
  }
}

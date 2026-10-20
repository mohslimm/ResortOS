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
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role, RoomStatus } from '@prisma/client';

@Controller('pms/rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  /** GET /api/v1/pms/rooms?status=AVAILABLE */
  @Get()
  findAll(@Query('status') status?: RoomStatus) {
    return this.roomsService.findAll(status);
  }

  /** GET /api/v1/pms/rooms/available?checkIn=...&checkOut=... */
  @Get('available')
  getAvailable(
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
  ) {
    return this.roomsService.getAvailableRooms(
      new Date(checkIn),
      new Date(checkOut),
    );
  }

  /** GET /api/v1/pms/rooms/:id */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.roomsService.findOne(id);
  }

  /** POST /api/v1/pms/rooms */
  @Post()
  @Roles(Role.ADMIN, Role.DIRECTOR)
  create(@Body() dto: CreateRoomDto) {
    return this.roomsService.create(dto);
  }

  /** PATCH /api/v1/pms/rooms/:id */
  @Patch(':id')
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.STAFF)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoomDto) {
    return this.roomsService.update(id, dto);
  }
}

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { TenantService } from '../../tenant/tenant.service';
import { RoomStatus } from '@prisma/client';
import { EventProducerService } from '../../events/event-producer.service';
import { EVENT_TYPES } from '../../events/event.types';
import type { CreateRoomDto, UpdateRoomDto } from './dto/room.dto';

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantService: TenantService,
    private readonly events: EventProducerService,
  ) {}

  async findAll(status?: RoomStatus) {
    const tenantId = this.tenantService.getCurrentTenantId();
    return this.prisma.room.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      orderBy: [{ floor: 'asc' }, { number: 'asc' }],
    });
  }

  async findOne(id: string) {
    const tenantId = this.tenantService.getCurrentTenantId();
    const room = await this.prisma.room.findFirst({
      where: { id, tenantId },
      include: {
        bookings: {
          where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } },
          orderBy: { checkIn: 'desc' },
          take: 5,
        },
      },
    });
    if (!room) throw new NotFoundException('Chambre introuvable');
    return room;
  }

  async create(dto: CreateRoomDto) {
    const tenantId = this.tenantService.getCurrentTenantId();

    const existing = await this.prisma.room.findUnique({
      where: { tenantId_number: { tenantId, number: dto.number } },
    });
    if (existing)
      throw new ConflictException(`Chambre ${dto.number} existe déjà`);

    return this.prisma.room.create({
      data: { ...dto, tenantId },
    });
  }

  async update(id: string, dto: UpdateRoomDto) {
    const room = await this.findOne(id);
    const updated = await this.prisma.room.update({
      where: { id },
      data: dto,
    });

    if (dto.status && dto.status !== room.status) {
      await this.events.emit(
        EVENT_TYPES.ROOM_STATUS_CHANGED,
        updated.tenantId,
        'pms.rooms',
        {
          roomId: updated.id,
          status: updated.status,
        },
      );
    }

    return updated;
  }

  async updateStatus(id: string, status: RoomStatus) {
    const room = await this.findOne(id);
    const updated = await this.prisma.room.update({
      where: { id },
      data: { status },
    });

    if (status !== room.status) {
      await this.events.emit(
        EVENT_TYPES.ROOM_STATUS_CHANGED,
        updated.tenantId,
        'pms.rooms',
        {
          roomId: updated.id,
          status: updated.status,
        },
      );
    }

    return updated;
  }

  async getAvailableRooms(checkIn: Date, checkOut: Date) {
    const tenantId = this.tenantService.getCurrentTenantId();

    if (checkOut <= checkIn) {
      throw new BadRequestException(
        "La date de départ doit être après la date d'arrivée",
      );
    }

    // Rooms that have NO overlapping active bookings
    const bookedRoomIds = await this.prisma.booking.findMany({
      where: {
        tenantId,
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        OR: [{ checkIn: { lt: checkOut }, checkOut: { gt: checkIn } }],
      },
      select: { roomId: true },
    });

    const excludedIds = bookedRoomIds.map((b) => b.roomId);

    return this.prisma.room.findMany({
      where: {
        tenantId,
        status: RoomStatus.AVAILABLE,
        id: { notIn: excludedIds },
      },
      orderBy: [{ floor: 'asc' }, { pricePerNight: 'asc' }],
    });
  }
}

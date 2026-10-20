import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { TenantService } from '../../tenant/tenant.service';
import { BookingStatus, RoomStatus, Prisma } from '@prisma/client';
import { EventProducerService } from '../../events/event-producer.service';
import { EVENT_TYPES } from '../../events/event.types';
import type { CreateBookingDto } from './dto/booking.dto';
const { Decimal } = Prisma;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantService: TenantService,
    private readonly events: EventProducerService,
  ) {}

  async findAll(status?: BookingStatus) {
    const tenantId = this.tenantService.getCurrentTenantId();
    return this.prisma.booking.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      include: { guest: true, room: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const tenantId = this.tenantService.getCurrentTenantId();
    const booking = await this.prisma.booking.findFirst({
      where: { id, tenantId },
      include: { guest: true, room: true },
    });
    if (!booking) throw new NotFoundException('Réservation introuvable');
    return booking;
  }

  async create(dto: CreateBookingDto) {
    const tenantId = this.tenantService.getCurrentTenantId();

    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);

    if (checkOut <= checkIn) {
      throw new BadRequestException(
        "La date de départ doit être après la date d'arrivée",
      );
    }

    // Verify room belongs to tenant and is available
    const room = await this.prisma.room.findFirst({
      where: { id: dto.roomId, tenantId },
    });
    if (!room) throw new NotFoundException('Chambre introuvable');
    if (room.status === RoomStatus.MAINTENANCE) {
      throw new ConflictException(
        'Chambre en maintenance — réservation impossible',
      );
    }

    // Check for date conflicts
    const conflict = await this.prisma.booking.findFirst({
      where: {
        tenantId,
        roomId: dto.roomId,
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
        AND: [{ checkIn: { lt: checkOut } }, { checkOut: { gt: checkIn } }],
      },
    });
    if (conflict) {
      throw new ConflictException('Chambre déjà réservée pour ces dates');
    }

    // Calculate total amount
    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );
    const totalAmount = new Decimal(room.pricePerNight).mul(nights);

    // Find or create guest (upsert by tenantId + idCard)
    const guest = await this.prisma.guest.upsert({
      where: { tenantId_idCard: { tenantId, idCard: dto.guestIdCard } },
      update: { fullName: dto.guestFullName, phone: dto.guestPhone },
      create: {
        tenantId,
        fullName: dto.guestFullName,
        idCard: dto.guestIdCard,
        phone: dto.guestPhone,
      },
    });

    const booking = await this.prisma.booking.create({
      data: {
        tenantId,
        roomId: dto.roomId,
        guestId: guest.id,
        checkIn,
        checkOut,
        totalAmount,
        notes: dto.notes,
        status: BookingStatus.CONFIRMED,
      },
      include: { guest: true, room: true },
    });

    // Emit Event
    await this.events.emit(
      EVENT_TYPES.BOOKING_CREATED,
      tenantId,
      'pms.bookings',
      booking,
    );

    return booking;
  }

  async checkIn(id: string) {
    const booking = await this.findOne(id);

    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException(
        `Check-in impossible — statut actuel: ${booking.status}`,
      );
    }

    const [updatedBooking] = await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id },
        data: { status: BookingStatus.CHECKED_IN },
        include: { guest: true, room: true },
      }),
      this.prisma.room.update({
        where: { id: booking.roomId },
        data: { status: RoomStatus.OCCUPIED },
      }),
    ]);

    // Emit Events
    await this.events.emit(
      EVENT_TYPES.BOOKING_CHECKED_IN,
      booking.tenantId,
      'pms.bookings',
      updatedBooking,
    );
    await this.events.emit(
      EVENT_TYPES.ROOM_STATUS_CHANGED,
      booking.tenantId,
      'pms.rooms',
      {
        roomId: booking.roomId,
        status: RoomStatus.OCCUPIED,
      },
    );

    return updatedBooking;
  }

  async checkOut(id: string) {
    const booking = await this.findOne(id);

    if (booking.status !== BookingStatus.CHECKED_IN) {
      throw new BadRequestException(
        `Check-out impossible — le client n'est pas enregistré`,
      );
    }

    const [updatedBooking] = await this.prisma.$transaction([
      this.prisma.booking.update({
        where: { id },
        data: { status: BookingStatus.CHECKED_OUT },
        include: { guest: true, room: true },
      }),
      // Room goes to CLEANING after checkout
      this.prisma.room.update({
        where: { id: booking.roomId },
        data: { status: RoomStatus.CLEANING },
      }),
      // Auto-create housekeeping task
      this.prisma.housekeepingTask.create({
        data: {
          tenantId: booking.tenantId,
          roomId: booking.roomId,
          priority: 2,
          notes: `Nettoyage post-départ — Client: ${booking.guest.fullName}`,
        },
      }),
    ]);

    // Emit Events
    await this.events.emit(
      EVENT_TYPES.BOOKING_CHECKED_OUT,
      booking.tenantId,
      'pms.bookings',
      updatedBooking,
    );
    await this.events.emit(
      EVENT_TYPES.ROOM_STATUS_CHANGED,
      booking.tenantId,
      'pms.rooms',
      {
        roomId: booking.roomId,
        status: RoomStatus.CLEANING,
      },
    );

    return updatedBooking;
  }

  async cancel(id: string) {
    const booking = await this.findOne(id);

    if (booking.status === BookingStatus.CHECKED_IN) {
      throw new BadRequestException("Impossible d'annuler un séjour en cours");
    }
    if (booking.status === BookingStatus.CHECKED_OUT) {
      throw new BadRequestException('Réservation déjà terminée');
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
      include: { guest: true, room: true },
    });
  }
}

import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TenantModule } from '../tenant/tenant.module';
import { TenantService } from '../tenant/tenant.service';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ParkingStatus } from '@prisma/client';
import { EventProducerService } from '../events/event-producer.service';
import { EVENT_TYPES } from '../events/event.types';
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
import { IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role, Prisma } from '@prisma/client';
const { Decimal } = Prisma;

// ─── DTOs ────────────────────────────────────────────────────────

class CreateSlotDto {
  @IsString() @IsNotEmpty() @MaxLength(10) slotNumber!: string;
  @IsOptional() @IsString() @MaxLength(5) zone?: string;
}

class EnterParkingDto {
  @IsString() @IsNotEmpty() @MaxLength(20) plateNumber!: string;
  @IsString() @IsNotEmpty() @MaxLength(10) slotNumber!: string;
}

class ExitParkingDto {
  @IsString() @IsNotEmpty() plateNumber!: string;
}

// ─── SERVICE ─────────────────────────────────────────────────────

const RATE_PER_HOUR = new Decimal(10); // 10 MAD / hour

@Injectable()
class ParkingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantService: TenantService,
    private readonly events: EventProducerService,
  ) {}

  async getSlots(status?: ParkingStatus) {
    const tenantId = this.tenantService.getCurrentTenantId();
    return this.prisma.parkingSlot.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      orderBy: [{ zone: 'asc' }, { slotNumber: 'asc' }],
    });
  }

  async createSlot(dto: CreateSlotDto) {
    const tenantId = this.tenantService.getCurrentTenantId();
    const existing = await this.prisma.parkingSlot.findUnique({
      where: { tenantId_slotNumber: { tenantId, slotNumber: dto.slotNumber } },
    });
    if (existing)
      throw new ConflictException(`Place ${dto.slotNumber} existe déjà`);
    return this.prisma.parkingSlot.create({
      data: { tenantId, slotNumber: dto.slotNumber, zone: dto.zone ?? 'A' },
    });
  }

  async enter(dto: EnterParkingDto) {
    const tenantId = this.tenantService.getCurrentTenantId();

    const slot = await this.prisma.parkingSlot.findUnique({
      where: { tenantId_slotNumber: { tenantId, slotNumber: dto.slotNumber } },
    });
    if (!slot)
      throw new NotFoundException(`Place ${dto.slotNumber} introuvable`);
    if (slot.status !== ParkingStatus.FREE) {
      throw new ConflictException(`Place ${dto.slotNumber} n'est pas libre`);
    }

    const [session] = await this.prisma.$transaction([
      this.prisma.parkingSession.create({
        data: { tenantId, slotId: slot.id, plateNumber: dto.plateNumber },
        include: { slot: true },
      }),
      this.prisma.parkingSlot.update({
        where: { id: slot.id },
        data: { status: ParkingStatus.OCCUPIED },
      }),
    ]);

    // Emit Event
    await this.events.emit(
      EVENT_TYPES.PARKING_VEHICLE_ENTERED,
      tenantId,
      'parking',
      session,
    );

    return session;
  }

  async exit(plateNumber: string) {
    const tenantId = this.tenantService.getCurrentTenantId();

    const session = await this.prisma.parkingSession.findFirst({
      where: { tenantId, plateNumber, exitedAt: null },
      include: { slot: true },
    });
    if (!session) {
      throw new NotFoundException(
        `Aucune session active pour la plaque ${plateNumber}`,
      );
    }

    const exitedAt = new Date();
    const durationHours = new Decimal(
      (exitedAt.getTime() - session.enteredAt.getTime()) / (1000 * 60 * 60),
    );
    const fee = durationHours.mul(RATE_PER_HOUR).toDecimalPlaces(2);

    const [updatedSession] = await this.prisma.$transaction([
      this.prisma.parkingSession.update({
        where: { id: session.id },
        data: { exitedAt, fee },
        include: { slot: true },
      }),
      this.prisma.parkingSlot.update({
        where: { id: session.slotId },
        data: { status: ParkingStatus.FREE },
      }),
    ]);

    // Emit Event
    await this.events.emit(
      EVENT_TYPES.PARKING_VEHICLE_EXITED,
      tenantId,
      'parking',
      updatedSession,
    );

    return updatedSession;
  }

  async getSessions(active?: boolean) {
    const tenantId = this.tenantService.getCurrentTenantId();
    return this.prisma.parkingSession.findMany({
      where: {
        tenantId,
        ...(active === true ? { exitedAt: null } : {}),
        ...(active === false ? { exitedAt: { not: null } } : {}),
      },
      include: { slot: true },
      orderBy: { enteredAt: 'desc' },
      take: 50,
    });
  }
}

// ─── CONTROLLER ──────────────────────────────────────────────────

@Controller('parking')
@UseGuards(JwtAuthGuard, RolesGuard)
class ParkingController {
  constructor(private readonly parkingService: ParkingService) {}

  @Get('slots')
  getSlots(@Query('status') status?: ParkingStatus) {
    return this.parkingService.getSlots(status);
  }

  @Post('slots')
  @Roles(Role.ADMIN, Role.DIRECTOR)
  createSlot(@Body() dto: CreateSlotDto) {
    return this.parkingService.createSlot(dto);
  }

  @Get('sessions')
  getSessions(@Query('active') active?: string) {
    const activeFilter =
      active === 'true' ? true : active === 'false' ? false : undefined;
    return this.parkingService.getSessions(activeFilter);
  }

  @Post('enter')
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.STAFF, Role.SECURITY)
  enter(@Body() dto: EnterParkingDto) {
    return this.parkingService.enter(dto);
  }

  @Post('exit')
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.STAFF, Role.SECURITY)
  exit(@Body() dto: ExitParkingDto) {
    return this.parkingService.exit(dto.plateNumber);
  }
}

// ─── MODULE ──────────────────────────────────────────────────────

@Module({
  imports: [TenantModule],
  providers: [ParkingService, PrismaService],
  controllers: [ParkingController],
  exports: [ParkingService],
})
export class ParkingModule {}

import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TenantModule } from '../tenant/tenant.module';
import { TenantService } from '../tenant/tenant.service';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { HousekeepingStatus, RoomStatus } from '@prisma/client';
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
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsEnum,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/jwt.payload';

// ─── DTOs ────────────────────────────────────────────────────────

class CreateTaskDto {
  @IsUUID() roomId!: string;
  @IsOptional() @IsUUID() assignedToId?: string;
  @IsOptional() @IsInt() @Min(1) @Max(3) priority?: number;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

class UpdateTaskStatusDto {
  @IsEnum(HousekeepingStatus) status!: HousekeepingStatus;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

// ─── SERVICE ─────────────────────────────────────────────────────

@Injectable()
class HousekeepingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantService: TenantService,
    private readonly events: EventProducerService,
  ) {}

  async findAll(status?: HousekeepingStatus) {
    const tenantId = this.tenantService.getCurrentTenantId();
    return this.prisma.housekeepingTask.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      include: {
        room: true,
        assignedTo: { select: { id: true, name: true, role: true } },
      },
      orderBy: [{ priority: 'desc' }, { scheduledAt: 'asc' }],
    });
  }

  async findMyTasks(userId: string) {
    const tenantId = this.tenantService.getCurrentTenantId();
    return this.prisma.housekeepingTask.findMany({
      where: {
        tenantId,
        assignedToId: userId,
        status: {
          in: [HousekeepingStatus.PENDING, HousekeepingStatus.IN_PROGRESS],
        },
      },
      include: { room: true },
      orderBy: [{ priority: 'desc' }, { scheduledAt: 'asc' }],
    });
  }

  async create(dto: CreateTaskDto) {
    const tenantId = this.tenantService.getCurrentTenantId();

    const room = await this.prisma.room.findFirst({
      where: { id: dto.roomId, tenantId },
    });
    if (!room) throw new NotFoundException('Chambre introuvable');

    const task = await this.prisma.housekeepingTask.create({
      data: {
        tenantId,
        roomId: dto.roomId,
        assignedToId: dto.assignedToId,
        priority: dto.priority ?? 1,
        notes: dto.notes,
      },
      include: { room: true, assignedTo: { select: { id: true, name: true } } },
    });

    // Emit Event
    await this.events.emit(
      EVENT_TYPES.HOUSEKEEPING_TASK_CREATED,
      tenantId,
      'housekeeping',
      task,
    );

    return task;
  }

  async updateStatus(id: string, dto: UpdateTaskStatusDto) {
    const tenantId = this.tenantService.getCurrentTenantId();
    const task = await this.prisma.housekeepingTask.findFirst({
      where: { id, tenantId },
    });
    if (!task) throw new NotFoundException('Tâche introuvable');

    const completedAt =
      dto.status === HousekeepingStatus.DONE ? new Date() : task.completedAt;

    const updated = await this.prisma.housekeepingTask.update({
      where: { id },
      data: { status: dto.status, notes: dto.notes ?? task.notes, completedAt },
      include: { room: true },
    });

    // Mark room as AVAILABLE when cleaning is done
    if (dto.status === HousekeepingStatus.DONE) {
      await this.prisma.room.update({
        where: { id: task.roomId },
        data: { status: RoomStatus.AVAILABLE },
      });

      // Emit Events
      await this.events.emit(
        EVENT_TYPES.HOUSEKEEPING_TASK_COMPLETED,
        tenantId,
        'housekeeping',
        updated,
      );
      await this.events.emit(
        EVENT_TYPES.ROOM_STATUS_CHANGED,
        tenantId,
        'pms.rooms',
        {
          roomId: task.roomId,
          status: RoomStatus.AVAILABLE,
        },
      );
    }

    return updated;
  }

  async assign(id: string, userId: string) {
    const tenantId = this.tenantService.getCurrentTenantId();
    const task = await this.prisma.housekeepingTask.findFirst({
      where: { id, tenantId },
    });
    if (!task) throw new NotFoundException('Tâche introuvable');

    return this.prisma.housekeepingTask.update({
      where: { id },
      data: { assignedToId: userId, status: HousekeepingStatus.IN_PROGRESS },
      include: { room: true, assignedTo: { select: { id: true, name: true } } },
    });
  }
}

// ─── CONTROLLER ──────────────────────────────────────────────────

@Controller('housekeeping')
@UseGuards(JwtAuthGuard, RolesGuard)
class HousekeepingController {
  constructor(private readonly service: HousekeepingService) {}

  @Get()
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.STAFF)
  findAll(@Query('status') status?: HousekeepingStatus) {
    return this.service.findAll(status);
  }

  @Get('my-tasks')
  myTasks(@CurrentUser() user: JwtPayload) {
    return this.service.findMyTasks(user.sub);
  }

  @Post()
  @Roles(Role.ADMIN, Role.DIRECTOR, Role.STAFF)
  create(@Body() dto: CreateTaskDto) {
    return this.service.create(dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTaskStatusDto,
  ) {
    return this.service.updateStatus(id, dto);
  }

  @Patch(':id/assign/:userId')
  @Roles(Role.ADMIN, Role.DIRECTOR)
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.service.assign(id, userId);
  }
}

// ─── MODULE ──────────────────────────────────────────────────────

@Module({
  imports: [TenantModule],
  providers: [HousekeepingService, PrismaService],
  controllers: [HousekeepingController],
  exports: [HousekeepingService],
})
export class HousekeepingModule {}

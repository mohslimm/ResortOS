import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_TYPES } from '../events/event.types';
import type { ResortEvent } from '../events/event.types';
import { PrismaService } from '../prisma.service';
import { RoomStatus, HousekeepingStatus, BookingStatus } from '@prisma/client';
import { RealtimeGateway } from '../realtime/realtime.gateway';

export interface TenantMetrics {
  occupancyRate: number;
  activeGuests: number;
  roomStatus: Record<RoomStatus, number>;
  housekeepingWorkload: number;
  parkingOccupancy: {
    total: number;
    occupied: number;
    rate: number;
  };
  todayAttendance: number;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger('AnalyticsEngine');

  // Cache for real-time snapshots (per tenant)
  private metricsCache: Map<string, TenantMetrics> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtime: RealtimeGateway,
  ) {}

  /**
   * Get the latest metrics for a tenant.
   * If not in cache, trigger a full recalculation.
   */
  async getTenantMetrics(tenantId: string): Promise<TenantMetrics> {
    if (!this.metricsCache.has(tenantId)) {
      await this.recalculateAll(tenantId);
    }
    return this.metricsCache.get(tenantId)!;
  }

  /**
   * Full recalculation of all KPIs for a tenant.
   */
  private async recalculateAll(tenantId: string): Promise<void> {
    this.logger.log(`Recalculating all metrics for tenant ${tenantId}`);

    const [
      totalRooms,
      occupiedRooms,
      roomStatusGroups,
      activeBookings,
      pendingTasks,
      parkingSlots,
    ] = await Promise.all([
      this.prisma.room.count({ where: { tenantId } }),
      this.prisma.room.count({
        where: { tenantId, status: RoomStatus.OCCUPIED },
      }),
      this.prisma.room.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true,
      }),
      this.prisma.booking.count({
        where: { tenantId, status: BookingStatus.CHECKED_IN },
      }),
      this.prisma.housekeepingTask.count({
        where: {
          tenantId,
          status: {
            in: [HousekeepingStatus.PENDING, HousekeepingStatus.IN_PROGRESS],
          },
        },
      }),
      this.prisma.parkingSlot.findMany({
        where: { tenantId },
        select: { status: true },
      }),
    ]);

    const statusDist: any = {};
    Object.values(RoomStatus).forEach((s) => (statusDist[s] = 0));
    roomStatusGroups.forEach((g) => (statusDist[g.status] = g._count));

    const parkingTotal = parkingSlots.length;
    const parkingOccupied = parkingSlots.filter(
      (s) => s.status === 'OCCUPIED',
    ).length;

    const metrics: TenantMetrics = {
      occupancyRate: totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0,
      activeGuests: activeBookings,
      roomStatus: statusDist,
      housekeepingWorkload: pendingTasks,
      parkingOccupancy: {
        total: parkingTotal,
        occupied: parkingOccupied,
        rate: parkingTotal > 0 ? (parkingOccupied / parkingTotal) * 100 : 0,
      },
      todayAttendance: await this.prisma.attendanceLog.count({
        where: {
          tenantId,
          date: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
    };

    this.metricsCache.set(tenantId, metrics);
  }

  // ─── EVENT LISTENERS ───────────────────────────────────────────

  @OnEvent('employee.*')
  async handleAttendanceEvent(event: ResortEvent) {
    this.logger.debug(`Refreshing Attendance metrics for ${event.tenantId}`);
    await this.recalculateAll(event.tenantId);
    this.triggerRealtimeUpdate(event.tenantId);
  }

  @OnEvent('booking.*')
  @OnEvent('room.*')
  async handlePmsEvent(event: ResortEvent) {
    this.logger.debug(`Refreshing PMS metrics for ${event.tenantId}`);
    await this.recalculateAll(event.tenantId);
    this.triggerRealtimeUpdate(event.tenantId);
  }

  @OnEvent('housekeeping.*')
  async handleHousekeepingEvent(event: ResortEvent) {
    this.logger.debug(`Refreshing Housekeeping metrics for ${event.tenantId}`);
    await this.recalculateAll(event.tenantId);
    this.triggerRealtimeUpdate(event.tenantId);
  }

  @OnEvent('parking.*')
  async handleParkingEvent(event: ResortEvent) {
    this.logger.debug(`Refreshing Parking metrics for ${event.tenantId}`);
    await this.recalculateAll(event.tenantId);
    this.triggerRealtimeUpdate(event.tenantId);
  }

  private triggerRealtimeUpdate(tenantId: string) {
    const metrics = this.metricsCache.get(tenantId);
    if (metrics) {
      this.realtime.broadcastToTenant(tenantId, 'metrics_update', metrics);
    }
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { TenantService } from '../../tenant/tenant.service';
import { EventProducerService } from '../../events/event-producer.service';
import { EVENT_TYPES } from '../../events/event.types';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantService: TenantService,
    private readonly events: EventProducerService,
  ) {}

  async checkIn(employeeId: string) {
    const tenantId = this.tenantService.getCurrentTenantId();

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId, isActive: true },
    });
    if (!employee) throw new NotFoundException('Employé introuvable');

    // Check if already checked in today (no checkout yet)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const openLog = await this.prisma.attendanceLog.findFirst({
      where: {
        tenantId,
        employeeId,
        checkOut: null,
        date: { gte: today },
      },
    });
    if (openLog) {
      throw new BadRequestException(
        "Employé déjà pointé — veuillez d'abord enregistrer la sortie",
      );
    }

    const log = await this.prisma.attendanceLog.create({
      data: {
        tenantId,
        employeeId,
        checkIn: new Date(),
      },
      include: { employee: true },
    });

    // Emit Event
    await this.events.emit(
      EVENT_TYPES.EMPLOYEE_ATTENDANCE_LOGGED,
      tenantId,
      'hr.attendance',
      log,
    );

    return log;
  }

  async checkOut(logId: string) {
    const tenantId = this.tenantService.getCurrentTenantId();

    const log = await this.prisma.attendanceLog.findFirst({
      where: { id: logId, tenantId, checkOut: null },
    });
    if (!log) {
      throw new NotFoundException("Aucun pointage d'entrée trouvé");
    }

    const updated = await this.prisma.attendanceLog.update({
      where: { id: logId },
      data: { checkOut: new Date() },
      include: { employee: true },
    });

    // Emit Event
    await this.events.emit(
      EVENT_TYPES.EMPLOYEE_ATTENDANCE_LOGGED,
      tenantId,
      'hr.attendance',
      updated,
    );

    return updated;
  }

  async getLogs(employeeId?: string, from?: string, to?: string) {
    const tenantId = this.tenantService.getCurrentTenantId();

    const fromDate = from
      ? new Date(from)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();

    return this.prisma.attendanceLog.findMany({
      where: {
        tenantId,
        ...(employeeId ? { employeeId } : {}),
        date: { gte: fromDate, lte: toDate },
      },
      include: { employee: true },
      orderBy: { date: 'desc' },
    });
  }
}

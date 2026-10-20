import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { TenantService } from '../../tenant/tenant.service';
import type { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantService: TenantService,
  ) {}

  async findAll(department?: string) {
    const tenantId = this.tenantService.getCurrentTenantId();
    return this.prisma.employee.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(department ? { department } : {}),
      },
      orderBy: [{ department: 'asc' }, { name: 'asc' }],
    });
  }

  async findOne(id: string) {
    const tenantId = this.tenantService.getCurrentTenantId();
    const employee = await this.prisma.employee.findFirst({
      where: { id, tenantId },
      include: {
        attendanceLogs: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });
    if (!employee) throw new NotFoundException('Employé introuvable');
    return employee;
  }

  async create(dto: CreateEmployeeDto) {
    const tenantId = this.tenantService.getCurrentTenantId();
    return this.prisma.employee.create({
      data: {
        tenantId,
        ...dto,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : new Date(),
      },
    });
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    await this.findOne(id);
    return this.prisma.employee.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.employee.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'Employé désactivé' };
  }
}

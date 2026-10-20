import { Module } from '@nestjs/common';
import { EmployeesService } from './employees/employees.service';
import { AttendanceService } from './attendance/attendance.service';
import { PrismaService } from '../prisma.service';
import { TenantModule } from '../tenant/tenant.module';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
} from './employees/dto/employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('hr/employees')
@UseGuards(JwtAuthGuard, RolesGuard)
class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  findAll(@Query('department') department?: string) {
    return this.employeesService.findAll(department);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.DIRECTOR)
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.DIRECTOR)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.employeesService.remove(id);
  }
}

@Controller('hr/attendance')
@UseGuards(JwtAuthGuard, RolesGuard)
class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  getLogs(
    @Query('employeeId') employeeId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.attendanceService.getLogs(employeeId, from, to);
  }

  @Post('check-in/:employeeId')
  checkIn(@Param('employeeId', ParseUUIDPipe) employeeId: string) {
    return this.attendanceService.checkIn(employeeId);
  }

  @Patch('check-out/:logId')
  checkOut(@Param('logId', ParseUUIDPipe) logId: string) {
    return this.attendanceService.checkOut(logId);
  }
}

@Module({
  imports: [TenantModule],
  providers: [EmployeesService, AttendanceService, PrismaService],
  controllers: [EmployeesController, AttendanceController],
  exports: [EmployeesService, AttendanceService],
})
export class HrModule {}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TenantService } from '../tenant/tenant.service';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { User } from '@prisma/client';

// Fields never exposed in responses
const USER_SELECT = {
  id: true,
  tenantId: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  // passwordHash and refreshToken excluded
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantService: TenantService,
  ) {}

  async findAll(): Promise<Partial<User>[]> {
    const tenantId = this.tenantService.getCurrentTenantId();
    return this.prisma.user.findMany({
      where: { tenantId, isActive: true },
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<Partial<User>> {
    const tenantId = this.tenantService.getCurrentTenantId();
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<Partial<User>> {
    const tenantId = this.tenantService.getCurrentTenantId();
    await this.findOne(id); // Validates tenant ownership
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: USER_SELECT,
    });
  }

  async remove(id: string): Promise<{ message: string }> {
    const tenantId = this.tenantService.getCurrentTenantId();
    await this.findOne(id); // Validates tenant ownership
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'Utilisateur désactivé' };
  }
}

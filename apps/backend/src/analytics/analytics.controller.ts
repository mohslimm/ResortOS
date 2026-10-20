import { Controller, Get, UseGuards } from '@nestjs/common';
import { AnalyticsService, TenantMetrics } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('dashboard-summary')
  @ApiOperation({ summary: 'Get current real-time metrics for the dashboard' })
  async getDashboardSummary(@CurrentUser() user: any): Promise<TenantMetrics> {
    return this.analytics.getTenantMetrics(user.tenantId);
  }
}

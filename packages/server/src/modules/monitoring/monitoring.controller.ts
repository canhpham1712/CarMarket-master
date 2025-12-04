import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { RealtimeMetricsService } from './realtime-metrics.service';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('monitoring')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class MonitoringController {
  constructor(private readonly realtimeMetricsService: RealtimeMetricsService) {}

  @Get('realtime')
  @RequirePermission('monitoring:view')
  async getRealtimeMetrics() {
    return await this.realtimeMetricsService.getRealtimeMetrics();
  }

  @Get('active-users')
  @RequirePermission('monitoring:view')
  async getActiveUsers() {
    const users = await this.realtimeMetricsService.getActiveUsers();
    const count = await this.realtimeMetricsService.getActiveUsersCount();
    return {
      count,
      users,
    };
  }

  @Get('api-stats')
  @RequirePermission('monitoring:view')
  async getApiStats() {
    return await this.realtimeMetricsService.getApiStats();
  }

  @Get('recent-calls')
  @RequirePermission('monitoring:view')
  async getRecentApiCalls(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return await this.realtimeMetricsService.getRecentApiCalls(limitNum);
  }

  @Get('errors')
  @RequirePermission('monitoring:view')
  async getRecentErrors(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 30;
    return await this.realtimeMetricsService.getRecentErrors(limitNum);
  }

  @Get('top-endpoints')
  @RequirePermission('monitoring:view')
  async getTopEndpoints(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return await this.realtimeMetricsService.getTopEndpoints(limitNum);
  }
}


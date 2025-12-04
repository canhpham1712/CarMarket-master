import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

@Controller('analytics')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard/:role')
  @RequirePermission('analytics:view')
  async getDashboardData(
    @Param('role') role: string,
    @Query('period') period: string = '30d',
    @CurrentUser() user: User,
  ) {
    // For seller and buyer, use their own user ID
    const userId = role === 'seller' || role === 'buyer' ? user.id : undefined;
    return this.analyticsService.getDashboardData(role, userId, period);
  }

  @Get('revenue')
  @RequirePermission('analytics:revenue')
  async getRevenue(
    @Query('period') period: string = '30d',
    @CurrentUser() user: User,
    @Request() req: any,
  ) {
    // Check if user has permission to view all revenue or just their own
    const hasFullAccess = req.user?.permissions?.includes('analytics:revenue');
    const userId = hasFullAccess ? undefined : user.id;

    return {
      metrics: await this.analyticsService.getRevenueMetrics(period, userId),
      timeSeries: await this.analyticsService.getRevenueTimeSeries(period, userId),
    };
  }

  @Get('users/growth')
  @RequirePermission('analytics:users')
  async getUserGrowth(@Query('period') period: string = '30d') {
    return {
      metrics: await this.analyticsService.getUserMetrics(period),
      timeSeries: await this.analyticsService.getUserGrowthTimeSeries(period),
    };
  }

  @Get('listings/performance')
  @RequirePermission('analytics:listings')
  async getListingPerformance(
    @Query('period') period: string = '30d',
    @CurrentUser() user: User,
    @Request() req: any,
  ) {
    const hasFullAccess = req.user?.permissions?.includes('analytics:listings');
    const userId = hasFullAccess ? undefined : user.id;

    return {
      metrics: await this.analyticsService.getListingMetrics(period, userId),
      timeSeries: await this.analyticsService.getListingPerformanceTimeSeries(
        period,
        userId,
      ),
      topListings: await this.analyticsService.getTopListings(10, userId),
    };
  }

  @Get('transactions')
  @RequirePermission('analytics:revenue')
  async getTransactions(
    @Query('period') period: string = '30d',
    @CurrentUser() user: User,
    @Request() req: any,
  ) {
    const hasFullAccess = req.user?.permissions?.includes('analytics:revenue');
    const userId = hasFullAccess ? undefined : user.id;

    return {
      metrics: await this.analyticsService.getTransactionMetrics(period, userId),
      timeSeries: await this.analyticsService.getTransactionTimeSeries(period, userId),
      paymentMethods: await this.analyticsService.getPaymentMethodBreakdown(
        period,
        userId,
      ),
    };
  }

  @Get('engagement')
  @RequirePermission('analytics:view')
  async getEngagement(
    @Query('period') period: string = '30d',
    @CurrentUser() user: User,
    @Request() req: any,
  ) {
    const hasFullAccess = req.user?.permissions?.includes('analytics:view');
    const userId = hasFullAccess ? undefined : user.id;

    return {
      metrics: await this.analyticsService.getEngagementMetrics(period, userId),
      timeSeries: await this.analyticsService.getEngagementTimeSeries(period, userId),
    };
  }

  @Get('geographic')
  @RequirePermission('analytics:view')
  async getGeographic() {
    return this.analyticsService.getGeographicDistribution();
  }
}


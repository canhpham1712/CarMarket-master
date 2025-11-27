import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationMetricsService } from './notification-metrics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly preferencesService: NotificationPreferencesService,
    private readonly metricsService: NotificationMetricsService,
  ) {}

  @Get()
  getUserNotifications(
    @CurrentUser() user: User,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('unreadOnly') unreadOnly: string = 'false',
    @Query('cursor') cursor?: string,
    @Query('type') type?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.notificationsService.getUserNotifications(
      user.id,
      parseInt(page),
      parseInt(limit),
      unreadOnly === 'true',
      cursor,
      type as any,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: User) {
    return this.notificationsService.getUnreadCount(user.id);
  }

  @Put(':id/read')
  markAsRead(
    @CurrentUser() user: User,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(notificationId, user.id);
  }

  @Put('read-all')
  markAllAsRead(@CurrentUser() user: User) {
    return this.notificationsService.markAllAsRead(user.id);
  }

  @Delete(':id')
  deleteNotification(
    @CurrentUser() user: User,
    @Param('id') notificationId: string,
  ) {
    return this.notificationsService.deleteNotification(notificationId, user.id);
  }

  @Get('preferences')
  async getPreferences(@CurrentUser() user: User) {
    return this.preferencesService.getUserPreferences(user.id);
  }

  @Put('preferences')
  async updatePreferences(
    @CurrentUser() user: User,
    @Body() body: {
      preferences?: Partial<Record<string, Partial<{ inApp: boolean; email: boolean; push: boolean }>>>;
      quietHours?: {
        enabled: boolean;
        start: string;
        end: string;
        timezone: string;
      } | null;
    },
  ) {
    return this.preferencesService.updateUserPreferences(
      user.id,
      body.preferences,
      body.quietHours,
    );
  }

  @Get('metrics')
  async getMetrics(@Query('hours') hours: string = '24') {
    return this.metricsService.getMetrics(parseInt(hours));
  }

  @Get('health')
  async getHealth() {
    return this.metricsService.checkHealth();
  }
}


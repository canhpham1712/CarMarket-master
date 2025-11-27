import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Notification } from '../../entities/notification.entity';
import { NotificationDeliveryLog, DeliveryStatus } from '../../entities/notification-delivery-log.entity';

export interface NotificationMetrics {
  totalNotifications: number;
  unreadNotifications: number;
  deliveryRate: number;
  failureRate: number;
  averageDeliveryTime: number;
  notificationsByType: Record<string, number>;
  recentActivity: Array<{
    timestamp: Date;
    type: string;
    status: string;
  }>;
}

@Injectable()
export class NotificationMetricsService {
  private readonly logger = new Logger(NotificationMetricsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationDeliveryLog)
    private readonly deliveryLogRepository: Repository<NotificationDeliveryLog>,
  ) {}

  /**
   * Get overall notification metrics
   */
  async getMetrics(timeWindowHours: number = 24): Promise<NotificationMetrics> {
    const timeWindow = new Date();
    timeWindow.setHours(timeWindow.getHours() - timeWindowHours);

    const [
      totalNotifications,
      unreadNotifications,
      deliveryLogs,
      notificationsByType,
    ] = await Promise.all([
      this.notificationRepository.count({
        where: {
          createdAt: MoreThan(timeWindow),
        },
      }),
      this.notificationRepository.count({
        where: {
          isRead: false,
        },
      }),
      this.deliveryLogRepository.find({
        where: {
          attemptedAt: MoreThan(timeWindow),
        },
      }),
      this.getNotificationsByType(timeWindow),
    ]);

    // Calculate delivery metrics
    const successfulDeliveries = deliveryLogs.filter(
      (log) => log.status === DeliveryStatus.DELIVERED || log.status === DeliveryStatus.SENT,
    ).length;
    const failedDeliveries = deliveryLogs.filter(
      (log) => log.status === DeliveryStatus.FAILED,
    ).length;
    const totalDeliveries = deliveryLogs.length;

    const deliveryRate = totalDeliveries > 0
      ? (successfulDeliveries / totalDeliveries) * 100
      : 100;

    const failureRate = totalDeliveries > 0
      ? (failedDeliveries / totalDeliveries) * 100
      : 0;

    // Calculate average delivery time
    const deliveredLogs = deliveryLogs.filter(
      (log) => log.deliveredAt && log.attemptedAt,
    );
    const averageDeliveryTime = deliveredLogs.length > 0
      ? deliveredLogs.reduce((sum, log) => {
          const deliveryTime = log.deliveredAt!.getTime() - log.attemptedAt.getTime();
          return sum + deliveryTime;
        }, 0) / deliveredLogs.length
      : 0;

    // Get recent activity
    const recentActivity = await this.getRecentActivity(timeWindow);

    return {
      totalNotifications,
      unreadNotifications,
      deliveryRate,
      failureRate,
      averageDeliveryTime,
      notificationsByType,
      recentActivity,
    };
  }

  /**
   * Get notifications count by type
   */
  private async getNotificationsByType(
    timeWindow: Date,
  ): Promise<Record<string, number>> {
    const notifications = await this.notificationRepository.find({
      where: {
        createdAt: MoreThan(timeWindow),
      },
      select: ['type'],
    });

    const counts: Record<string, number> = {};
    for (const notification of notifications) {
      counts[notification.type] = (counts[notification.type] || 0) + 1;
    }

    return counts;
  }

  /**
   * Get recent activity
   */
  private async getRecentActivity(timeWindow: Date): Promise<Array<{
    timestamp: Date;
    type: string;
    status: string;
  }>> {
    const logs = await this.deliveryLogRepository.find({
      where: {
        attemptedAt: MoreThan(timeWindow),
      },
      order: {
        attemptedAt: 'DESC',
      },
      take: 100,
      relations: ['notification'],
    });

    return logs.map((log) => ({
      timestamp: log.attemptedAt,
      type: log.channel,
      status: log.status,
    }));
  }

  /**
   * Track notification creation
   */
  async trackNotificationCreated(notification: Notification): Promise<void> {
    this.logger.debug(
      `Notification created: ${notification.id}, type: ${notification.type}, user: ${notification.userId}`,
    );
  }

  /**
   * Track notification delivery
   */
  async trackDelivery(
    notificationId: string,
    channel: string,
    success: boolean,
    duration?: number,
  ): Promise<void> {
    this.logger.debug(
      `Notification delivery tracked: ${notificationId}, channel: ${channel}, success: ${success}, duration: ${duration}ms`,
    );
  }

  /**
   * Check if metrics indicate issues
   */
  async checkHealth(): Promise<{
    healthy: boolean;
    issues: string[];
  }> {
    const metrics = await this.getMetrics(1); // Last hour
    const issues: string[] = [];

    if (metrics.failureRate > 5) {
      issues.push(`High failure rate: ${metrics.failureRate.toFixed(2)}%`);
    }

    if (metrics.deliveryRate < 95) {
      issues.push(`Low delivery rate: ${metrics.deliveryRate.toFixed(2)}%`);
    }

    return {
      healthy: issues.length === 0,
      issues,
    };
  }
}


import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../entities/notification.entity';
import { NotificationPreferencesService } from './notification-preferences.service';
import { EmailNotificationService } from './channels/email-notification.service';
import { PushNotificationService } from './channels/push-notification.service';
import { NotificationDeliveryLog, DeliveryChannel, DeliveryStatus } from '../../entities/notification-delivery-log.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class NotificationDeliveryService {
  private readonly logger = new Logger(NotificationDeliveryService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(NotificationDeliveryLog)
    private readonly deliveryLogRepository: Repository<NotificationDeliveryLog>,
    @Optional() @Inject(NotificationPreferencesService)
    private readonly preferencesService?: NotificationPreferencesService,
    @Optional() @Inject(EmailNotificationService)
    private readonly emailService?: EmailNotificationService,
    @Optional() @Inject(PushNotificationService)
    private readonly pushService?: PushNotificationService,
  ) {}

  /**
   * Deliver notification through all enabled channels
   */
  async deliverNotification(
    notification: Notification,
    userId: string,
  ): Promise<void> {
    // Get user to access email
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'isEmailVerified'],
    });

    if (!user) {
      this.logger.warn(`User ${userId} not found for notification delivery`);
      return;
    }

    // Deliver through each channel based on preferences
    const channels: Array<{ channel: DeliveryChannel; enabled: boolean }> = [];

    if (this.preferencesService) {
      // Check preferences for each channel
      const inAppEnabled = await this.preferencesService.isNotificationEnabled(
        userId,
        notification.type,
        'inApp',
      );
      const emailEnabled = await this.preferencesService.isNotificationEnabled(
        userId,
        notification.type,
        'email',
      );
      const pushEnabled = await this.preferencesService.isNotificationEnabled(
        userId,
        notification.type,
        'push',
      );

      channels.push(
        { channel: DeliveryChannel.IN_APP, enabled: inAppEnabled },
        { channel: DeliveryChannel.EMAIL, enabled: emailEnabled && user.isEmailVerified },
        { channel: DeliveryChannel.PUSH, enabled: pushEnabled },
      );
    } else {
      // Default: only in-app if preferences service not available
      channels.push({ channel: DeliveryChannel.IN_APP, enabled: true });
    }

    // Deliver through each enabled channel
    for (const { channel, enabled } of channels) {
      if (!enabled) {
        continue;
      }

      try {
        await this.deliverToChannel(notification, user.email, channel);
      } catch (error) {
        this.logger.error(
          `Failed to deliver notification ${notification.id} via ${channel}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }

  /**
   * Deliver notification to a specific channel
   */
  private async deliverToChannel(
    notification: Notification,
    userEmail: string,
    channel: DeliveryChannel,
  ): Promise<void> {
    // Log delivery attempt
    const log = this.deliveryLogRepository.create({
      notificationId: notification.id,
      channel,
      status: DeliveryStatus.PENDING,
      retryCount: 0,
    });
    await this.deliveryLogRepository.save(log);

    try {
      let success = false;

      switch (channel) {
        case DeliveryChannel.EMAIL:
          if (this.emailService?.isAvailable()) {
            success = await this.emailService.sendEmailNotification(
              userEmail,
              notification,
            );
          }
          break;
        case DeliveryChannel.PUSH:
          if (this.pushService?.isAvailable()) {
            // TODO: Get user's push subscription from database
            // For now, push notifications require client-side subscription
            this.logger.debug('Push notifications require client subscription');
            success = false;
          }
          break;
        case DeliveryChannel.IN_APP:
          // In-app is handled by WebSocket gateway, so we just mark as sent
          success = true;
          break;
      }

      // Update delivery log
      log.status = success ? DeliveryStatus.SENT : DeliveryStatus.FAILED;
      if (success) {
        log.deliveredAt = new Date();
      }
      await this.deliveryLogRepository.save(log);
    } catch (error) {
      log.status = DeliveryStatus.FAILED;
      log.error = error instanceof Error ? error.message : String(error);
      log.retryCount = 1;
      await this.deliveryLogRepository.save(log);
      throw error;
    }
  }

  /**
   * Get delivery status for a notification
   */
  async getDeliveryStatus(notificationId: string): Promise<NotificationDeliveryLog[]> {
    return this.deliveryLogRepository.find({
      where: { notificationId },
      order: { attemptedAt: 'DESC' },
    });
  }
}


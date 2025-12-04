import { Injectable, Optional, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Notification,
  NotificationType,
} from '../../entities/notification.entity';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationRetryService } from './notification-retry.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationCacheService } from './notification-cache.service';
import { NotificationDeliveryLog, DeliveryChannel, DeliveryStatus } from '../../entities/notification-delivery-log.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @Optional() @Inject(NotificationsGateway)
    private readonly notificationsGateway?: NotificationsGateway,
    @Optional() @Inject(NotificationRetryService)
    private readonly retryService?: NotificationRetryService,
    @Optional() @Inject(NotificationPreferencesService)
    private readonly preferencesService?: NotificationPreferencesService,
    @Optional() @Inject(NotificationDeliveryService)
    private readonly deliveryService?: NotificationDeliveryService,
    @Optional() @Inject(NotificationCacheService)
    private readonly cacheService?: NotificationCacheService,
    @InjectRepository(NotificationDeliveryLog)
    private readonly deliveryLogRepository?: Repository<NotificationDeliveryLog>,
  ) {}

  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    relatedListingId?: string | null,
    metadata?: Record<string, any>,
  ): Promise<Notification | null> {
    // Check user preferences before creating notification
    if (this.preferencesService) {
      // Check if notification is enabled for in-app channel
      const isEnabled = await this.preferencesService.isNotificationEnabled(
        userId,
        type,
        'inApp',
      );

      if (!isEnabled) {
        this.logger.debug(
          `Skipping notification ${type} for user ${userId} - in-app notifications disabled`,
        );
        return null;
      }

      // Check quiet hours
      const isQuietHours = await this.preferencesService.isQuietHours(userId);
      if (isQuietHours) {
        this.logger.debug(
          `Skipping notification ${type} for user ${userId} - quiet hours active`,
        );
        return null;
      }
    }
    const notification = this.notificationRepository.create({
      userId,
      type,
      title,
      message,
      relatedListingId: relatedListingId || null,
      metadata: metadata || null,
      isRead: false,
    });

    const savedNotification = await this.notificationRepository.save(notification);

    // Invalidate unread count cache
    if (this.cacheService) {
      this.cacheService.delete(`unread_count:${userId}`);
    }

    // Load relations for real-time emit
    const notificationWithRelations = await this.notificationRepository.findOne({
      where: { id: savedNotification.id },
      relations: ['relatedListing'],
    });

    // Send real-time notification
    if (notificationWithRelations && this.notificationsGateway) {
      try {
        this.notificationsGateway.sendNotificationToUser(
          userId,
          notificationWithRelations,
        );

        // Update notification unread count
        const unreadCount = await this.getUnreadCount(userId);
        this.notificationsGateway.sendNotificationUnreadCountUpdateToUser(userId, unreadCount);

        // Deliver through other channels (email, push) if enabled
        if (this.deliveryService && notificationWithRelations) {
          this.deliveryService.deliverNotification(notificationWithRelations, userId).catch((deliveryError) => {
            this.logger.warn(
              `Failed to deliver notification ${savedNotification.id} through other channels`,
              deliveryError instanceof Error ? deliveryError.message : String(deliveryError),
            );
          });
        }
      } catch (error) {
        // Log error with context
        this.logger.error(
          `Failed to send notification ${savedNotification.id} to user ${userId} via WebSocket`,
          error instanceof Error ? error.stack : String(error),
        );

        // Log delivery failure
        await this.logDeliveryFailure(
          savedNotification.id,
          DeliveryChannel.IN_APP,
          error instanceof Error ? error.message : String(error),
        );

        // If delivery fails, add to retry queue
        if (this.retryService) {
          try {
            await this.retryService.addToRetryQueue(
              savedNotification.id,
              userId,
              0,
            );
          } catch (retryError) {
            this.logger.error(
              `Failed to add notification ${savedNotification.id} to retry queue`,
              retryError instanceof Error ? retryError.stack : String(retryError),
            );
          }
        }
      }
    }

    return savedNotification;
  }

  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false,
    cursor?: string,
    type?: NotificationType,
    startDate?: Date,
    endDate?: Date,
  ) {
    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .leftJoinAndSelect('notification.relatedListing', 'listing')
      .orderBy('notification.createdAt', 'DESC')
      .addOrderBy('notification.id', 'DESC'); // Secondary sort for consistent cursor

    if (unreadOnly) {
      queryBuilder.andWhere('notification.isRead = :isRead', { isRead: false });
    }

    if (type) {
      queryBuilder.andWhere('notification.type = :type', { type });
    }

    if (startDate) {
      queryBuilder.andWhere('notification.createdAt >= :startDate', { startDate });
    }

    if (endDate) {
      queryBuilder.andWhere('notification.createdAt <= :endDate', { endDate });
    }

    // Cursor-based pagination
    if (cursor) {
      try {
        // Decode cursor (format: timestamp_id)
        const parts = cursor.split('_');
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
          throw new Error('Invalid cursor format');
        }
        const [timestamp, id] = parts;
        const cursorDate = new Date(parseInt(timestamp));
        
        queryBuilder.andWhere(
          '(notification.createdAt < :cursorDate OR (notification.createdAt = :cursorDate AND notification.id < :cursorId))',
          { cursorDate, cursorId: id },
        );
      } catch (error) {
        this.logger.warn(`Invalid cursor format: ${cursor}`);
        // Fall back to regular pagination
      }
    }

    // For cursor-based, we fetch limit + 1 to check if there's more
    const fetchLimit = cursor ? limit + 1 : limit;
    const skip = cursor ? 0 : (page - 1) * limit;

    const notifications = await queryBuilder
      .skip(skip)
      .take(fetchLimit)
      .getMany();

    // Determine if there are more results (for cursor-based)
    let hasMore = false;
    let nextCursor: string | undefined;
    
    if (cursor && notifications.length > limit) {
      hasMore = true;
      const lastNotification = notifications[limit - 1];
      if (lastNotification) {
        nextCursor = `${lastNotification.createdAt.getTime()}_${lastNotification.id}`;
      }
      notifications.pop(); // Remove the extra one
    }

    // For offset-based pagination, get total count
    let total: number | undefined;
    let totalPages: number | undefined;
    
    if (!cursor) {
      const countQueryBuilder = this.notificationRepository
        .createQueryBuilder('notification')
        .where('notification.userId = :userId', { userId });

      if (unreadOnly) {
        countQueryBuilder.andWhere('notification.isRead = :isRead', { isRead: false });
      }

      if (type) {
        countQueryBuilder.andWhere('notification.type = :type', { type });
      }

      if (startDate) {
        countQueryBuilder.andWhere('notification.createdAt >= :startDate', { startDate });
      }

      if (endDate) {
        countQueryBuilder.andWhere('notification.createdAt <= :endDate', { endDate });
      }

      total = await countQueryBuilder.getCount();
      totalPages = Math.ceil(total / limit);
    }

    return {
      notifications,
      pagination: {
        page: cursor ? undefined : page,
        limit,
        total,
        totalPages,
        cursor: nextCursor,
        hasMore,
      },
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    // Try cache first
    const cacheKey = `unread_count:${userId}`;
    if (this.cacheService) {
      const cached = this.cacheService.get<number>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    // Query database
    const count = await this.notificationRepository.count({
      where: {
        userId,
        isRead: false,
      },
    });

    // Cache for 1 minute
    if (this.cacheService) {
      this.cacheService.set(cacheKey, count, 60000);
    }

    return count;
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const notification = await this.notificationRepository.findOne({
        where: { id: notificationId, userId },
      });

      if (!notification) {
        this.logger.warn(
          `Attempted to mark non-existent notification ${notificationId} as read by user ${userId}`,
        );
        throw new Error('Notification not found');
      }

      await this.notificationRepository.update(notificationId, {
        isRead: true,
      });

      // Invalidate unread count cache
      if (this.cacheService) {
        this.cacheService.delete(`unread_count:${userId}`);
      }

      // Send real-time update
      if (this.notificationsGateway) {
        try {
          this.notificationsGateway.sendNotificationUpdateToUser(userId, {
            type: 'read',
            notificationId,
          });

          // Update notification unread count
          const unreadCount = await this.getUnreadCount(userId);
          this.notificationsGateway.sendNotificationUnreadCountUpdateToUser(userId, unreadCount);
        } catch (error) {
          this.logger.warn(
            `Failed to send real-time update for notification ${notificationId} read status`,
            error instanceof Error ? error.message : String(error),
          );
          // Don't throw - the database update succeeded
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to mark notification ${notificationId} as read for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
      await this.notificationRepository.update(
        { userId, isRead: false },
        { isRead: true },
      );

      // Invalidate unread count cache
      if (this.cacheService) {
        this.cacheService.delete(`unread_count:${userId}`);
      }

    // Update unread count
    if (this.notificationsGateway) {
      const unreadCount = await this.getUnreadCount(userId);
      this.notificationsGateway.sendNotificationUnreadCountUpdateToUser(userId, unreadCount);
    }
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      // Check if notification was unread before deleting
      const notification = await this.notificationRepository.findOne({
        where: { id: notificationId, userId },
        select: ['isRead'],
      });

      const result = await this.notificationRepository.delete({
        id: notificationId,
        userId,
      });

      // Invalidate cache if notification was unread
      if (notification && !notification.isRead && this.cacheService) {
        this.cacheService.delete(`unread_count:${userId}`);
      }

      if (result.affected === 0) {
        this.logger.warn(
          `Attempted to delete non-existent notification ${notificationId} by user ${userId}`,
        );
        throw new Error('Notification not found');
      }

      // Send real-time update
      if (this.notificationsGateway) {
        try {
          this.notificationsGateway.sendNotificationUpdateToUser(userId, {
            type: 'deleted',
            notificationId,
          });

          // Update notification unread count
          const unreadCount = await this.getUnreadCount(userId);
          this.notificationsGateway.sendNotificationUnreadCountUpdateToUser(userId, unreadCount);
        } catch (error) {
          this.logger.warn(
            `Failed to send real-time update for notification ${notificationId} deletion`,
            error instanceof Error ? error.message : String(error),
          );
          // Don't throw - the database deletion succeeded
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to delete notification ${notificationId} for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Update or create a notification for a new message.
   * If there's already an unread notification for this conversation within 5 minutes, update it.
   * Otherwise, create a new one.
   */
  async updateOrCreateMessageNotification(
    userId: string,
    conversationId: string,
    senderName: string,
    relatedListingId?: string | null,
    metadata?: Record<string, any>,
  ): Promise<Notification | null> {
    // Check if there's an unread notification for this conversation within last 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const existingNotification = await this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .andWhere('notification.type = :type', { type: NotificationType.NEW_MESSAGE })
      .andWhere('notification.isRead = :isRead', { isRead: false })
      .andWhere("notification.metadata->>'conversationId' = :conversationId", {
        conversationId,
      })
      .andWhere('notification.createdAt > :fiveMinutesAgo', { fiveMinutesAgo })
      .orderBy('notification.createdAt', 'DESC')
      .getOne();

    if (existingNotification) {
      // Update existing notification - group with previous one
      const messageCount = (existingNotification.metadata?.messageCount || 1) + 1;
      existingNotification.message = messageCount > 1 
        ? `${messageCount} new messages from ${senderName}`
        : `New message from ${senderName}`;
      existingNotification.updatedAt = new Date();
      if (metadata) {
        existingNotification.metadata = {
          ...existingNotification.metadata,
          ...metadata,
          messageCount,
        };
      } else {
        existingNotification.metadata = {
          ...existingNotification.metadata,
          messageCount,
        };
      }
      
      // Use same groupId if exists, otherwise use notification id as groupId
      if (!existingNotification.groupId) {
        existingNotification.groupId = existingNotification.id;
      }

      const updatedNotification = await this.notificationRepository.save(
        existingNotification,
      );

      // Load relations for real-time emit
      const notificationWithRelations = await this.notificationRepository.findOne({
        where: { id: updatedNotification.id },
        relations: ['relatedListing'],
      });

      // Send real-time notification update
      if (notificationWithRelations && this.notificationsGateway) {
        try {
          this.notificationsGateway.sendNotificationToUser(
            userId,
            notificationWithRelations,
          );

          // Update unread count
          const unreadCount = await this.getUnreadCount(userId);
          this.notificationsGateway.sendNotificationUnreadCountUpdateToUser(userId, unreadCount);
        } catch (error) {
          // Log error with context
          this.logger.error(
            `Failed to send notification update ${updatedNotification.id} to user ${userId} via WebSocket`,
            error instanceof Error ? error.stack : String(error),
          );

          // Log delivery failure
          await this.logDeliveryFailure(
            updatedNotification.id,
            DeliveryChannel.IN_APP,
            error instanceof Error ? error.message : String(error),
          );

          // If delivery fails, add to retry queue
          if (this.retryService) {
            try {
              await this.retryService.addToRetryQueue(
                updatedNotification.id,
                userId,
                0,
              );
            } catch (retryError) {
              this.logger.error(
                `Failed to add notification ${updatedNotification.id} to retry queue`,
                retryError instanceof Error ? retryError.stack : String(retryError),
              );
            }
          }
        }
      }

      return updatedNotification;
    } else {
      // Create new notification
      const newMetadata = {
        ...metadata,
        messageCount: 1,
      };
      const notification = await this.createNotification(
        userId,
        NotificationType.NEW_MESSAGE,
        'New Message',
        `New message from ${senderName}`,
        relatedListingId,
        newMetadata,
      );
      
      // Set groupId to notification id for future grouping
      if (notification) {
        notification.groupId = notification.id;
        return await this.notificationRepository.save(notification);
      }
      
      return null;
    }
  }

  /**
   * Group similar notifications (inquiries, system notifications)
   */
  async groupOrCreateNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    relatedListingId?: string | null,
    metadata?: Record<string, any>,
    groupingWindowMinutes: number = 60,
  ): Promise<Notification | null> {
    // Only group certain notification types
    const groupableTypes = [
      NotificationType.NEW_INQUIRY,
      NotificationType.SYSTEM,
    ];

    if (!groupableTypes.includes(type)) {
      // Not a groupable type, create normally
      return await this.createNotification(
        userId,
        type,
        title,
        message,
        relatedListingId,
        metadata,
      );
    }

    // Check for existing unread notification of same type within grouping window
    const windowStart = new Date(Date.now() - groupingWindowMinutes * 60 * 1000);
    
    const existingNotification = await this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId })
      .andWhere('notification.type = :type', { type })
      .andWhere('notification.isRead = :isRead', { isRead: false })
      .andWhere('notification.createdAt > :windowStart', { windowStart })
      .orderBy('notification.createdAt', 'DESC')
      .getOne();

    if (existingNotification) {
      // Update existing notification with count
      const count = (existingNotification.metadata?.count || 1) + 1;
      existingNotification.message = count > 1
        ? `${count} ${type === NotificationType.NEW_INQUIRY ? 'new inquiries' : 'system notifications'}`
        : message;
      existingNotification.updatedAt = new Date();
      
      if (!existingNotification.groupId) {
        existingNotification.groupId = existingNotification.id;
      }
      
      existingNotification.metadata = {
        ...existingNotification.metadata,
        ...metadata,
        count,
      };

      const updated = await this.notificationRepository.save(existingNotification);
      
      // Send real-time update
      if (this.notificationsGateway) {
        try {
          const notificationWithRelations = await this.notificationRepository.findOne({
            where: { id: updated.id },
            relations: ['relatedListing'],
          });
          
          if (notificationWithRelations) {
            this.notificationsGateway.sendNotificationToUser(
              userId,
              notificationWithRelations,
            );
            const unreadCount = await this.getUnreadCount(userId);
            this.notificationsGateway.sendNotificationUnreadCountUpdateToUser(userId, unreadCount);
          }
        } catch (error) {
          this.logger.warn('Failed to send grouped notification update', error);
        }
      }

      return updated;
    } else {
      // Create new notification
      const newMetadata = {
        ...metadata,
        count: 1,
      };
      const notification = await this.createNotification(
        userId,
        type,
        title,
        message,
        relatedListingId,
        newMetadata,
      );
      
      if (notification) {
        notification.groupId = notification.id;
        return await this.notificationRepository.save(notification);
      }
      
      return null;
    }
  }

  /**
   * Archive old notifications (older than specified days)
   */
  async archiveOldNotifications(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    try {
      // Mark old read notifications as archived (or delete them)
      // For now, we'll just delete very old read notifications
      const result = await this.notificationRepository
        .createQueryBuilder()
        .delete()
        .from(Notification)
        .where('isRead = :isRead', { isRead: true })
        .andWhere('createdAt < :cutoffDate', { cutoffDate })
        .execute();

      this.logger.log(`Archived ${result.affected || 0} old notifications`);
      return result.affected || 0;
    } catch (error) {
      this.logger.error('Failed to archive old notifications:', error);
      throw error;
    }
  }

  /**
   * Log delivery failure
   */
  private async logDeliveryFailure(
    notificationId: string,
    channel: DeliveryChannel,
    error: string,
  ): Promise<void> {
    if (!this.deliveryLogRepository) {
      return;
    }

    try {
      const log = this.deliveryLogRepository.create({
        notificationId,
        channel,
        status: DeliveryStatus.FAILED,
        retryCount: 0,
        error,
        deliveredAt: null,
      });
      await this.deliveryLogRepository.save(log);
    } catch (logError) {
      this.logger.error(
        `Failed to log delivery failure for notification ${notificationId}`,
        logError instanceof Error ? logError.stack : String(logError),
      );
    }
  }
}


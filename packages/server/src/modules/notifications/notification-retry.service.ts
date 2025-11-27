import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../entities/notification.entity';
import { NotificationDeliveryLog, DeliveryChannel, DeliveryStatus } from '../../entities/notification-delivery-log.entity';
import { NotificationsGateway } from './notifications.gateway';

export interface RetryQueueItem {
  notificationId: string;
  userId: string;
  attemptCount: number;
  nextRetryAt: Date;
  maxRetries: number;
}

@Injectable()
export class NotificationRetryService {
  private readonly logger = new Logger(NotificationRetryService.name);
  private retryQueue: Map<string, RetryQueueItem> = new Map();
  private readonly maxRetries = 5;
  private readonly baseDelay = 1000; // 1 second
  private readonly maxDelay = 300000; // 5 minutes
  private retryInterval: NodeJS.Timeout | null = null;

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(NotificationDeliveryLog)
    private readonly deliveryLogRepository: Repository<NotificationDeliveryLog>,
    private readonly notificationsGateway: NotificationsGateway,
  ) {
    this.startRetryProcessor();
  }

  /**
   * Add a notification to the retry queue
   */
  async addToRetryQueue(
    notificationId: string,
    userId: string,
    attemptCount: number = 0,
  ): Promise<void> {
    const nextRetryAt = this.calculateNextRetryTime(attemptCount);
    
    const queueItem: RetryQueueItem = {
      notificationId,
      userId,
      attemptCount,
      nextRetryAt,
      maxRetries: this.maxRetries,
    };

    this.retryQueue.set(notificationId, queueItem);
    this.logger.debug(
      `Added notification ${notificationId} to retry queue (attempt ${attemptCount + 1}/${this.maxRetries})`,
    );
  }

  /**
   * Remove a notification from the retry queue (successful delivery)
   */
  removeFromRetryQueue(notificationId: string): void {
    if (this.retryQueue.delete(notificationId)) {
      this.logger.debug(`Removed notification ${notificationId} from retry queue`);
    }
  }

  /**
   * Calculate next retry time using exponential backoff
   */
  private calculateNextRetryTime(attemptCount: number): Date {
    const delay = Math.min(
      this.baseDelay * Math.pow(2, attemptCount),
      this.maxDelay,
    );
    return new Date(Date.now() + delay);
  }

  /**
   * Start the retry processor that checks the queue periodically
   */
  private startRetryProcessor(): void {
    // Check retry queue every 10 seconds
    this.retryInterval = setInterval(() => {
      this.processRetryQueue().catch((error) => {
        this.logger.error('Error processing retry queue:', error);
      });
    }, 10000);
  }

  /**
   * Process items in the retry queue that are ready for retry
   */
  private async processRetryQueue(): Promise<void> {
    const now = new Date();
    const readyItems: RetryQueueItem[] = [];

    // Find items ready for retry
    for (const item of this.retryQueue.values()) {
      if (item.nextRetryAt <= now && item.attemptCount < item.maxRetries) {
        readyItems.push(item);
      }
    }

    // Process ready items
    for (const item of readyItems) {
      await this.retryNotificationDelivery(item);
    }
  }

  /**
   * Retry delivering a notification
   */
  private async retryNotificationDelivery(item: RetryQueueItem): Promise<void> {
    try {
      // Load notification from database
      const notification = await this.notificationRepository.findOne({
        where: { id: item.notificationId },
        relations: ['relatedListing'],
      });

      if (!notification) {
        this.logger.warn(
          `Notification ${item.notificationId} not found, removing from retry queue`,
        );
        this.removeFromRetryQueue(item.notificationId);
        return;
      }

      // Attempt to deliver via WebSocket
      try {
        this.notificationsGateway.sendNotificationToUser(
          item.userId,
          notification,
        );

        // Log successful delivery
        await this.logDelivery(
          item.notificationId,
          DeliveryChannel.IN_APP,
          DeliveryStatus.DELIVERED,
          item.attemptCount,
        );

        // Success - remove from retry queue
        this.removeFromRetryQueue(item.notificationId);
        this.logger.log(
          `Successfully retried delivery of notification ${item.notificationId}`,
        );
      } catch (error) {
        // Log failed delivery
        await this.logDelivery(
          item.notificationId,
          DeliveryChannel.IN_APP,
          DeliveryStatus.FAILED,
          item.attemptCount,
          error instanceof Error ? error.message : String(error),
        );
        // Delivery failed - increment attempt count
        const newAttemptCount = item.attemptCount + 1;

        if (newAttemptCount >= item.maxRetries) {
          // Max retries reached - move to dead letter queue
          await this.moveToDeadLetterQueue(item, error);
          this.removeFromRetryQueue(item.notificationId);
        } else {
          // Update retry queue item
          const nextRetryAt = this.calculateNextRetryTime(newAttemptCount);
          this.retryQueue.set(item.notificationId, {
            ...item,
            attemptCount: newAttemptCount,
            nextRetryAt,
          });
          this.logger.warn(
            `Retry attempt ${newAttemptCount} failed for notification ${item.notificationId}, will retry at ${nextRetryAt.toISOString()}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error retrying notification ${item.notificationId}:`,
        error,
      );
    }
  }

  /**
   * Move failed notification to dead letter queue
   */
  private async moveToDeadLetterQueue(
    item: RetryQueueItem,
    error: any,
  ): Promise<void> {
    this.logger.error(
      `Notification ${item.notificationId} exceeded max retries (${item.maxRetries}), moving to dead letter queue. Error: ${error.message || error}`,
    );

    // In a production system, you would:
    // 1. Store in a dead_letter_queue table
    // 2. Send alert to monitoring system
    // 3. Log for manual investigation
    
    // For now, we'll just log it
    // TODO: Implement dead letter queue storage
  }

  /**
   * Get retry queue statistics
   */
  getRetryQueueStats(): {
    queueSize: number;
    items: Array<{
      notificationId: string;
      attemptCount: number;
      nextRetryAt: Date;
    }>;
  } {
    return {
      queueSize: this.retryQueue.size,
      items: Array.from(this.retryQueue.values()).map((item) => ({
        notificationId: item.notificationId,
        attemptCount: item.attemptCount,
        nextRetryAt: item.nextRetryAt,
      })),
    };
  }

  /**
   * Log delivery attempt
   */
  private async logDelivery(
    notificationId: string,
    channel: DeliveryChannel,
    status: DeliveryStatus,
    retryCount: number,
    error?: string,
  ): Promise<void> {
    try {
      const log = this.deliveryLogRepository.create({
        notificationId,
        channel,
        status,
        retryCount,
        error: error || null,
        deliveredAt: status === DeliveryStatus.DELIVERED ? new Date() : null,
      });
      await this.deliveryLogRepository.save(log);
    } catch (logError) {
      this.logger.error('Failed to log delivery:', logError);
    }
  }

  /**
   * Cleanup on module destroy
   */
  onModuleDestroy(): void {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }
  }
}


import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference, ChannelPreferences, QuietHours } from '../../entities/notification-preference.entity';
import { NotificationType } from '../../entities/notification.entity';

@Injectable()
export class NotificationPreferencesService {
  private readonly logger = new Logger(NotificationPreferencesService.name);

  // Default preferences for new users
  private readonly defaultPreferences: Record<NotificationType, ChannelPreferences> = {
    [NotificationType.LISTING_APPROVED]: { inApp: true, email: true, push: false },
    [NotificationType.LISTING_REJECTED]: { inApp: true, email: true, push: false },
    [NotificationType.NEW_MESSAGE]: { inApp: true, email: false, push: true },
    [NotificationType.LISTING_SOLD]: { inApp: true, email: true, push: false },
    [NotificationType.NEW_INQUIRY]: { inApp: true, email: false, push: true },
    [NotificationType.COMMENT_REPORTED]: { inApp: true, email: false, push: false },
    [NotificationType.SYSTEM]: { inApp: true, email: false, push: false },
  };

  constructor(
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepository: Repository<NotificationPreference>,
  ) {}

  /**
   * Get user preferences, creating default if not exists
   */
  async getUserPreferences(userId: string): Promise<NotificationPreference> {
    let preference = await this.preferenceRepository.findOne({
      where: { userId },
    });

    if (!preference) {
      // Create default preferences
      preference = this.preferenceRepository.create({
        userId,
        preferences: this.defaultPreferences,
        quietHours: null,
      });
      preference = await this.preferenceRepository.save(preference);
      this.logger.log(`Created default preferences for user ${userId}`);
    }

    return preference;
  }

  /**
   * Update user preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences?: Partial<Record<NotificationType, Partial<ChannelPreferences>>>,
    quietHours?: QuietHours | null,
  ): Promise<NotificationPreference> {
    let preference = await this.preferenceRepository.findOne({
      where: { userId },
    });

    if (!preference) {
      // Create with defaults
      preference = this.preferenceRepository.create({
        userId,
        preferences: this.defaultPreferences,
        quietHours: null,
      });
    }

    // Update preferences if provided
    if (preferences) {
      for (const [type, channelPrefs] of Object.entries(preferences)) {
        if (preference.preferences[type as NotificationType]) {
          preference.preferences[type as NotificationType] = {
            ...preference.preferences[type as NotificationType],
            ...channelPrefs,
          };
        }
      }
    }

    // Update quiet hours if provided
    if (quietHours !== undefined) {
      preference.quietHours = quietHours;
    }

    // Validate quiet hours format
    if (preference.quietHours?.enabled) {
      this.validateQuietHours(preference.quietHours);
    }

    preference = await this.preferenceRepository.save(preference);
    this.logger.log(`Updated preferences for user ${userId}`);

    return preference;
  }

  /**
   * Check if notification type is enabled for a channel
   */
  async isNotificationEnabled(
    userId: string,
    type: NotificationType,
    channel: 'inApp' | 'email' | 'push' = 'inApp',
  ): Promise<boolean> {
    const preference = await this.getUserPreferences(userId);
    return preference.preferences[type]?.[channel] ?? false;
  }

  /**
   * Check if current time is within quiet hours
   */
  async isQuietHours(userId: string): Promise<boolean> {
    const preference = await this.getUserPreferences(userId);

    if (!preference.quietHours?.enabled) {
      return false;
    }

    const { start, end } = preference.quietHours;
    const now = new Date();
    
    // Convert to user's timezone (simplified - in production use proper timezone library)
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const startParts = start.split(':').map(Number);
    const endParts = end.split(':').map(Number);
    const startHour = startParts[0] ?? 0;
    const startMinute = startParts[1] ?? 0;
    const endHour = endParts[0] ?? 0;
    const endMinute = endParts[1] ?? 0;
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (startTime <= endTime) {
      // Same day range (e.g., 09:00 - 17:00)
      return currentTime >= startTime && currentTime < endTime;
    } else {
      // Overnight range (e.g., 22:00 - 08:00)
      return currentTime >= startTime || currentTime < endTime;
    }
  }

  /**
   * Validate quiet hours format
   */
  private validateQuietHours(quietHours: QuietHours): void {
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (!timeRegex.test(quietHours.start)) {
      throw new Error(`Invalid quiet hours start time format: ${quietHours.start}. Expected HH:mm format.`);
    }

    if (!timeRegex.test(quietHours.end)) {
      throw new Error(`Invalid quiet hours end time format: ${quietHours.end}. Expected HH:mm format.`);
    }

    if (!quietHours.timezone) {
      throw new Error('Timezone is required when quiet hours are enabled.');
    }
  }

  /**
   * Delete user preferences
   */
  async deleteUserPreferences(userId: string): Promise<void> {
    const result = await this.preferenceRepository.delete({ userId });
    if (result.affected === 0) {
      throw new NotFoundException('Notification preferences not found');
    }
    this.logger.log(`Deleted preferences for user ${userId}`);
  }
}


import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationRetryService } from './notification-retry.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { EmailNotificationService } from './channels/email-notification.service';
import { PushNotificationService } from './channels/push-notification.service';
import { NotificationDeliveryService } from './notification-delivery.service';
import { NotificationCacheService } from './notification-cache.service';
import { NotificationMetricsService } from './notification-metrics.service';
import { Notification } from '../../entities/notification.entity';
import { NotificationDeliveryLog } from '../../entities/notification-delivery-log.entity';
import { NotificationPreference } from '../../entities/notification-preference.entity';
import { User } from '../../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationDeliveryLog, NotificationPreference, User]),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is not set');
        }
        return {
          secret,
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    NotificationRetryService,
    NotificationPreferencesService,
    EmailNotificationService,
    PushNotificationService,
    NotificationDeliveryService,
    NotificationCacheService,
    NotificationMetricsService,
  ],
  exports: [
    NotificationsService,
    NotificationsGateway,
    NotificationRetryService,
    NotificationPreferencesService,
    EmailNotificationService,
    PushNotificationService,
    NotificationDeliveryService,
  ],
})
export class NotificationsModule {}


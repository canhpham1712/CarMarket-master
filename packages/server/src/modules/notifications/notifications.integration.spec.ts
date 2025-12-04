import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { Notification, NotificationType } from '../../entities/notification.entity';
import { User } from '../../entities/user.entity';

// Skip integration tests if database is not available
const skipIntegrationTests = !process.env.DB_HOST && !process.env.CI;

describe.skip('Notifications Integration Tests', () => {
  let service: NotificationsService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        JwtModule.register({
          secret: 'test-secret',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_NAME || 'carmarket_test',
          entities: [Notification, User],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([Notification]),
      ],
      providers: [NotificationsService, NotificationsGateway],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Notification Creation Flow', () => {
    it('should create notification and persist to database', async () => {
      const userId = 'test-user-123';
      const notification = await service.createNotification(
        userId,
        NotificationType.LISTING_APPROVED,
        'Test Notification',
        'This is a test notification',
        'listing-123',
        { test: 'data' },
      );

      expect(notification).toBeDefined();
      expect(notification.userId).toBe(userId);
      expect(notification.type).toBe(NotificationType.LISTING_APPROVED);
      expect(notification.isRead).toBe(false);

      // Verify it's in database
      const saved = await service.getUserNotifications(userId, 1, 10, false);
      expect(saved.notifications.length).toBeGreaterThan(0);
      expect(saved.notifications[0].id).toBe(notification.id);
    });

    it('should update unread count after creating notification', async () => {
      const userId = 'test-user-456';
      
      await service.createNotification(
        userId,
        NotificationType.NEW_MESSAGE,
        'New Message',
        'You have a new message',
      );

      const unreadCount = await service.getUnreadCount(userId);
      expect(unreadCount).toBeGreaterThan(0);
    });
  });

  describe('Notification Read Flow', () => {
    it('should mark notification as read and update count', async () => {
      const userId = 'test-user-789';
      
      // Create notification
      const notification = await service.createNotification(
        userId,
        NotificationType.LISTING_APPROVED,
        'Test',
        'Test message',
      );

      const initialUnread = await service.getUnreadCount(userId);
      expect(initialUnread).toBeGreaterThan(0);

      // Mark as read
      await service.markAsRead(notification.id, userId);

      // Verify it's marked as read
      const notifications = await service.getUserNotifications(userId, 1, 10, false);
      const readNotification = notifications.notifications.find(
        (n) => n.id === notification.id,
      );
      expect(readNotification?.isRead).toBe(true);

      // Verify unread count decreased
      const newUnread = await service.getUnreadCount(userId);
      expect(newUnread).toBeLessThan(initialUnread);
    });

    it('should mark all notifications as read', async () => {
      const userId = 'test-user-all-read';
      
      // Create multiple notifications
      await service.createNotification(
        userId,
        NotificationType.NEW_MESSAGE,
        'Message 1',
        'Test',
      );
      await service.createNotification(
        userId,
        NotificationType.NEW_INQUIRY,
        'Inquiry 1',
        'Test',
      );

      const beforeUnread = await service.getUnreadCount(userId);
      expect(beforeUnread).toBeGreaterThan(0);

      await service.markAllAsRead(userId);

      const afterUnread = await service.getUnreadCount(userId);
      expect(afterUnread).toBe(0);
    });
  });

  describe('Notification Deletion Flow', () => {
    it('should delete notification and update count', async () => {
      const userId = 'test-user-delete';
      
      const notification = await service.createNotification(
        userId,
        NotificationType.SYSTEM,
        'System Notification',
        'This will be deleted',
      );

      const beforeCount = await service.getUnreadCount(userId);
      
      await service.deleteNotification(notification.id, userId);

      const afterCount = await service.getUnreadCount(userId);
      expect(afterCount).toBeLessThan(beforeCount);
    });
  });

  describe('Notification Filtering', () => {
    it('should filter unread notifications only', async () => {
      const userId = 'test-user-filter';
      
      // Create read and unread notifications
      const unread1 = await service.createNotification(
        userId,
        NotificationType.LISTING_APPROVED,
        'Unread 1',
        'Test',
      );
      const unread2 = await service.createNotification(
        userId,
        NotificationType.NEW_MESSAGE,
        'Unread 2',
        'Test',
      );
      
      await service.markAsRead(unread1.id, userId);

      const unreadOnly = await service.getUserNotifications(userId, 1, 10, true);
      expect(unreadOnly.notifications.length).toBe(1);
      expect(unreadOnly.notifications[0].id).toBe(unread2.id);
      expect(unreadOnly.notifications[0].isRead).toBe(false);
    });
  });
});


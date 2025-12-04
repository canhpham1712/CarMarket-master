import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationType } from '../../entities/notification.entity';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  const mockService = {
    getUserNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(
      NotificationsController,
    );
    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserNotifications', () => {
    it('should return user notifications', async () => {
      const notifications = [
        {
          id: 'notif-1',
          userId: mockUser.id,
          type: NotificationType.LISTING_APPROVED,
          title: 'Test',
          message: 'Test message',
          isRead: false,
          createdAt: new Date(),
        },
      ];

      mockService.getUserNotifications.mockResolvedValue({
        notifications,
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const result = await controller.getUserNotifications(
        mockUser as any,
        '1',
        '20',
        'false',
      );

      expect(service.getUserNotifications).toHaveBeenCalledWith(
        mockUser.id,
        1,
        20,
        false,
      );
      expect(result.notifications).toEqual(notifications);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      mockService.getUnreadCount.mockResolvedValue(5);

      const result = await controller.getUnreadCount(mockUser as any);

      expect(service.getUnreadCount).toHaveBeenCalledWith(mockUser.id);
      expect(result).toBe(5);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notificationId = 'notif-123';
      mockService.markAsRead.mockResolvedValue(undefined);

      await controller.markAsRead(mockUser as any, notificationId);

      expect(service.markAsRead).toHaveBeenCalledWith(
        notificationId,
        mockUser.id,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      mockService.markAllAsRead.mockResolvedValue(undefined);

      await controller.markAllAsRead(mockUser as any);

      expect(service.markAllAsRead).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      const notificationId = 'notif-123';
      mockService.deleteNotification.mockResolvedValue(undefined);

      await controller.deleteNotification(mockUser as any, notificationId);

      expect(service.deleteNotification).toHaveBeenCalledWith(
        notificationId,
        mockUser.id,
      );
    });
  });
});


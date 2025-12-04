import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { Notification, NotificationType } from '../../entities/notification.entity';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let repository: Repository<Notification>;
  let gateway: NotificationsGateway;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockGateway = {
    sendNotificationToUser: jest.fn(),
    sendNotificationUpdateToUser: jest.fn(),
    sendUnreadCountUpdateToUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockRepository,
        },
        {
          provide: NotificationsGateway,
          useValue: mockGateway,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    repository = module.get<Repository<Notification>>(
      getRepositoryToken(Notification),
    );
    gateway = module.get<NotificationsGateway>(NotificationsGateway);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create and save a notification', async () => {
      const userId = 'user-123';
      const notificationData = {
        id: 'notif-123',
        userId,
        type: NotificationType.LISTING_APPROVED,
        title: 'Test Title',
        message: 'Test Message',
        isRead: false,
        relatedListingId: 'listing-123',
        metadata: { test: 'data' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(notificationData);
      mockRepository.save.mockResolvedValue(notificationData);
      mockRepository.findOne.mockResolvedValue(notificationData);

      const result = await service.createNotification(
        userId,
        NotificationType.LISTING_APPROVED,
        'Test Title',
        'Test Message',
        'listing-123',
        { test: 'data' },
      );

      expect(mockRepository.create).toHaveBeenCalledWith({
        userId,
        type: NotificationType.LISTING_APPROVED,
        title: 'Test Title',
        message: 'Test Message',
        relatedListingId: 'listing-123',
        metadata: { test: 'data' },
        isRead: false,
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(notificationData);
    });

    it('should send real-time notification via gateway', async () => {
      const userId = 'user-123';
      const notificationData = {
        id: 'notif-123',
        userId,
        type: NotificationType.LISTING_APPROVED,
        title: 'Test Title',
        message: 'Test Message',
        isRead: false,
        relatedListingId: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockReturnValue(notificationData);
      mockRepository.save.mockResolvedValue(notificationData);
      mockRepository.findOne.mockResolvedValue(notificationData);
      mockRepository.count.mockResolvedValue(1);

      await service.createNotification(
        userId,
        NotificationType.LISTING_APPROVED,
        'Test Title',
        'Test Message',
      );

      expect(mockGateway.sendNotificationToUser).toHaveBeenCalledWith(
        userId,
        notificationData,
      );
      expect(mockGateway.sendUnreadCountUpdateToUser).toHaveBeenCalledWith(
        userId,
        1,
      );
    });
  });

  describe('getUserNotifications', () => {
    it('should return paginated notifications', async () => {
      const userId = 'user-123';
      const notifications = [
        {
          id: 'notif-1',
          userId,
          type: NotificationType.LISTING_APPROVED,
          title: 'Title 1',
          message: 'Message 1',
          isRead: false,
          createdAt: new Date(),
        },
        {
          id: 'notif-2',
          userId,
          type: NotificationType.NEW_MESSAGE,
          title: 'Title 2',
          message: 'Message 2',
          isRead: true,
          createdAt: new Date(),
        },
      ];

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([notifications, 2]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.getUserNotifications(userId, 1, 20, false);

      expect(result.notifications).toEqual(notifications);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
    });

    it('should filter unread notifications when unreadOnly is true', async () => {
      const userId = 'user-123';
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.getUserNotifications(userId, 1, 20, true);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'notification.isRead = :isRead',
        { isRead: false },
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for user', async () => {
      const userId = 'user-123';
      mockRepository.count.mockResolvedValue(5);

      const result = await service.getUnreadCount(userId);

      expect(mockRepository.count).toHaveBeenCalledWith({
        where: { userId, isRead: false },
      });
      expect(result).toBe(5);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const userId = 'user-123';
      const notificationId = 'notif-123';
      const notification = {
        id: notificationId,
        userId,
        isRead: false,
      };

      mockRepository.findOne.mockResolvedValue(notification);
      mockRepository.count.mockResolvedValue(0);

      await service.markAsRead(notificationId, userId);

      expect(mockRepository.update).toHaveBeenCalledWith(notificationId, {
        isRead: true,
      });
      expect(mockGateway.sendNotificationUpdateToUser).toHaveBeenCalledWith(
        userId,
        { type: 'read', notificationId },
      );
    });

    it('should throw error if notification not found', async () => {
      const userId = 'user-123';
      const notificationId = 'notif-123';

      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.markAsRead(notificationId, userId),
      ).rejects.toThrow('Notification not found');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      const userId = 'user-123';
      mockRepository.count.mockResolvedValue(0);

      await service.markAllAsRead(userId);

      expect(mockRepository.update).toHaveBeenCalledWith(
        { userId, isRead: false },
        { isRead: true },
      );
      expect(mockGateway.sendUnreadCountUpdateToUser).toHaveBeenCalledWith(
        userId,
        0,
      );
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      const userId = 'user-123';
      const notificationId = 'notif-123';

      mockRepository.delete.mockResolvedValue({ affected: 1 });
      mockRepository.count.mockResolvedValue(0);

      await service.deleteNotification(notificationId, userId);

      expect(mockRepository.delete).toHaveBeenCalledWith({
        id: notificationId,
        userId,
      });
      expect(mockGateway.sendNotificationUpdateToUser).toHaveBeenCalledWith(
        userId,
        { type: 'deleted', notificationId },
      );
    });

    it('should throw error if notification not found', async () => {
      const userId = 'user-123';
      const notificationId = 'notif-123';

      mockRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(
        service.deleteNotification(notificationId, userId),
      ).rejects.toThrow('Notification not found');
    });
  });
});


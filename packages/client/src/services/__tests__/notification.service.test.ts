import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService, NotificationType } from '../notification.service';
import { apiClient } from '../../lib/api';

vi.mock('../../lib/api');

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNotifications', () => {
    it('should fetch notifications with correct parameters', async () => {
      const mockResponse = {
        notifications: [
          {
            id: '1',
            userId: 'user-1',
            type: NotificationType.LISTING_APPROVED,
            title: 'Test',
            message: 'Test message',
            isRead: false,
            createdAt: new Date().toISOString(),
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await NotificationService.getNotifications(1, 20, false);

      expect(apiClient.get).toHaveBeenCalledWith(
        '/notifications?page=1&limit=20&unreadOnly=false',
      );
      expect(result).toEqual(mockResponse);
    });

    it('should fetch unread notifications only when unreadOnly is true', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({
        notifications: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });

      await NotificationService.getNotifications(1, 20, true);

      expect(apiClient.get).toHaveBeenCalledWith(
        '/notifications?page=1&limit=20&unreadOnly=true',
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should fetch unread count', async () => {
      vi.mocked(apiClient.get).mockResolvedValue({ unreadCount: 5 });

      const result = await NotificationService.getUnreadCount();

      expect(apiClient.get).toHaveBeenCalledWith('/notifications/unread-count');
      expect(result).toEqual({ unreadCount: 5 });
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      vi.mocked(apiClient.put).mockResolvedValue(undefined);

      await NotificationService.markAsRead('notif-123');

      expect(apiClient.put).toHaveBeenCalledWith('/notifications/notif-123/read');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      vi.mocked(apiClient.put).mockResolvedValue(undefined);

      await NotificationService.markAllAsRead();

      expect(apiClient.put).toHaveBeenCalledWith('/notifications/read-all');
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue(undefined);

      await NotificationService.deleteNotification('notif-123');

      expect(apiClient.delete).toHaveBeenCalledWith('/notifications/notif-123');
    });
  });
});


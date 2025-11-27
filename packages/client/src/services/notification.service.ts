import { apiClient } from "../lib/api";

export const NotificationType = {
  LISTING_APPROVED: 'listing_approved',
  LISTING_REJECTED: 'listing_rejected',
  NEW_MESSAGE: 'new_message',
  LISTING_SOLD: 'listing_sold',
  NEW_INQUIRY: 'new_inquiry',
  COMMENT_REPORTED: 'comment_reported',
  SYSTEM: 'system',
} as const;

export type NotificationType = typeof NotificationType[keyof typeof NotificationType];

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  relatedListingId: string | null;
  metadata: Record<string, any> | null;
  groupId: string | null;
  createdAt: string;
  updatedAt: string;
  relatedListing?: {
    id: string;
    title: string;
    price: number;
  } | null;
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    page?: number;
    limit: number;
    total?: number;
    totalPages?: number;
    cursor?: string;
    hasMore?: boolean;
  };
}

export class NotificationService {
  static async getNotifications(
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false,
    cursor?: string,
    type?: NotificationType,
    startDate?: string,
    endDate?: string,
  ): Promise<NotificationsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      unreadOnly: unreadOnly.toString(),
    });
    
    if (cursor) {
      params.append('cursor', cursor);
    }
    
    if (type) {
      params.append('type', type);
    }
    
    if (startDate) {
      params.append('startDate', startDate);
    }
    
    if (endDate) {
      params.append('endDate', endDate);
    }
    
    return apiClient.get<NotificationsResponse>(
      `/notifications?${params.toString()}`
    );
  }

  static async getUnreadCount(): Promise<{ unreadCount: number }> {
    return apiClient.get<{ unreadCount: number }>("/notifications/unread-count");
  }

  static async markAsRead(notificationId: string): Promise<void> {
    return apiClient.put(`/notifications/${notificationId}/read`);
  }

  static async markAllAsRead(): Promise<void> {
    return apiClient.put("/notifications/read-all");
  }

  static async deleteNotification(notificationId: string): Promise<void> {
    return apiClient.delete(`/notifications/${notificationId}`);
  }

  static async getPreferences(): Promise<{
    id: string;
    userId: string;
    preferences: Record<string, { inApp: boolean; email: boolean; push: boolean }>;
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
      timezone: string;
    } | null;
    createdAt: string;
    updatedAt: string;
  }> {
    return apiClient.get("/notifications/preferences");
  }

  static async updatePreferences(data: {
    preferences?: Partial<Record<string, Partial<{ inApp: boolean; email: boolean; push: boolean }>>>;
    quietHours?: {
      enabled: boolean;
      start: string;
      end: string;
      timezone: string;
    } | null;
  }): Promise<void> {
    return apiClient.put("/notifications/preferences", data);
  }
}


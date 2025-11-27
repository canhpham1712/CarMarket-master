import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuthStore } from "../store/auth";
import { ChatService } from "../services/chat.service";
import { NotificationService, type Notification, NotificationType } from "../services/notification.service";
import { socketService } from "../services/socket.service";
import toast from "react-hot-toast";
import type { ChatConversation } from "../services/chat.service";

interface NotificationContextType {
  chatUnreadCount: number;
  notificationUnreadCount: number;
  conversations: ChatConversation[];
  notifications: Notification[];
  refreshConversations: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  clearChatUnreadCount: () => void;
  clearNotificationUnreadCount: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const refreshConversations = async () => {
    if (!isAuthenticated || !user) return;

    try {
      const response = await ChatService.getUserConversations();
      setConversations(response.conversations);

      // Get actual chat unread count from backend (with separate error handling)
      try {
        const unreadResponse = await ChatService.getUnreadCount();
        setChatUnreadCount(unreadResponse.unreadCount);
      } catch (unreadError) {
        console.error("Failed to get chat unread count:", unreadError);
        // Don't crash the app, just keep current unread count
      }
    } catch (error: any) {
      console.error("Failed to refresh conversations:", error);
      
      // If it's a 401 error, the token might be expired
      if (error.response?.status === 401) {
        console.log("Authentication token expired, clearing auth state");
        // Clear auth state and redirect to login
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }
      
      // Don't crash the app, just log the error
    }
  };

  const refreshNotifications = async () => {
    if (!isAuthenticated || !user) return;

    try {
      const response = await NotificationService.getNotifications(1, 20, false);
      setNotifications(response.notifications);

      // Get notification unread count from backend
      try {
        const unreadResponse = await NotificationService.getUnreadCount();
        setNotificationUnreadCount(unreadResponse.unreadCount);
      } catch (unreadError) {
        console.error("Failed to get notification unread count:", unreadError);
      }
    } catch (error: any) {
      console.error("Failed to refresh notifications:", error);
      
      if (error.response?.status === 401) {
        console.log("Authentication token expired, clearing auth state");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return;
      }
    }
  };

  const clearChatUnreadCount = () => {
    setChatUnreadCount(0);
  };

  const clearNotificationUnreadCount = () => {
    setNotificationUnreadCount(0);
  };

  useEffect(() => {
    // Only proceed if auth is not loading and user is authenticated
    if (!isLoading && isAuthenticated && user) {
      // Add a small delay to ensure authentication state is fully initialized
      const timer = setTimeout(() => {
        refreshConversations();
        refreshNotifications();
      }, 200);

      // Listen for global notifications
      const unsubscribeGlobalNotification = socketService.on(
        "globalNotification",
        (data: any) => {
          if (data.type === "newMessage" && data.data.sender.id !== user?.id) {
            toast.success(
              `New message from ${data.data.sender.firstName} ${data.data.sender.lastName}`
            );
            // Refresh conversations to update unread count
            refreshConversations();
          } else if (data.type === "listingApproved") {
            // Show notification when listing is approved
            toast.success(
              data.data.message || `Listing "${data.data.listingTitle}" has been approved!`,
              {
                duration: 5000,
                icon: "✅",
              }
            );
            // Refresh notifications from database
            refreshNotifications();
          } else if (data.type === "listingRejected") {
            // Show notification when listing is rejected
            toast.error(
              data.data.message || `Listing "${data.data.listingTitle}" has been rejected.`,
              {
                duration: 6000,
                icon: "❌",
              }
            );
            // Refresh notifications from database
            refreshNotifications();
          }
        }
      );

      // Listen for real-time notification events
      const unsubscribeNewNotification = socketService.on(
        "newNotification",
        (data: { notification: Notification }) => {
          // Add new notification to the list
          setNotifications((prev) => [data.notification, ...prev]);
          // Increment notification unread count immediately if notification is unread
          if (!data.notification.isRead) {
            setNotificationUnreadCount((prev) => prev + 1);
          }
          // Refresh notifications from database to ensure consistency
          refreshNotifications();
          
          // Show toast for important notifications
          if (
            data.notification.type === NotificationType.LISTING_APPROVED ||
            data.notification.type === NotificationType.LISTING_REJECTED ||
            data.notification.type === NotificationType.LISTING_SOLD
          ) {
            toast.success(data.notification.title, {
              duration: 5000,
            });
          }
        }
      );

      const unsubscribeNotificationUpdate = socketService.on(
        "notificationUpdate",
        (data: { type: "read" | "deleted"; notificationId: string }) => {
          if (data.type === "read") {
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === data.notificationId ? { ...n, isRead: true } : n
              )
            );
          } else if (data.type === "deleted") {
            setNotifications((prev) =>
              prev.filter((n) => n.id !== data.notificationId)
            );
          }
          refreshNotifications();
        }
      );

      const unsubscribeNotificationUnreadCountUpdate = socketService.on(
        "notificationUnreadCountUpdate",
        (data: { count: number }) => {
          setNotificationUnreadCount(data.count);
        }
      );

      const unsubscribeChatUnreadCountUpdate = socketService.on(
        "chatUnreadCountUpdate",
        (data: { count: number }) => {
          setChatUnreadCount(data.count);
        }
      );

      const unsubscribeMissedNotifications = socketService.on(
        "missedNotifications",
        (data: { notifications: Notification[] }) => {
          // Merge missed notifications with existing ones, avoiding duplicates
          setNotifications((prev) => {
            const existingIds = new Set(prev.map((n) => n.id));
            const newNotifications = data.notifications.filter(
              (n) => !existingIds.has(n.id)
            );
            return [...newNotifications, ...prev];
          });
          
          // Update unread count
          const unreadCount = data.notifications.filter((n) => !n.isRead).length;
          if (unreadCount > 0) {
            setNotificationUnreadCount((prev) => prev + unreadCount);
          }
        }
      );

      // Refresh every 30 seconds
      const interval = setInterval(() => {
        refreshConversations();
        refreshNotifications();
      }, 30000);

      return () => {
        clearTimeout(timer);
        clearInterval(interval);
        unsubscribeGlobalNotification();
        unsubscribeNewNotification();
        unsubscribeNotificationUpdate();
        unsubscribeNotificationUnreadCountUpdate();
        unsubscribeChatUnreadCountUpdate();
        unsubscribeMissedNotifications();
      };
    }
    
    if (!isLoading) {
      // Only clear state if auth is not loading
      setChatUnreadCount(0);
      setNotificationUnreadCount(0);
      setConversations([]);
      setNotifications([]);
    }
    
    return () => {
      // Cleanup function for all code paths
    };
  }, [isLoading, isAuthenticated, user?.id]);

  return (
    <NotificationContext.Provider
      value={{
        chatUnreadCount,
        notificationUnreadCount,
        conversations,
        notifications,
        refreshConversations,
        refreshNotifications,
        clearChatUnreadCount,
        clearNotificationUnreadCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
}

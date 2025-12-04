import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Check, Loader2 } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";
import { NotificationService, type Notification } from "../services/notification.service";
import { NotificationItem } from "./NotificationItem";
import { Button } from "./ui/Button";
import toast from "react-hot-toast";

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

const groupNotificationsByTime = (notifications: Notification[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisWeek = new Date(today);
  thisWeek.setDate(thisWeek.getDate() - 7);

  const groups: {
    today: Notification[];
    yesterday: Notification[];
    thisWeek: Notification[];
    older: Notification[];
  } = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  };

  notifications.forEach((notification) => {
    const notificationDate = new Date(notification.createdAt);
    if (notificationDate >= today) {
      groups.today.push(notification);
    } else if (notificationDate >= yesterday) {
      groups.yesterday.push(notification);
    } else if (notificationDate >= thisWeek) {
      groups.thisWeek.push(notification);
    } else {
      groups.older.push(notification);
    }
  });

  return groups;
};

export function NotificationDropdown({
  isOpen,
  onClose,
}: NotificationDropdownProps) {
  const { notifications, refreshNotifications, notificationUnreadCount } = useNotifications();
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      refreshNotifications();
    }
  }, [isOpen, refreshNotifications]);

  // Click outside handling is done in NotificationBell component
  // to avoid conflicts with the toggle button

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await NotificationService.markAsRead(notificationId);
      refreshNotifications();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (notificationUnreadCount === 0) return;

    setIsMarkingAll(true);
    try {
      await NotificationService.markAllAsRead();
      await refreshNotifications();
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to mark all as read");
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleViewAll = () => {
    onClose();
    navigate("/notifications");
  };

  const groupedNotifications = groupNotificationsByTime(notifications);
  const hasNotifications = notifications.length > 0;
  const displayNotifications = notifications.slice(0, 15);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[600px] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
        {notificationUnreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll}
            className="text-xs"
          >
            {isMarkingAll ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Check className="h-3 w-3 mr-1" />
            )}
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {!hasNotifications ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Bell className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No notifications yet</p>
            <p className="text-gray-400 text-xs mt-1">
              You'll see notifications here when you have updates
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {displayNotifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
                onClick={onClose}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {hasNotifications && (
        <div className="p-3 border-t border-gray-200">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleViewAll}
            className="w-full text-primary-600 hover:text-primary-700"
          >
            View all notifications
          </Button>
        </div>
      )}
    </div>
  );
}


import React from "react";
import { useNavigate } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  MessageSquare,
  ShoppingCart,
  AlertCircle,
  Bell,
  Car,
} from "lucide-react";
import { type Notification, NotificationType } from "../services/notification.service";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onClick?: () => void;
}

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case NotificationType.LISTING_APPROVED:
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case NotificationType.LISTING_REJECTED:
      return <XCircle className="h-5 w-5 text-red-600" />;
    case NotificationType.NEW_MESSAGE:
      return <MessageSquare className="h-5 w-5 text-blue-600" />;
    case NotificationType.LISTING_SOLD:
      return <ShoppingCart className="h-5 w-5 text-purple-600" />;
    case NotificationType.NEW_INQUIRY:
      return <AlertCircle className="h-5 w-5 text-yellow-600" />;
    case NotificationType.COMMENT_REPORTED:
      return <AlertCircle className="h-5 w-5 text-orange-600" />;
    case NotificationType.SYSTEM:
      return <Bell className="h-5 w-5 text-gray-600" />;
    default:
      return <Bell className="h-5 w-5 text-gray-600" />;
  }
};

const getNotificationRoute = (notification: Notification): string | null => {
  switch (notification.type) {
    case NotificationType.LISTING_APPROVED:
    case NotificationType.LISTING_REJECTED:
    case NotificationType.LISTING_SOLD:
      return notification.relatedListingId
        ? `/cars/${notification.relatedListingId}`
        : "/my-listings";
    case NotificationType.NEW_MESSAGE:
    case NotificationType.NEW_INQUIRY:
      return "/conversations";
    case NotificationType.COMMENT_REPORTED:
      return notification.relatedListingId
        ? `/cars/${notification.relatedListingId}`
        : null;
    default:
      return null;
  }
};

export function NotificationItem({
  notification,
  onMarkAsRead,
  onClick,
}: NotificationItemProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!notification.isRead && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }

    if (onClick) {
      onClick();
    }

    const route = getNotificationRoute(notification);
    if (route) {
      navigate(route);
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return "just now";
    }
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`;
    }
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
    }
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
      return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
    }
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) {
      return `${diffInWeeks} week${diffInWeeks !== 1 ? "s" : ""} ago`;
    }
    const diffInMonths = Math.floor(diffInDays / 30);
    return `${diffInMonths} month${diffInMonths !== 1 ? "s" : ""} ago`;
  };

  const timeAgo = formatTimeAgo(notification.createdAt);

  return (
    <div
      onClick={handleClick}
      className={`
        flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors
        ${notification.isRead 
          ? "bg-white hover:bg-gray-50" 
          : "bg-blue-50 hover:bg-blue-100"
        }
      `}
    >
      <div className="flex-shrink-0 mt-0.5">
        {getNotificationIcon(notification.type)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p
              className={`
                text-sm font-medium truncate
                ${notification.isRead ? "text-gray-700" : "text-gray-900"}
              `}
            >
              {notification.title}
            </p>
            <p
              className={`
                text-sm mt-1 line-clamp-2
                ${notification.isRead ? "text-gray-500" : "text-gray-700"}
              `}
            >
              {notification.message}
            </p>
            <p className="text-xs text-gray-400 mt-1">{timeAgo}</p>
          </div>
          {!notification.isRead && (
            <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2" />
          )}
        </div>
      </div>
    </div>
  );
}


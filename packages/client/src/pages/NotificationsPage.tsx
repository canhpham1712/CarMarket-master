import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Check,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "../store/auth";
import { useNotifications } from "../hooks/useNotifications";
import {
  NotificationService,
  type Notification,
  NotificationType,
} from "../services/notification.service";
import { NotificationItem } from "../components/NotificationItem";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import toast from "react-hot-toast";

type FilterType = "all" | "unread" | NotificationType;

export function NotificationsPage() {
  const { isAuthenticated, user } = useAuthStore();
  const { refreshNotifications } = useNotifications();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    fetchNotifications();
  }, [isAuthenticated, filter, pagination.page]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const unreadOnly = filter === "unread";
      const response = await NotificationService.getNotifications(
        pagination.page,
        pagination.limit,
        unreadOnly
      );

      let filteredNotifications = response.notifications;
      if (filter !== "all" && filter !== "unread") {
        filteredNotifications = filteredNotifications.filter(
          (n) => n.type === filter
        );
      }

      setNotifications(filteredNotifications);
      setPagination({
        ...pagination,
        total: response.pagination.total,
        totalPages: response.pagination.totalPages,
      });
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    setMarkingAsRead(notificationId);
    try {
      await NotificationService.markAsRead(notificationId);
      await refreshNotifications();
      await fetchNotifications();
    } catch (error) {
      console.error("Failed to mark as read:", error);
      toast.error("Failed to mark notification as read");
    } finally {
      setMarkingAsRead(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      await refreshNotifications();
      await fetchNotifications();
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error("Failed to mark all as read");
    }
  };

  const handleDelete = async (notificationId: string) => {
    setDeleting(notificationId);
    try {
      await NotificationService.deleteNotification(notificationId);
      await refreshNotifications();
      await fetchNotifications();
      toast.success("Notification deleted");
    } catch (error) {
      console.error("Failed to delete notification:", error);
      toast.error("Failed to delete notification");
    } finally {
      setDeleting(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPagination({ ...pagination, page: newPage });
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Notifications
              </h1>
              <p className="text-gray-600">
                {unreadCount > 0
                  ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                  : "All caught up!"}
              </p>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="outline"
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                Mark all as read
              </Button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setFilter("all");
                setPagination({ ...pagination, page: 1 });
              }}
            >
              All
            </Button>
            <Button
              variant={filter === "unread" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setFilter("unread");
                setPagination({ ...pagination, page: 1 });
              }}
            >
              Unread
            </Button>
            <Button
              variant={filter === NotificationType.LISTING_APPROVED ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setFilter(NotificationType.LISTING_APPROVED);
                setPagination({ ...pagination, page: 1 });
              }}
            >
              Approved
            </Button>
            <Button
              variant={filter === NotificationType.NEW_MESSAGE ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setFilter(NotificationType.NEW_MESSAGE);
                setPagination({ ...pagination, page: 1 });
              }}
            >
              Messages
            </Button>
            <Button
              variant={filter === NotificationType.NEW_INQUIRY ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setFilter(NotificationType.NEW_INQUIRY);
                setPagination({ ...pagination, page: 1 });
              }}
            >
              Inquiries
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Bell className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No notifications
                </h3>
                <p className="text-gray-500 text-sm">
                  {filter === "unread"
                    ? "You're all caught up! No unread notifications."
                    : filter !== "all"
                    ? `No ${filter} notifications found.`
                    : "You don't have any notifications yet."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="relative group hover:bg-gray-50 transition-colors"
                  >
                    <NotificationItem
                      notification={notification}
                      onMarkAsRead={handleMarkAsRead}
                    />
                    <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(notification.id);
                        }}
                        disabled={deleting === notification.id}
                        className="h-8 w-8 text-gray-400 hover:text-red-600"
                      >
                        {deleting === notification.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {!loading && notifications.length > 0 && pagination.totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


import React, { useState } from "react";
import { Bell } from "lucide-react";
import { useNotifications } from "../contexts/NotificationContext";
import { NotificationDropdown } from "./NotificationDropdown";

export function NotificationBell() {
  const { notificationUnreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-6 w-6" />
        {notificationUnreadCount > 0 && (
          <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
          </span>
        )}
      </button>
      <NotificationDropdown isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}


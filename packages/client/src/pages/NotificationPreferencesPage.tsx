import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Save, X, Clock } from "lucide-react";
import { useAuthStore } from "../store/auth";
import { NotificationService, NotificationType } from "../services/notification.service";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";

interface ChannelPreferences {
  inApp: boolean;
  email: boolean;
  push: boolean;
}

interface QuietHours {
  enabled: boolean;
  start: string;
  end: string;
  timezone: string;
}

interface Preferences {
  preferences: Record<NotificationType, ChannelPreferences>;
  quietHours: QuietHours | null;
}

const notificationTypeLabels: Record<NotificationType, string> = {
  [NotificationType.LISTING_APPROVED]: "Listing Approved",
  [NotificationType.LISTING_REJECTED]: "Listing Rejected",
  [NotificationType.NEW_MESSAGE]: "New Message",
  [NotificationType.LISTING_SOLD]: "Listing Sold",
  [NotificationType.NEW_INQUIRY]: "New Inquiry",
  [NotificationType.COMMENT_REPORTED]: "Comment Reported",
  [NotificationType.SYSTEM]: "System Notifications",
};

export function NotificationPreferencesPage() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<Preferences | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    fetchPreferences();
  }, [isAuthenticated, navigate]);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const data = await NotificationService.getPreferences();
      setPreferences({
        preferences: data.preferences,
        quietHours: data.quietHours,
      });
    } catch (error) {
      console.error("Failed to fetch preferences:", error);
      toast.error("Failed to load notification preferences");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preferences) return;

    try {
      setSaving(true);
      await NotificationService.updatePreferences({
        preferences: preferences.preferences,
        quietHours: preferences.quietHours,
      });
      toast.success("Preferences saved successfully");
    } catch (error: any) {
      console.error("Failed to save preferences:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to save preferences";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (
    type: NotificationType,
    channel: keyof ChannelPreferences,
    value: boolean
  ) => {
    if (!preferences) return;

    setPreferences({
      ...preferences,
      preferences: {
        ...preferences.preferences,
        [type]: {
          ...preferences.preferences[type],
          [channel]: value,
        },
      },
    });
  };

  const updateQuietHours = (updates: Partial<QuietHours>) => {
    if (!preferences) return;

    setPreferences({
      ...preferences,
      quietHours: {
        enabled: false,
        start: "22:00",
        end: "08:00",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...preferences.quietHours,
        ...updates,
      },
    });
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Failed to load preferences</p>
          <Button onClick={fetchPreferences} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Notification Preferences
          </h1>
          <p className="text-gray-600">
            Manage how and when you receive notifications
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(NotificationType).map(([key, type]) => (
                <div
                  key={type}
                  className="border-b border-gray-200 pb-4 last:border-0 last:pb-0"
                >
                  <h3 className="font-semibold text-gray-900 mb-3">
                    {notificationTypeLabels[type]}
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.preferences[type]?.inApp ?? false}
                        onChange={(e) =>
                          updatePreference(type, "inApp", e.target.checked)
                        }
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                      <span className="text-sm text-gray-700">In-App</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.preferences[type]?.email ?? false}
                        onChange={(e) =>
                          updatePreference(type, "email", e.target.checked)
                        }
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Email</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.preferences[type]?.push ?? false}
                        onChange={(e) =>
                          updatePreference(type, "push", e.target.checked)
                        }
                        className="w-4 h-4 text-primary-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Push</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Quiet Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.quietHours?.enabled ?? false}
                  onChange={(e) =>
                    updateQuietHours({ enabled: e.target.checked })
                  }
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Enable quiet hours
                </span>
              </label>

              {preferences.quietHours?.enabled && (
                <div className="grid grid-cols-2 gap-4 ml-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={preferences.quietHours.start}
                      onChange={(e) =>
                        updateQuietHours({ start: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={preferences.quietHours.end}
                      onChange={(e) =>
                        updateQuietHours({ end: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timezone
                    </label>
                    <select
                      value={preferences.quietHours.timezone}
                      onChange={(e) =>
                        updateQuietHours({ timezone: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                        {Intl.DateTimeFormat().resolvedOptions().timeZone}
                      </option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            disabled={saving}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Preferences
          </Button>
        </div>
      </div>
    </div>
  );
}


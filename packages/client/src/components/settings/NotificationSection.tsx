import { useState, useEffect } from "react";
import { Bell, Clock, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { NotificationService, NotificationType } from "../../services/notification.service";
import type { UserSettings } from "../../types/settings.types";
import toast from "react-hot-toast";

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

interface NotificationSectionProps {
  settings: UserSettings;
  onUpdate: (data: any) => Promise<void>;
}

const notificationTypeLabels: Record<NotificationType, string> = {
  [NotificationType.LISTING_APPROVED]: "Listing Approved",
  [NotificationType.LISTING_REJECTED]: "Listing Rejected",
  [NotificationType.NEW_MESSAGE]: "New Message",
  [NotificationType.LISTING_SOLD]: "Listing Sold",
  [NotificationType.NEW_INQUIRY]: "New Inquiry",
  [NotificationType.COMMENT_REPORTED]: "Comment Reported",
  [NotificationType.ROLE_ASSIGNED]: "Role Assigned",
  [NotificationType.SYSTEM]: "System Notifications",
};

export function NotificationSection({
  settings,
  onUpdate,
}: NotificationSectionProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<Record<NotificationType, ChannelPreferences> | null>(null);
  const [quietHours, setQuietHours] = useState<QuietHours | null>(null);
  const [expandedTypes, setExpandedTypes] = useState<Set<NotificationType>>(
    new Set()
  );

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const data = await NotificationService.getPreferences();
      setPreferences(data.preferences);
      setQuietHours(data.quietHours);
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
        preferences,
        quietHours,
      });
      await onUpdate({
        notifications: {
          preferences,
          quietHours,
        },
      });
      toast.success("Notification preferences saved successfully");
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
      [type]: {
        ...preferences[type],
        [channel]: value,
      },
    });
  };

  const updateQuietHours = (updates: Partial<QuietHours>) => {
    setQuietHours({
      enabled: false,
      start: "22:00",
      end: "08:00",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...quietHours,
      ...updates,
    });
  };

  const isNotificationTypeEnabled = (type: NotificationType): boolean => {
    if (!preferences) return false;
    const prefs = preferences[type];
    return prefs?.inApp || prefs?.email || prefs?.push || false;
  };

  const toggleNotificationType = (type: NotificationType, enabled: boolean) => {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      [type]: {
        inApp: enabled,
        email: enabled,
        push: enabled,
      },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-gray-600">Failed to load preferences</p>
          <Button onClick={fetchPreferences} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(NotificationType).map(([, type]) => {
              const isEnabled = isNotificationTypeEnabled(type);
              const isExpanded = expandedTypes.has(type);

              return (
                <div
                  key={type}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isEnabled}
                            onChange={(e) =>
                              toggleNotificationType(type, e.target.checked)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                        </label>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {notificationTypeLabels[type]}
                          </h3>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setExpandedTypes((prev) => {
                          const newSet = new Set(prev);
                          if (newSet.has(type)) {
                            newSet.delete(type);
                          } else {
                            newSet.add(type);
                          }
                          return newSet;
                        });
                      }}
                      className="text-gray-500 hover:text-gray-700 transition-colors p-1"
                    >
                      <svg
                        className={`w-5 h-5 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-3">
                        Delivery Channels:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {(["inApp", "email", "push"] as const).map(
                          (channel) => (
                            <label
                              key={channel}
                              className="flex items-start gap-2 cursor-pointer p-3 rounded-lg hover:bg-gray-50 border border-gray-100"
                            >
                              <input
                                type="checkbox"
                                checked={preferences[type]?.[channel] ?? false}
                                onChange={(e) =>
                                  updatePreference(type, channel, e.target.checked)
                                }
                                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 mt-0.5"
                              />
                              <div>
                                <span className="text-sm font-medium text-gray-700 block">
                                  {channel === "inApp"
                                    ? "In-App"
                                    : channel === "email"
                                    ? "Email"
                                    : "Push"}
                                </span>
                              </div>
                            </label>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
                checked={quietHours?.enabled ?? false}
                onChange={(e) =>
                  updateQuietHours({ enabled: e.target.checked })
                }
                className="w-4 h-4 text-primary-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Enable quiet hours
              </span>
            </label>

            {quietHours?.enabled && (
              <div className="grid grid-cols-2 gap-4 ml-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={quietHours.start}
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
                    value={quietHours.end}
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
                    value={quietHours.timezone}
                    onChange={(e) =>
                      updateQuietHours({ timezone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option
                      value={
                        Intl.DateTimeFormat().resolvedOptions().timeZone
                      }
                    >
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

      <div className="flex justify-end">
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
  );
}


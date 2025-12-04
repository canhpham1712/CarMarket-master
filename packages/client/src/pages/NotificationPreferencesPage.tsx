import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
  [NotificationType.ROLE_ASSIGNED]: "Role Assigned",
  [NotificationType.SYSTEM]: "System Notifications",
};

const notificationTypeDescriptions: Record<NotificationType, string> = {
  [NotificationType.LISTING_APPROVED]: "Get notified when your listing is approved by admin",
  [NotificationType.LISTING_REJECTED]: "Get notified when your listing is rejected",
  [NotificationType.NEW_MESSAGE]: "Get notified when you receive new messages",
  [NotificationType.LISTING_SOLD]: "Get notified when your listing is marked as sold",
  [NotificationType.NEW_INQUIRY]: "Get notified when someone shows interest in your listing",
  [NotificationType.COMMENT_REPORTED]: "Get notified when a comment is reported",
  [NotificationType.ROLE_ASSIGNED]: "Get notified when you are assigned a new role",
  [NotificationType.SYSTEM]: "Receive important system notifications",
};

export function NotificationPreferencesPage() {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  
  // Redirect to settings page if not coming from settings
  useEffect(() => {
    const fromSettings = searchParams.get("fromSettings");
    if (!fromSettings) {
      navigate("/settings?tab=notifications", { replace: true });
    }
  }, [navigate, searchParams]);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [expandedTypes, setExpandedTypes] = useState<Set<NotificationType>>(new Set());

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

  // Helper function to check if a notification type is enabled (any channel)
  const isNotificationTypeEnabled = (type: NotificationType): boolean => {
    if (!preferences) return false;
    const prefs = preferences.preferences[type];
    return prefs?.inApp || prefs?.email || prefs?.push || false;
  };

  // Toggle entire notification type on/off
  const toggleNotificationType = (type: NotificationType, enabled: boolean) => {
    if (!preferences) return;

    setPreferences({
      ...preferences,
      preferences: {
        ...preferences.preferences,
        [type]: {
          inApp: enabled,
          email: enabled,
          push: enabled,
        },
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
            <div className="space-y-4">
              {Object.entries(NotificationType).map(([, type]) => {
                const isEnabled = isNotificationTypeEnabled(type);
                const isExpanded = expandedTypes.has(type);

                const toggleExpand = () => {
                  setExpandedTypes((prev) => {
                    const newSet = new Set(prev);
                    if (newSet.has(type)) {
                      newSet.delete(type);
                    } else {
                      newSet.add(type);
                    }
                    return newSet;
                  });
                };

                return (
                  <div
                    key={type}
                    className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                  >
                    {/* Main Toggle Row */}
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
                            <p className="text-sm text-gray-500">
                              {notificationTypeDescriptions[type]}
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={toggleExpand}
                        className="text-gray-500 hover:text-gray-700 transition-colors p-1"
                        aria-label={isExpanded ? "Collapse" : "Expand"}
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

                    {/* Expanded Channel Settings */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-3">
                          Delivery Channels:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <label className="flex items-start gap-2 cursor-pointer p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                            <input
                              type="checkbox"
                              checked={preferences.preferences[type]?.inApp ?? false}
                              onChange={(e) =>
                                updatePreference(type, "inApp", e.target.checked)
                              }
                              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 mt-0.5"
                            />
                            <div>
                              <span className="text-sm font-medium text-gray-700 block">
                                In-App
                              </span>
                              <span className="text-xs text-gray-500">
                                Show in notification center
                              </span>
                            </div>
                          </label>
                          <label className="flex items-start gap-2 cursor-pointer p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                            <input
                              type="checkbox"
                              checked={preferences.preferences[type]?.email ?? false}
                              onChange={(e) =>
                                updatePreference(type, "email", e.target.checked)
                              }
                              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 mt-0.5"
                            />
                            <div>
                              <span className="text-sm font-medium text-gray-700 block">
                                Email
                              </span>
                              <span className="text-xs text-gray-500">
                                Send via email
                              </span>
                            </div>
                          </label>
                          <label className="flex items-start gap-2 cursor-pointer p-3 rounded-lg hover:bg-gray-50 border border-gray-100">
                            <input
                              type="checkbox"
                              checked={preferences.preferences[type]?.push ?? false}
                              onChange={(e) =>
                                updatePreference(type, "push", e.target.checked)
                              }
                              className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500 mt-0.5"
                            />
                            <div>
                              <span className="text-sm font-medium text-gray-700 block">
                                Push
                              </span>
                              <span className="text-xs text-gray-500">
                                Browser push notifications
                              </span>
                            </div>
                          </label>
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


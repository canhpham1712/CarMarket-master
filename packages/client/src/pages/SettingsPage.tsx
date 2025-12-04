import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  User,
  Shield,
  Bell,
  Lock,
  Eye,
  ShoppingBag,
  Store,
  ShieldCheck,
  Settings as SettingsIcon,
  Database,
  Loader2,
} from "lucide-react";
import { useAuthStore } from "../store/auth";
import { SettingsService } from "../services/settings.service";
import type { UserSettings } from "../types/settings.types";
import { Card, CardContent } from "../components/ui/Card";
import { ProfileSection } from "../components/settings/ProfileSection";
import { SecuritySection } from "../components/settings/SecuritySection";
import { NotificationSection } from "../components/settings/NotificationSection";
import { PrivacySection } from "../components/settings/PrivacySection";
import { BuyerSettingsSection } from "../components/settings/BuyerSettingsSection";
import { SellerSettingsSection } from "../components/settings/SellerSettingsSection";
import { ModeratorSettingsSection } from "../components/settings/ModeratorSettingsSection";
import { AdminSettingsSection } from "../components/settings/AdminSettingsSection";
import { SuperAdminSettingsSection } from "../components/settings/SuperAdminSettingsSection";
import toast from "react-hot-toast";

type SettingsTab =
  | "profile"
  | "security"
  | "notifications"
  | "privacy"
  | "buyer"
  | "seller"
  | "moderator"
  | "admin"
  | "superAdmin";

interface TabConfig {
  id: SettingsTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const tabs: TabConfig[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Eye },
  { id: "buyer", label: "Buyer Settings", icon: ShoppingBag, roles: ["buyer"] },
  { id: "seller", label: "Seller Settings", icon: Store, roles: ["seller"] },
  { id: "moderator", label: "Moderator", icon: ShieldCheck, roles: ["moderator", "admin", "super_admin"] },
  { id: "admin", label: "Admin", icon: SettingsIcon, roles: ["admin", "super_admin"] },
  { id: "superAdmin", label: "Super Admin", icon: Database, roles: ["super_admin"] },
];

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  const userRoles = user?.roles || [];

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    // Get tab from URL params
    const tabParam = searchParams.get("tab") as SettingsTab;
    if (tabParam && tabs.some((t) => t.id === tabParam)) {
      setActiveTab(tabParam);
    }

    fetchSettings();
  }, [isAuthenticated, navigate]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await SettingsService.getSettings();
      setSettings(data);
    } catch (error: any) {
      console.error("Failed to fetch settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleSettingsUpdate = async (section: string, data: any) => {
    try {
      const updated = await SettingsService.updateSettings({
        [section]: data,
      });
      setSettings(updated);
      toast.success("Settings updated successfully");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Failed to update settings";
      toast.error(errorMessage);
      throw error;
    }
  };

  // Filter tabs based on user roles
  const visibleTabs = tabs.filter((tab) => {
    if (!tab.roles) return true; // Common tabs
    return tab.roles.some((role) => userRoles.includes(role));
  });

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

  if (!settings) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Failed to load settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <Card>
              <CardContent className="p-0">
                <nav className="space-y-1 p-2">
                  {visibleTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                          isActive
                            ? "bg-primary-50 text-primary-700 font-medium"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === "profile" && (
              <ProfileSection
                settings={settings}
                onUpdate={(data) => handleSettingsUpdate("profile", data)}
              />
            )}
            {activeTab === "security" && (
              <SecuritySection
                settings={settings}
                onUpdate={(data) => handleSettingsUpdate("security", data)}
              />
            )}
            {activeTab === "notifications" && (
              <NotificationSection
                settings={settings}
                onUpdate={(data) => handleSettingsUpdate("notifications", data)}
              />
            )}
            {activeTab === "privacy" && (
              <PrivacySection
                settings={settings}
                onUpdate={(data) => handleSettingsUpdate("privacy", data)}
              />
            )}
            {activeTab === "buyer" && userRoles.includes("buyer") && (
              <BuyerSettingsSection
                settings={settings}
                onUpdate={(data) => handleSettingsUpdate("buyer", data)}
              />
            )}
            {activeTab === "seller" && userRoles.includes("seller") && (
              <SellerSettingsSection
                settings={settings}
                onUpdate={(data) => handleSettingsUpdate("seller", data)}
              />
            )}
            {activeTab === "moderator" &&
              (userRoles.includes("moderator") ||
                userRoles.includes("admin") ||
                userRoles.includes("super_admin")) && (
                <ModeratorSettingsSection
                  settings={settings}
                  onUpdate={(data) =>
                    handleSettingsUpdate("moderator", data)
                  }
                />
              )}
            {activeTab === "admin" &&
              (userRoles.includes("admin") ||
                userRoles.includes("super_admin")) && (
                <AdminSettingsSection
                  settings={settings}
                  onUpdate={(data) => handleSettingsUpdate("admin", data)}
                />
              )}
            {activeTab === "superAdmin" &&
              userRoles.includes("super_admin") && (
                <SuperAdminSettingsSection
                  settings={settings}
                  onUpdate={(data) =>
                    handleSettingsUpdate("superAdmin", data)
                  }
                />
              )}
          </div>
        </div>
      </div>
    </div>
  );
}


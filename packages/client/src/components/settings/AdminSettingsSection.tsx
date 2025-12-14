import { useState } from "react";
import { Settings as SettingsIcon, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import type { UserSettings } from "../../types/settings.types";
import toast from "react-hot-toast";

interface AdminSettingsSectionProps {
  settings: UserSettings;
  onUpdate: (data: any) => Promise<void>;
}

export function AdminSettingsSection({
  settings,
  onUpdate,
}: AdminSettingsSectionProps) {
  const [saving, setSaving] = useState(false);
  const [adminSettings, setAdminSettings] = useState(
    settings.settings?.admin || {
      dashboardWidgets: ["stats", "recentActivity", "pendingListings"],
      reportSchedules: [],
      userManagement: {
        itemsPerPage: 50,
        defaultFilters: {},
      },
      listingManagement: {
        approvalWorkflow: "manual",
        bulkModeration: false,
      },
    }
  );

  const handleSave = async () => {
    try {
      setSaving(true);
      await onUpdate({ admin: adminSettings });
      toast.success("Admin settings updated successfully");
    } catch (error) {
      toast.error("Failed to update admin settings");
    } finally {
      setSaving(false);
    }
  };

  const availableWidgets = [
    "stats",
    "recentActivity",
    "pendingListings",
    "userGrowth",
    "revenue",
    "popularListings",
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            Dashboard Widgets
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Select widgets to display on your admin dashboard
          </p>
          <div className="space-y-2">
            {availableWidgets.map((widget) => (
              <label
                key={widget}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={
                    adminSettings.dashboardWidgets?.includes(widget) || false
                  }
                  onChange={(e) => {
                    const widgets = adminSettings.dashboardWidgets || [];
                    if (e.target.checked) {
                      setAdminSettings({
                        ...adminSettings,
                        dashboardWidgets: [...widgets, widget],
                      });
                    } else {
                      setAdminSettings({
                        ...adminSettings,
                        dashboardWidgets: widgets.filter((w: string) => w !== widget),
                      });
                    }
                  }}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {widget.replace(/([A-Z])/g, " $1").trim()}
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Items Per Page
            </label>
            <select
              value={adminSettings.userManagement?.itemsPerPage || 50}
              onChange={(e) =>
                setAdminSettings({
                  ...adminSettings,
                  userManagement: {
                    ...adminSettings.userManagement,
                    itemsPerPage: parseInt(e.target.value),
                  } as any,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listing Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Approval Workflow
            </label>
            <select
              value={adminSettings.listingManagement?.approvalWorkflow || "manual"}
              onChange={(e) =>
                setAdminSettings({
                  ...adminSettings,
                  listingManagement: {
                    ...adminSettings.listingManagement,
                    approvalWorkflow: e.target.value as "manual" | "auto",
                  } as any,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="manual">Manual Review</option>
              <option value="auto">Auto-approve Verified Sellers</option>
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={adminSettings.listingManagement?.bulkModeration || false}
              onChange={(e) =>
                setAdminSettings({
                  ...adminSettings,
                  listingManagement: {
                    ...adminSettings.listingManagement,
                    bulkModeration: e.target.checked,
                  } as any,
                })
              }
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Enable bulk moderation tools
            </span>
          </label>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          variant="outline"
          onClick={handleSave} 
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
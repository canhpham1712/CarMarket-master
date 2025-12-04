import { useState } from "react";
import { Database, Save, Loader2, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import type { UserSettings } from "../../types/settings.types";
import toast from "react-hot-toast";

interface SuperAdminSettingsSectionProps {
  settings: UserSettings;
  onUpdate: (data: any) => Promise<void>;
}

export function SuperAdminSettingsSection({
  settings,
  onUpdate,
}: SuperAdminSettingsSectionProps) {
  const [saving, setSaving] = useState(false);
  const [superAdminSettings, setSuperAdminSettings] = useState(
    settings.settings?.superAdmin || {
      systemPreferences: {
        maintenanceMode: false,
      },
      auditPreferences: {
        retentionDays: 90,
        exportFormat: "json",
      },
      databaseMaintenance: {
        autoBackup: true,
        backupSchedule: "daily",
      },
    }
  );

  const handleSave = async () => {
    try {
      setSaving(true);
      await onUpdate({ superAdmin: superAdminSettings });
      toast.success("Super admin settings updated successfully");
    } catch (error) {
      toast.error("Failed to update super admin settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={superAdminSettings.systemPreferences?.maintenanceMode || false}
              onChange={(e) =>
                setSuperAdminSettings({
                  ...superAdminSettings,
                  systemPreferences: {
                    ...superAdminSettings.systemPreferences,
                    maintenanceMode: e.target.checked,
                  },
                })
              }
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Enable maintenance mode
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Audit Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Log Retention (days)
            </label>
            <input
              type="number"
              value={superAdminSettings.auditPreferences?.retentionDays || 90}
              onChange={(e) =>
                setSuperAdminSettings({
                  ...superAdminSettings,
                  auditPreferences: {
                    ...superAdminSettings.auditPreferences,
                    retentionDays: parseInt(e.target.value),
                  },
                })
              }
              min="1"
              max="365"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <select
              value={superAdminSettings.auditPreferences?.exportFormat || "json"}
              onChange={(e) =>
                setSuperAdminSettings({
                  ...superAdminSettings,
                  auditPreferences: {
                    ...superAdminSettings.auditPreferences,
                    exportFormat: e.target.value as "json" | "csv" | "xlsx",
                  },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="xlsx">Excel</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Database Maintenance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={superAdminSettings.databaseMaintenance?.autoBackup !== false}
              onChange={(e) =>
                setSuperAdminSettings({
                  ...superAdminSettings,
                  databaseMaintenance: {
                    ...superAdminSettings.databaseMaintenance,
                    autoBackup: e.target.checked,
                  },
                })
              }
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Enable automatic backups
            </span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Backup Schedule
            </label>
            <select
              value={superAdminSettings.databaseMaintenance?.backupSchedule || "daily"}
              onChange={(e) =>
                setSuperAdminSettings({
                  ...superAdminSettings,
                  databaseMaintenance: {
                    ...superAdminSettings.databaseMaintenance,
                    backupSchedule: e.target.value as "daily" | "weekly" | "monthly",
                  },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
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
          Save Changes
        </Button>
      </div>
    </div>
  );
}


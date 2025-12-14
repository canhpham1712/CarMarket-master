import { useState } from "react";
import { ShieldCheck, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import type { UserSettings } from "../../types/settings.types";
import toast from "react-hot-toast";

interface ModeratorSettingsSectionProps {
  settings: UserSettings;
  onUpdate: (data: any) => Promise<void>;
}

export function ModeratorSettingsSection({
  settings,
  onUpdate,
}: ModeratorSettingsSectionProps) {
  const [saving, setSaving] = useState(false);
  const [moderatorSettings, setModeratorSettings] = useState(
    settings.settings?.moderator || {
      queuePreferences: {
        itemsPerPage: 20,
        sortBy: "createdAt",
        sortOrder: "DESC",
      },
      autoAssignment: false,
      contentFilters: {
        keywords: [],
        autoModeration: false,
      },
    }
  );

  const handleSave = async () => {
    try {
      setSaving(true);
      await onUpdate({ moderator: moderatorSettings });
      toast.success("Moderator settings updated successfully");
    } catch (error) {
      toast.error("Failed to update moderator settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Queue Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Items Per Page
            </label>
            <select
              value={moderatorSettings.queuePreferences?.itemsPerPage || 20}
              onChange={(e) =>
                setModeratorSettings({
                  ...moderatorSettings,
                  queuePreferences: {
                    ...moderatorSettings.queuePreferences,
                    itemsPerPage: parseInt(e.target.value),
                  } as any,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={moderatorSettings.queuePreferences?.sortBy || "createdAt"}
              onChange={(e) =>
                setModeratorSettings({
                  ...moderatorSettings,
                  queuePreferences: {
                    ...moderatorSettings.queuePreferences,
                    sortBy: e.target.value as "createdAt" | "updatedAt" | "priority",
                  } as any,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="createdAt">Created Date</option>
              <option value="updatedAt">Updated Date</option>
              <option value="priority">Priority</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort Order
            </label>
            <select
              value={moderatorSettings.queuePreferences?.sortOrder || "DESC"}
              onChange={(e) =>
                setModeratorSettings({
                  ...moderatorSettings,
                  queuePreferences: {
                    ...moderatorSettings.queuePreferences,
                    sortOrder: e.target.value as "ASC" | "DESC",
                  } as any,
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="ASC">Ascending</option>
              <option value="DESC">Descending</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Content Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={
                moderatorSettings.contentFilters?.autoModeration || false
              }
              onChange={(e) =>
                setModeratorSettings({
                  ...moderatorSettings,
                  contentFilters: {
                    ...moderatorSettings.contentFilters,
                    autoModeration: e.target.checked,
                  } as any,
                })
              }
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Enable auto-moderation
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
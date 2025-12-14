import { useState } from "react";
import { ShoppingBag, Save, Loader2, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import type { UserSettings } from "../../types/settings.types";
import toast from "react-hot-toast";

interface BuyerSettingsSectionProps {
  settings: UserSettings;
  onUpdate: (data: any) => Promise<void>;
}

export function BuyerSettingsSection({
  settings,
  onUpdate,
}: BuyerSettingsSectionProps) {
  const [saving, setSaving] = useState(false);
  const [buyerSettings, setBuyerSettings] = useState(
    settings.settings?.buyer || {
      savedSearches: [],
      favoriteNotifications: true,
      showPurchaseHistory: true,
    }
  );

  const handleSave = async () => {
    try {
      setSaving(true);
      await onUpdate({ buyer: buyerSettings });
      toast.success("Buyer settings updated successfully");
    } catch (error) {
      toast.error("Failed to update buyer settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Buyer Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={buyerSettings.favoriteNotifications !== false}
              onChange={(e) =>
                setBuyerSettings({
                  ...buyerSettings,
                  favoriteNotifications: e.target.checked,
                })
              }
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Receive notifications for favorite listings
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={buyerSettings.showPurchaseHistory !== false}
              onChange={(e) =>
                setBuyerSettings({
                  ...buyerSettings,
                  showPurchaseHistory: e.target.checked,
                })
              }
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Show purchase history on profile
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Saved Searches
          </CardTitle>
        </CardHeader>
        <CardContent>
          {buyerSettings.savedSearches &&
          buyerSettings.savedSearches.length > 0 ? (
            <div className="space-y-2">
              {buyerSettings.savedSearches.map((search: any) => (
                <div
                  key={search.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                >
                  <div>
                    <h3 className="font-medium text-gray-900">{search.name}</h3>
                    <p className="text-sm text-gray-500">
                      {Object.keys(search.query).length} filters
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No saved searches yet. Save searches from the search page to see
              them here.
            </p>
          )}
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


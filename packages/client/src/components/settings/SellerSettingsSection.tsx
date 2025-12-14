import { useState } from "react";
import { Store, Save, Loader2, Shield, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import type { UserSettings } from "../../types/settings.types";
import toast from "react-hot-toast";

interface SellerSettingsSectionProps {
  settings: UserSettings;
  onUpdate: (data: any) => Promise<void>;
}

export function SellerSettingsSection({
  settings,
  onUpdate,
}: SellerSettingsSectionProps) {
  const [saving, setSaving] = useState(false);
  const [sellerSettings, setSellerSettings] = useState(
    settings.settings?.seller || {
      autoApprove: false,
      defaultListingTemplate: {},
      promotionPreferences: {
        autoPromote: false,
      },
    }
  );

  const handleSave = async () => {
    try {
      setSaving(true);
      await onUpdate({ seller: sellerSettings });
      toast.success("Seller settings updated successfully");
    } catch (error) {
      toast.error("Failed to update seller settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Listing Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={sellerSettings.autoApprove || false}
              onChange={(e) =>
                setSellerSettings({
                  ...sellerSettings,
                  autoApprove: e.target.checked,
                })
              }
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Auto-approve listings (requires verification)
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={
                sellerSettings.promotionPreferences?.autoPromote || false
              }
              onChange={(e) =>
                setSellerSettings({
                  ...sellerSettings,
                  promotionPreferences: {
                    ...sellerSettings.promotionPreferences,
                    autoPromote: e.target.checked,
                  },
                })
              }
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Auto-promote new listings
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Verification Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Manage your seller verification status
          </p>
          <a href="/verify-seller">
            <Button variant="outline">View Verification Status</Button>
          </a>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment & Banking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Payment and banking information will be displayed here once
            implemented.
          </p>
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


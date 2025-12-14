import { useState } from "react";
import { Eye, Save, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import type { UserSettings } from "../../types/settings.types";
import toast from "react-hot-toast";

interface PrivacySectionProps {
  settings: UserSettings;
  onUpdate: (data: any) => Promise<void>;
}

export function PrivacySection({ settings, onUpdate }: PrivacySectionProps) {
  const [saving, setSaving] = useState(false);
  const [privacy, setPrivacy] = useState(
    settings.settings?.privacy || {
      profileVisibility: "public",
      showEmail: false,
      showPhone: false,
      showListings: true,
    }
  );

  const handleSave = async () => {
    try {
      setSaving(true);
      await onUpdate({ privacy });
      toast.success("Privacy settings updated successfully");
    } catch (error) {
      toast.error("Failed to update privacy settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Privacy Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Profile Visibility
          </label>
          <select
            value={privacy.profileVisibility || "public"}
            onChange={(e) =>
              setPrivacy({
                ...privacy,
                profileVisibility: e.target.value as "public" | "private" | "friends",
              })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="public">Public - Anyone can view</option>
            <option value="friends">Friends - Only verified connections</option>
            <option value="private">Private - Only you</option>
          </select>
        </div>

        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={privacy.showEmail || false}
              onChange={(e) =>
                setPrivacy({ ...privacy, showEmail: e.target.checked })
              }
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Show email address on profile
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={privacy.showPhone || false}
              onChange={(e) =>
                setPrivacy({ ...privacy, showPhone: e.target.checked })
              }
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Show phone number on profile
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={privacy.showListings !== false}
              onChange={(e) =>
                setPrivacy({ ...privacy, showListings: e.target.checked })
              }
              className="w-4 h-4 text-primary-600 rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Show my listings on profile
            </span>
          </label>
        </div>

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
      </CardContent>
    </Card>
  );
}


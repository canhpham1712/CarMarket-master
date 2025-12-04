import { useState } from "react";
import { Lock, Key, Shield, Save, LogOut } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { PasswordChangeForm } from "../PasswordChangeForm";
import { useAuthStore } from "../../store/auth";
import type { UserSettings } from "../../types/settings.types";
import toast from "react-hot-toast";

interface SecuritySectionProps {
  settings: UserSettings;
  onUpdate: (data: any) => Promise<void>;
}

export function SecuritySection({ settings, onUpdate }: SecuritySectionProps) {
  const { user } = useAuthStore();
  const [saving, setSaving] = useState(false);

  const oauthConnections = settings.settings?.security?.oauthConnections || {
    google: false,
    facebook: false,
  };

  const handleDisconnectOAuth = async (provider: "google" | "facebook") => {
    if (
      !confirm(
        `Are you sure you want to disconnect your ${provider} account? You'll need to use your email and password to sign in.`
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      await onUpdate({
        security: {
          ...settings.settings?.security,
          oauthConnections: {
            ...oauthConnections,
            [provider]: false,
          },
        },
      });
      toast.success(`${provider} account disconnected`);
    } catch (error) {
      toast.error("Failed to disconnect account");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordChangeForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Connected Accounts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Email & Password</h3>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
            <div className="text-sm text-green-600 font-medium">Active</div>
          </div>

          {user?.provider === "google" && (
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">Google</h3>
                <p className="text-sm text-gray-500">Connected</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDisconnectOAuth("google")}
                disabled={saving}
              >
                Disconnect
              </Button>
            </div>
          )}

          {user?.provider === "facebook" && (
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">Facebook</h3>
                <p className="text-sm text-gray-500">Connected</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDisconnectOAuth("facebook")}
                disabled={saving}
              >
                Disconnect
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Login History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Login history will be displayed here once implemented.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}


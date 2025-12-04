import { apiClient } from "../lib/api";
import type { UserSettings, UpdateSettingsDto, SettingsData } from "../types/settings.types";

export class SettingsService {
  static async getSettings(): Promise<UserSettings> {
    return apiClient.get<UserSettings>("/settings");
  }

  static async updateSettings(data: UpdateSettingsDto): Promise<UserSettings> {
    return apiClient.put<UserSettings>("/settings", data);
  }

  static async getDefaultSettings(role?: string): Promise<SettingsData> {
    const params = role ? { role } : undefined;
    return apiClient.get<SettingsData>("/settings/defaults", params);
  }
}


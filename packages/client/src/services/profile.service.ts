import { apiClient } from "../lib/api";
import type { User } from "../types";

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  bio?: string;
  location?: string;
  dateOfBirth?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export class ProfileService {
  static async getProfile(): Promise<User> {
    return apiClient.get<User>("/users/profile");
  }

  static async updateProfile(data: UpdateProfileData): Promise<User> {
    return apiClient.put<User>("/users/profile", data);
  }

  static async changePassword(
    data: ChangePasswordData
  ): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>("/users/change-password", data);
  }

  static async uploadAvatar(
    file: File
  ): Promise<{ message: string; profileImage: string }> {
    const formData = new FormData();
    formData.append("avatar", file);

    return apiClient.post<{ message: string; profileImage: string }>(
      "/users/upload-avatar",
      formData
    );
  }

  static async getUserListings(page: number = 1, limit: number = 10) {
    return apiClient.get("/users/listings", { page, limit });
  }

  static async getUserProfileById(userId: string): Promise<User> {
    return apiClient.get<User>(`/users/${userId}`);
  }

  static async getUserListingsById(
    userId: string,
    page: number = 1,
    limit: number = 10
  ) {
    return apiClient.get(`/users/${userId}/listings`, { page, limit });
  }
}

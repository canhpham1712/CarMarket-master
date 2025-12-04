import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Camera, MapPin, Calendar, Mail, Phone, Save, User } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Avatar } from "../ui/Avatar";
import { ProfileService } from "../../services/profile.service";
import { useAuthStore } from "../../store/auth";
import type { UserSettings } from "../../types/settings.types";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email address"),
  phoneNumber: z
    .string()
    .optional()
    .refine((val) => !val || /^[\+]?[0-9][\d]{8,14}$/.test(val), {
      message: "Please provide a valid phone number",
    }),
  bio: z.string().optional(),
  location: z.string().optional(),
  dateOfBirth: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

interface ProfileSectionProps {
  settings: UserSettings;
  onUpdate: (data: any) => Promise<void>;
}

export function ProfileSection({ settings, onUpdate }: ProfileSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { updateUser, user: authUser } = useAuthStore();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (authUser) {
      setValue("firstName", authUser.firstName);
      setValue("lastName", authUser.lastName);
      setValue("email", authUser.email);
      setValue("phoneNumber", authUser.phoneNumber || "");
      setValue("bio", authUser.bio || "");
      setValue("location", authUser.location || "");
      setValue(
        "dateOfBirth",
        authUser.dateOfBirth ? authUser.dateOfBirth.split("T")[0] : ""
      );
    }
  }, [authUser, setValue]);

  const onSubmit = async (data: ProfileForm) => {
    try {
      const response = await ProfileService.updateProfile(data);
      updateUser(response);
      await onUpdate({});
      toast.success("Profile updated successfully");
      setIsEditing(false);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        "Failed to update profile. Please try again.";
      toast.error(errorMessage);
    }
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image is too large. Please choose a photo smaller than 5MB.");
      return;
    }

    if (!file.type.match(/^image\/(jpeg|jpg|png|gif)$/)) {
      toast.error("Please upload a valid image file (JPEG, PNG, or GIF).");
      return;
    }

    try {
      setIsUploading(true);
      const response = await ProfileService.uploadAvatar(file);
      updateUser({ ...authUser!, profileImage: response.profileImage });
      toast.success("Avatar updated successfully");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Failed to upload avatar";
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  if (!authUser) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Profile Information
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <Avatar
              src={authUser.profileImage}
              alt={`${authUser.firstName} ${authUser.lastName}`}
              size="lg"
            />
            <div>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={isUploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={isUploading}
                  className="flex items-center gap-2"
                >
                  <Camera className="h-4 w-4" />
                  {isUploading ? "Uploading..." : "Change Avatar"}
                </Button>
              </label>
              <p className="text-sm text-gray-500 mt-2">
                JPG, PNG or GIF. Max size 5MB
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name *
              </label>
              <Input
                {...register("firstName")}
                disabled={!isEditing}
                error={errors.firstName?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name *
              </label>
              <Input
                {...register("lastName")}
                disabled={!isEditing}
                error={errors.lastName?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email *
              </label>
              <Input
                type="email"
                {...register("email")}
                disabled={!isEditing}
                error={errors.email?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </label>
              <Input
                {...register("phoneNumber")}
                disabled={!isEditing}
                error={errors.phoneNumber?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Location
              </label>
              <Input
                {...register("location")}
                disabled={!isEditing}
                error={errors.location?.message}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date of Birth
              </label>
              <Input
                type="date"
                {...register("dateOfBirth")}
                disabled={!isEditing}
                error={errors.dateOfBirth?.message}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bio
            </label>
            <textarea
              {...register("bio")}
              disabled={!isEditing}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            {isEditing ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  <Save className="h-4 w-4 mr-2" />
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <Button type="button" onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}


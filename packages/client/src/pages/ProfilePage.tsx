import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import {
  Camera,
  MapPin,
  Calendar,
  Mail,
  Phone,
  Edit,
  Save,
  X,
  User,
  Shield,
  Eye,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Avatar } from "../components/ui/Avatar";
import { PasswordChangeForm } from "../components/PasswordChangeForm";
import { useAuthStore } from "../store/auth";
import { ProfileService } from "../services/profile.service";
import { SellerVerificationService } from "../services/seller-verification.service";
import type { User as UserType } from "../types";
import { AlertCircle } from "lucide-react";

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

export function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState<any>(null);
  const { updateUser, user: authUser } = useAuthStore();

  // Check user roles for button visibility
  const userRoles = authUser?.roles || [];
  const isSeller = userRoles.includes("seller");
  const isAdmin = userRoles.includes("admin");
  const isSuperAdmin = userRoles.includes("super_admin");
  const isAdminOrSuperAdmin = isAdmin || isSuperAdmin;
  
  // Show verification button only for sellers or admins (for viewing purposes)
  const showVerificationButton = isSeller || isAdminOrSuperAdmin;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    fetchUserProfile();
    fetchVerificationStatus();
  }, []);

  const fetchVerificationStatus = async () => {
    try {
      const status = await SellerVerificationService.getMyVerificationStatus();
      setVerification(status);
    } catch (error) {
      // Silently fail - verification status is optional
    }
  };

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await ProfileService.getProfile();
      setUser(response);

      // Populate form with current user data
      setValue("firstName", response.firstName);
      setValue("lastName", response.lastName);
      setValue("email", response.email);
      setValue("phoneNumber", response.phoneNumber || "");
      setValue("bio", response.bio || "");
      setValue("location", response.location || "");
      setValue(
        "dateOfBirth",
        response.dateOfBirth ? response.dateOfBirth.split("T")[0] : ""
      );
    } catch (error) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ProfileForm) => {
    try {
      const response = await ProfileService.updateProfile(data);
      setUser(response);
      updateUser(response);
      
      // Reload verification status after profile update
      await fetchVerificationStatus();
      
      toast.success("✅ Your profile has been updated successfully!");
      setIsEditing(false);
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        "We couldn't update your profile. Please try again.";
      toast.error(errorMessage);
    }
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error(
        "📸 Image is too large. Please choose a photo smaller than 5MB."
      );
      return;
    }

    if (!file.type.match(/^image\/(jpeg|jpg|png|gif)$/)) {
      toast.error("📸 Please upload a valid image file (JPEG, PNG, or GIF).");
      return;
    }

    try {
      setIsUploading(true);
      const response = await ProfileService.uploadAvatar(file);

      const updatedUser = { ...user!, profileImage: response.profileImage };
      setUser(updatedUser);
      updateUser(updatedUser);
      toast.success("📸 Your profile picture has been updated!");
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        "We couldn't upload your photo. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="bg-gray-200 h-8 w-48 rounded mb-6"></div>
          <div className="bg-gray-200 h-64 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Profile not found
          </h1>
          <Button onClick={fetchUserProfile}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-600">
          Manage your account information and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Overview */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-6 text-center">
              {/* Avatar */}
              <div className="relative inline-block mb-4">
                <Avatar
                  src={
                    user.profileImage
                      ? `http://localhost:3000${user.profileImage}`
                      : undefined
                  }
                  alt="Profile"
                  size="xl"
                />
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors"
                >
                  {isUploading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </div>

              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-gray-600 mb-4">{user.email}</p>

              {/* Verification Link - Only show for sellers or admins */}
              {showVerificationButton && (
                <div className="mb-4">
                  {isSeller ? (
                    <a
                      href="/verify-seller"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <Shield className="w-4 h-4" />
                      Get Verified as Seller
                    </a>
                  ) : isAdminOrSuperAdmin ? (
                    <a
                      href="/verify-seller"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm font-medium"
                      title="View only - Admin accounts cannot submit verification"
                    >
                      <Eye className="w-4 h-4" />
                      View Seller Verification
                    </a>
                  ) : null}
                </div>
              )}

              {user.bio && (
                <p className="text-sm text-gray-700 mb-4 italic">
                  "{user.bio}"
                </p>
              )}

              <div className="space-y-2 text-sm text-gray-600">
                {user.location && (
                  <div className="flex items-center justify-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    {user.location}
                  </div>
                )}
                {user.dateOfBirth && (
                  <div className="flex items-center justify-center">
                    <Calendar className="w-4 h-4 mr-2" />
                    {new Date(user.dateOfBirth).toLocaleDateString()}
                  </div>
                )}
                <div className="flex items-center justify-center">
                  <User className="w-4 h-4 mr-2" />
                  Member since {new Date(user.createdAt).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Form */}
        <div className="lg:col-span-2">
          {/* Phone Verification Warning */}
          {verification && 
           verification.status === "approved" && 
           !verification.isPhoneVerified && 
           verification.phoneVerificationDeadline && (
            <Card className="mb-6 border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-yellow-900 mb-1">
                      Phone Number Verification Required
                    </h3>
                    <p className="text-sm text-yellow-800 mb-2">
                      You've changed your phone number. To maintain your verification status, please verify your new phone number within 2 days.
                    </p>
                    <p className="text-sm text-yellow-800 mb-3">
                      Deadline: {new Date(verification.phoneVerificationDeadline).toLocaleString()}
                    </p>
                    <a
                      href="/verify-seller"
                      className="text-sm text-blue-600 hover:text-blue-800 underline font-medium"
                    >
                      Verify Phone Number Now →
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Personal Information</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? (
                  <>
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      First Name
                    </label>
                    <Input
                      id="firstName"
                      {...register("firstName")}
                      disabled={!isEditing}
                      className={errors.firstName ? "border-red-500" : ""}
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.firstName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Last Name
                    </label>
                    <Input
                      id="lastName"
                      {...register("lastName")}
                      disabled={!isEditing}
                      className={errors.lastName ? "border-red-500" : ""}
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600">
                        {errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="email"
                      type="email"
                      {...register("email")}
                      disabled={!isEditing}
                      className={`pl-10 ${errors.email ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="phoneNumber"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="phoneNumber"
                      type="tel"
                      {...register("phoneNumber")}
                      disabled={!isEditing}
                      placeholder="Optional"
                      className={`pl-10 ${errors.phoneNumber ? "border-red-500" : ""}`}
                    />
                  </div>
                  {errors.phoneNumber && (
                    <p className="mt-1 text-sm text-red-600">
                      {errors.phoneNumber.message}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="location"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Location
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="location"
                      {...register("location")}
                      disabled={!isEditing}
                      placeholder="City, Country"
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="dateOfBirth"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Date of Birth
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      id="dateOfBirth"
                      type="date"
                      {...register("dateOfBirth")}
                      disabled={!isEditing}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="bio"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    {...register("bio")}
                    disabled={!isEditing}
                    rows={4}
                    placeholder="Tell us about yourself..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                {isEditing && (
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Password Change */}
          <div className="mt-8">
            <PasswordChangeForm />
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { CheckCircle, Edit, Eye } from "lucide-react"; // Đã bỏ Phone, User, X
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { OtpVerification } from "./OtpVerification";
import { Link } from "react-router-dom";
import { SellerVerificationService, VerificationLevel, type SellerVerification } from "../services/seller-verification.service";
// Đã bỏ import ProfileService vì không dùng
import toast from "react-hot-toast";
import type { User as UserType } from "../types";

interface ViewEditBasicModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userProfile: UserType | null;
  existingVerification: SellerVerification | null;
}

export function ViewEditBasicModal({
  open,
  onClose,
  onSuccess,
  userProfile,
  existingVerification,
}: ViewEditBasicModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (open && existingVerification) {
      const phone = existingVerification.phoneNumber || userProfile?.phoneNumber || "";
      setPhoneNumber(phone);
      setIsPhoneVerified(existingVerification.isPhoneVerified || false);
      setIsEditing(false);
      setHasChanges(false);
    }
  }, [open, existingVerification, userProfile]);

  const handlePhoneVerified = () => {
    setIsPhoneVerified(true);
    setHasChanges(true);
    toast.success("Phone number verified!");
  };

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value);
    setHasChanges(value !== (existingVerification?.phoneNumber || userProfile?.phoneNumber || ""));
  };

  const handleSubmit = async () => {
    if (!phoneNumber) {
      toast.error("Please enter your phone number");
      return;
    }

    if (!hasChanges) {
      // SỬA LỖI: Thay toast.info (không tồn tại) bằng toast với icon
      toast("No changes to save", { icon: "ℹ️" });
      return;
    }

    try {
      setSubmitting(true);

      // If phone number changed and not verified, need to verify first
      if (phoneNumber !== (existingVerification?.phoneNumber || userProfile?.phoneNumber || "") && !isPhoneVerified) {
        toast.error("Please verify your new phone number first");
        return;
      }

      // Submit verification update
      await SellerVerificationService.submitVerification({
        phoneNumber: phoneNumber,
        verificationLevel: VerificationLevel.BASIC,
        documents: [],
      });

      toast.success("✅ Basic verification information updated successfully! Changes will be reviewed by admin.");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error updating Basic verification:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to update verification information. Please try again.";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const fullName = userProfile
    ? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim()
    : existingVerification?.fullName || "";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? <Edit className="w-5 h-5 text-blue-600" /> : <Eye className="w-5 h-5 text-blue-600" />}
            {isEditing ? "Edit" : "View"} Basic Verification
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your basic verification information. Changes will require admin review."
              : "View your basic verification information. Click 'Edit' to make changes."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Status Info */}
          {existingVerification && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-900">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">
                  Status: {existingVerification.status === "approved" ? "Verified" : "Under Review"}
                </span>
              </div>
              {existingVerification.approvedAt && (
                <p className="text-sm text-blue-700 mt-1">
                  Approved on: {new Date(existingVerification.approvedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          {/* Full Name (Read-only from profile) */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Full Name <span className="text-gray-500 text-xs">(From profile)</span>
            </label>
            <div className="flex items-center gap-2">
              <Input value={fullName || "N/A"} disabled className="bg-gray-50" />
              <Link to="/profile">
                <Button variant="outline" size="sm" type="button">
                  Edit Profile
                </Button>
              </Link>
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Phone Number *
            </label>
            {isEditing ? (
              <div className="space-y-3">
                <Input
                  value={phoneNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="Enter your phone number"
                  disabled={submitting}
                />
                {!isPhoneVerified && (
                  <OtpVerification
                    phoneNumber={phoneNumber}
                    onVerified={handlePhoneVerified}
                    disabled={!phoneNumber || submitting}
                  />
                )}
                {isPhoneVerified && (
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">Phone number verified</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input value={phoneNumber || "N/A"} disabled className="bg-gray-50" />
                {isPhoneVerified && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3" />
                    Verified
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {!isEditing ? (
              <>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button onClick={() => setIsEditing(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    // Reset to original values
                    const phone = existingVerification?.phoneNumber || userProfile?.phoneNumber || "";
                    setPhoneNumber(phone);
                    setIsPhoneVerified(existingVerification?.isPhoneVerified || false);
                    setHasChanges(false);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !hasChanges}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
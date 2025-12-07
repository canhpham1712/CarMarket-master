import { useState, useEffect } from "react";
import { Phone, User, Calendar, X, ExternalLink, CheckCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { OtpVerification } from "./OtpVerification";
import { Link } from "react-router-dom";
import { SellerVerificationService, VerificationLevel } from "../services/seller-verification.service";
import { ProfileService } from "../services/profile.service";
import { useAuthStore } from "../store/auth";
import toast from "react-hot-toast";
import type { User as UserType } from "../types";

interface BasicVerificationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userProfile: UserType | null;
  isPhoneVerified: boolean;
}

export function BasicVerificationModal({
  open,
  onClose,
  onSuccess,
  userProfile,
  isPhoneVerified: initialPhoneVerified,
}: BasicVerificationModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPhoneVerified, setIsPhoneVerified] = useState(initialPhoneVerified);
  const [submitting, setSubmitting] = useState(false);
  const { user: authUser } = useAuthStore();

  useEffect(() => {
    if (open && userProfile) {
      setPhoneNumber(userProfile.phoneNumber || "");
      setIsPhoneVerified(initialPhoneVerified);
    }
  }, [open, userProfile, initialPhoneVerified]);

  const handlePhoneVerified = () => {
    setIsPhoneVerified(true);
    toast.success("Phone number verified! You can now submit your verification request.");
  };

  const handleSubmit = async () => {
    if (!phoneNumber) {
      toast.error("Please enter your phone number");
      return;
    }

    if (!isPhoneVerified) {
      toast.error("Please verify your phone number first");
      return;
    }

    try {
      setSubmitting(true);

      // Submit basic verification (phone is already verified via OTP)
      // Note: Backend will use profile data for fullName, dateOfBirth, etc.
      // For Basic level, we only need phoneNumber and documents can be empty
      const fullNameValue = userProfile
        ? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim()
        : "";
      
      const result = await SellerVerificationService.submitVerification({
        phoneNumber: phoneNumber,
        fullName: fullNameValue || "", // Will be overridden by backend from profile
        address: userProfile?.location || "", // Will be overridden by backend from profile
        city: "", // Optional
        country: "Vietnam",
        documents: [], // Basic level doesn't require documents
        verificationLevel: VerificationLevel.BASIC,
      });

      toast.success("✅ Basic verification request submitted successfully! Our team will review it within 24-48 hours.");
      onSuccess();
      onClose();
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message ||
        "Failed to submit verification request. Please try again.";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const fullName = userProfile
    ? `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim()
    : "";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-blue-600" />
            Basic Verification
          </DialogTitle>
          <DialogDescription>
            Complete basic verification by verifying your phone number. This is the first step to becoming a verified seller.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Requirements Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 font-medium mb-2">Requirements for Basic Verification:</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Email verified (already completed)</li>
              <li>✓ Phone number verified (complete below)</li>
            </ul>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <Input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="0912345678"
              disabled={isPhoneVerified}
              className={isPhoneVerified ? "bg-gray-50" : ""}
            />
            {isPhoneVerified && (
              <div className="mt-2 flex items-center gap-2 text-green-700">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Phone number verified</span>
              </div>
            )}
          </div>

          {/* OTP Verification */}
          {phoneNumber && !isPhoneVerified && (
            <OtpVerification
              phoneNumber={phoneNumber}
              onVerified={handlePhoneVerified}
              disabled={submitting}
              initialVerified={false}
            />
          )}

          {/* Full Name (Read-only from profile) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name (as on ID)
              <span className="text-xs text-blue-600 ml-2 font-semibold">(From profile)</span>
              {userProfile?.firstName && userProfile?.lastName && (
                <Link
                  to="/profile"
                  className="text-xs text-blue-600 hover:text-blue-800 ml-2 underline inline-flex items-center gap-1"
                >
                  Edit in Profile
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </label>
            <Input
              value={fullName || "N/A"}
              disabled
              className="bg-gray-50 cursor-not-allowed"
            />
            {!fullName && (
              <p className="text-xs text-yellow-600 mt-1">
                Full name is missing from your profile. Please{" "}
                <Link to="/profile" className="text-blue-600 hover:text-blue-800 underline">
                  update your profile
                </Link>
                {" "}first.
              </p>
            )}
          </div>

          {/* Date of Birth (Read-only from profile) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date of Birth
              {userProfile?.dateOfBirth && (
                <span className="text-xs text-green-600 ml-2">
                  (From profile: {(() => {
                    try {
                      if (!userProfile.dateOfBirth) return "N/A";
                      const date = typeof userProfile.dateOfBirth === 'string'
                        ? new Date(userProfile.dateOfBirth)
                        : (userProfile.dateOfBirth as any) instanceof Date
                        ? userProfile.dateOfBirth
                        : null;
                      return date && !isNaN(date.getTime())
                        ? date.toLocaleDateString()
                        : "N/A";
                    } catch {
                      return "N/A";
                    }
                  })()})
                </span>
              )}
            </label>
            <Input
              type="date"
              value={
                userProfile?.dateOfBirth
                  ? (() => {
                      try {
                        if (!userProfile.dateOfBirth) return "";
                        const date = typeof userProfile.dateOfBirth === 'string'
                          ? new Date(userProfile.dateOfBirth)
                          : (userProfile.dateOfBirth as any) instanceof Date
                          ? userProfile.dateOfBirth
                          : null;
                        if (!date || isNaN(date.getTime())) return "";
                        return date.toISOString().split("T")[0];
                      } catch {
                        return "";
                      }
                    })()
                  : ""
              }
              disabled
              className="bg-gray-50 cursor-not-allowed"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !isPhoneVerified || !phoneNumber}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                "Submit for Verification"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


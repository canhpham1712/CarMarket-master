import { useState, useEffect } from "react";
import { Shield, AlertCircle, CheckCircle, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Card,
  CardContent,
} from "../components/ui/Card";
import {
  SellerVerificationService,
  type SellerVerification,
  VerificationStatus,
  VerificationLevel,
} from "../services/seller-verification.service";
import { ProfileService } from "../services/profile.service";
import { useAuthStore } from "../store/auth";
import type { User } from "../types";
import { VerificationLevelCard } from "../components/VerificationLevelCard";
import { VerificationStatusCard } from "../components/VerificationStatusCard";
import { BasicVerificationModal } from "../components/BasicVerificationModal";
import { StandardVerificationModal } from "../components/StandardVerificationModal";
import { PremiumVerificationModal } from "../components/PremiumVerificationModal";
import { ViewEditBasicModal } from "../components/ViewEditBasicModal";
import { ViewEditStandardModal } from "../components/ViewEditStandardModal";
import { ViewEditPremiumModal } from "../components/ViewEditPremiumModal";

export function SellerVerificationPage() {
  const [verification, setVerification] = useState<SellerVerification | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  
  // Get current user roles
  const { user: authUser } = useAuthStore();
  const userRoles = authUser?.roles || [];
  const isSeller = userRoles.includes("seller");
  const isAdmin = userRoles.includes("admin");
  const isSuperAdmin = userRoles.includes("super_admin");
  const isAdminOrSuperAdmin = isAdmin || isSuperAdmin;
  
  // Admins can only view, not submit
  const isViewOnly = isAdminOrSuperAdmin && !isSeller;
  
  // Modal states
  const [basicModalOpen, setBasicModalOpen] = useState(false);
  const [standardModalOpen, setStandardModalOpen] = useState(false);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [viewEditBasicModalOpen, setViewEditBasicModalOpen] = useState(false);
  const [viewEditStandardModalOpen, setViewEditStandardModalOpen] = useState(false);
  const [viewEditPremiumModalOpen, setViewEditPremiumModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load user profile
      let profile: User | null = null;
      try {
        profile = await ProfileService.getProfile();
        setUserProfile(profile);
      } catch (profileError) {
        console.error("Failed to load profile:", profileError);
      }

      // Load verification status
      try {
        const status = await SellerVerificationService.getMyVerificationStatus();
        setVerification(status);
        if (status) {
          setIsPhoneVerified(status.isPhoneVerified === true);
        } else {
          setIsPhoneVerified(false);
        }
      } catch (verificationError: any) {
        console.error("Failed to load verification status:", verificationError);
        setVerification(null);
        if (verificationError?.response?.status !== 500) {
          toast.error("Failed to load verification status");
        }
      }
    } catch (error) {
      console.error("Unexpected error in loadData:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    loadData();
  };

  const isApproved = verification?.status === VerificationStatus.APPROVED;
  const currentLevel = verification?.verificationLevel || null;

  // Check profile completeness
  const isProfileComplete =
    userProfile?.phoneNumber &&
    userProfile?.firstName &&
    userProfile?.lastName &&
    userProfile?.dateOfBirth;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Seller Verification</h1>
        </div>
        <p className="text-gray-600">
          Get verified to build trust with buyers and increase your sales potential. Choose the verification level that suits your needs.
        </p>
      </div>

      {/* View Only Banner for Admin/Super Admin */}
      {isViewOnly && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">View Only Mode</h3>
                <p className="text-sm text-blue-800">
                  As an {isSuperAdmin ? "Super Admin" : "Admin"}, you can view the seller verification process but cannot submit verification requests. 
                  This page is intended for sellers to verify their identity.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Completeness Banner */}
      {!isProfileComplete && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900 mb-1">Complete Your Profile First</h3>
                <p className="text-sm text-yellow-800 mb-2">
                  We'll use information from your profile for verification. Please complete your profile:
                </p>
                <ul className="text-sm text-yellow-800 space-y-1 mb-3">
                  {!userProfile?.phoneNumber && (
                    <li>• Phone number is missing</li>
                  )}
                  {(!userProfile?.firstName || !userProfile?.lastName) && (
                    <li>• Full name is missing</li>
                  )}
                  {!userProfile?.dateOfBirth && (
                    <li>• Date of birth is missing</li>
                  )}
                </ul>
                <Link
                  to="/profile"
                  className="text-sm text-blue-600 hover:text-blue-800 underline font-medium"
                >
                  Update Profile →
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Status */}
      {verification && <VerificationStatusCard verification={verification} />}

      {/* Verification Levels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <VerificationLevelCard
          level={VerificationLevel.BASIC}
          currentLevel={currentLevel}
          currentStatus={verification?.status || null}
          onGetVerified={isViewOnly ? undefined : () => setBasicModalOpen(true)}
          onUpgrade={isViewOnly ? undefined : () => setBasicModalOpen(true)}
          isViewOnly={isViewOnly}
        />
        <VerificationLevelCard
          level={VerificationLevel.STANDARD}
          currentLevel={currentLevel}
          currentStatus={verification?.status || null}
          onGetVerified={isViewOnly ? undefined : () => setStandardModalOpen(true)}
          onUpgrade={isViewOnly ? undefined : () => setStandardModalOpen(true)}
          onViewDetails={isViewOnly ? undefined : () => {
            // Check if verified at Standard level
            const isVerifiedAtStandard = isApproved && currentLevel === VerificationLevel.STANDARD;
            // Also check if approved at Premium (means Standard was also approved)
            const isVerifiedAtPremium = isApproved && currentLevel === VerificationLevel.PREMIUM;
            if (isVerifiedAtStandard || isVerifiedAtPremium) {
              setViewEditStandardModalOpen(true);
            } else {
              setStandardModalOpen(true);
            }
          }}
          isViewOnly={isViewOnly}
        />
        <VerificationLevelCard
          level={VerificationLevel.PREMIUM}
          currentLevel={currentLevel}
          currentStatus={verification?.status || null}
          onGetVerified={isViewOnly ? undefined : () => setPremiumModalOpen(true)}
          onUpgrade={isViewOnly ? undefined : () => setPremiumModalOpen(true)}
          onViewDetails={isViewOnly ? undefined : () => {
            // Check if verified at Premium level
            if (isApproved && currentLevel === VerificationLevel.PREMIUM) {
              setViewEditPremiumModalOpen(true);
            } else {
              setPremiumModalOpen(true);
            }
          }}
          isViewOnly={isViewOnly}
        />
      </div>

      {/* Success Message for Premium Verified */}
      {isApproved && currentLevel === VerificationLevel.PREMIUM && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="text-lg font-semibold text-green-900">
                  Congratulations! You are a verified seller
                </h3>
                <p className="text-green-700">
                  Your verification badge will be displayed on your profile and listings, helping you build trust with buyers.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <BasicVerificationModal
        open={basicModalOpen}
        onClose={() => setBasicModalOpen(false)}
        onSuccess={handleSuccess}
        userProfile={userProfile}
        isPhoneVerified={isPhoneVerified}
      />
      <StandardVerificationModal
        open={standardModalOpen}
        onClose={() => setStandardModalOpen(false)}
        onSuccess={handleSuccess}
        userProfile={userProfile}
        existingVerification={verification}
      />
      <PremiumVerificationModal
        open={premiumModalOpen}
        onClose={() => setPremiumModalOpen(false)}
        onSuccess={handleSuccess}
        userProfile={userProfile}
        existingVerification={verification}
      />
      <ViewEditBasicModal
        open={viewEditBasicModalOpen}
        onClose={() => setViewEditBasicModalOpen(false)}
        onSuccess={handleSuccess}
        userProfile={userProfile}
        existingVerification={verification}
      />
      <ViewEditStandardModal
        open={viewEditStandardModalOpen}
        onClose={() => setViewEditStandardModalOpen(false)}
        onSuccess={handleSuccess}
        userProfile={userProfile}
        existingVerification={verification}
      />
      <ViewEditPremiumModal
        open={viewEditPremiumModalOpen}
        onClose={() => setViewEditPremiumModalOpen(false)}
        onSuccess={handleSuccess}
        userProfile={userProfile}
        existingVerification={verification}
      />
    </div>
  );
}

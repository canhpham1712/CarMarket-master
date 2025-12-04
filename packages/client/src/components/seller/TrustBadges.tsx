import { CheckCircle2, Clock, Calendar, Shield, ShieldCheck } from "lucide-react";
import { Badge } from "../ui/Badge";
import { Tooltip } from "../ui/Tooltip";
import type { User } from "../../types";
import { useEffect, useState } from "react";
import { SellerVerificationService } from "../../services/seller-verification.service";

interface TrustBadgesProps {
  user: User;
  responseTime?: string; // e.g., "Usually responds within 2 hours"
  isVerified?: boolean; // Legacy prop, will be overridden by API check
}

export function TrustBadges({
  user,
  responseTime,
  isVerified: legacyVerified = false,
}: TrustBadgesProps) {
  const [isVerified, setIsVerified] = useState(legacyVerified);
  const [verificationLevel, setVerificationLevel] = useState<string | null>(null);

  useEffect(() => {
    // Check verification status from API
    SellerVerificationService.checkIfVerified(user.id)
      .then((result) => {
        setIsVerified(result.isVerified);
        setVerificationLevel(result.level);
      })
      .catch(() => {
        // If API fails, fall back to legacy prop
        setIsVerified(legacyVerified);
      });
  }, [user.id, legacyVerified]);

  const memberSince = new Date(user.createdAt);
  const memberYears = new Date().getFullYear() - memberSince.getFullYear();
  const isLongTermMember = memberYears >= 1;

  const getVerificationTooltip = () => {
    if (!isVerified) return "";
    const levelText = verificationLevel 
      ? verificationLevel.charAt(0).toUpperCase() + verificationLevel.slice(1)
      : "Basic";
    return `This seller has been verified by our team. Verification level: ${levelText}. This badge indicates that the seller's identity and contact information have been confirmed, providing buyers with added confidence and trust.`;
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Verified Badge */}
      {isVerified && (
        <Tooltip content={getVerificationTooltip()} position="bottom">
          <Badge variant="success" className="flex items-center gap-1 cursor-help">
            <ShieldCheck className="w-3 h-3" />
            <span>
              Verified Seller
              {verificationLevel && verificationLevel !== "basic" && (
                <span className="ml-1 text-xs">({verificationLevel})</span>
              )}
            </span>
          </Badge>
        </Tooltip>
      )}

      {/* Email Verified */}
      {user.isEmailVerified && (
        <Badge variant="info" className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          <span>Email Verified</span>
        </Badge>
      )}

      {/* Member Since */}
      <Badge variant="outline" className="flex items-center gap-1">
        <Calendar className="w-3 h-3" />
        <span>
          Member since {memberSince.getFullYear()}
          {isLongTermMember && ` (${memberYears} year${memberYears !== 1 ? "s" : ""})`}
        </span>
      </Badge>

      {/* Response Time */}
      {responseTime && (
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{responseTime}</span>
        </Badge>
      )}

      {/* Active Status */}
      {user.isActive && (
        <Badge variant="success" className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>Active</span>
        </Badge>
      )}
    </div>
  );
}


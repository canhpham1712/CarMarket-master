import { CheckCircle2, Clock, Calendar, Shield } from "lucide-react";
import { Badge } from "../ui/Badge";
import type { User } from "../../types";

interface TrustBadgesProps {
  user: User;
  responseTime?: string; // e.g., "Usually responds within 2 hours"
  isVerified?: boolean;
}

export function TrustBadges({
  user,
  responseTime,
  isVerified = false,
}: TrustBadgesProps) {
  const memberSince = new Date(user.createdAt);
  const memberYears = new Date().getFullYear() - memberSince.getFullYear();
  const isLongTermMember = memberYears >= 1;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Verified Badge */}
      {isVerified && (
        <Badge variant="success" className="flex items-center gap-1">
          <Shield className="w-3 h-3" />
          <span>Verified Seller</span>
        </Badge>
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


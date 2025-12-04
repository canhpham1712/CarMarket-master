import { Shield, ShieldCheck, CheckCircle, Lock } from "lucide-react";
import { Button } from "./ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { VerificationLevel, VerificationStatus } from "../services/seller-verification.service";

interface VerificationLevelCardProps {
  level: VerificationLevel;
  currentLevel: VerificationLevel | null;
  currentStatus: VerificationStatus | null;
  onGetVerified?: () => void;
  onUpgrade?: () => void;
  onViewDetails?: () => void;
  isViewOnly?: boolean;
}

const levelConfig = {
  [VerificationLevel.BASIC]: {
    name: "Basic",
    icon: Shield,
    color: "blue",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    features: [
      "Email verified",
      "Phone number verified",
    ],
  },
  [VerificationLevel.STANDARD]: {
    name: "Standard",
    icon: ShieldCheck,
    color: "green",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
    features: [
      "All Basic features",
      "Identity document verified (CMND/CCCD/Passport)",
    ],
  },
  [VerificationLevel.PREMIUM]: {
    name: "Premium",
    icon: ShieldCheck,
    color: "purple",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-700",
    features: [
      "All Standard features",
      "Bank account verified",
      "Address proof verified",
    ],
  },
};

export function VerificationLevelCard({
  level,
  currentLevel,
  currentStatus,
  onGetVerified,
  onUpgrade,
  onViewDetails,
  isViewOnly = false,
}: VerificationLevelCardProps) {
  const config = levelConfig[level];
  const Icon = config.icon;
  const isApproved = currentStatus === VerificationStatus.APPROVED;
  const isPending = currentStatus === VerificationStatus.PENDING || currentStatus === VerificationStatus.IN_REVIEW;
  
  const levelOrder = [
    VerificationLevel.BASIC,
    VerificationLevel.STANDARD,
    VerificationLevel.PREMIUM,
  ];
  const currentLevelIndex = currentLevel ? levelOrder.indexOf(currentLevel) : -1;
  const targetLevelIndex = levelOrder.indexOf(level);
  
  // Determine the highest approved level
  // If currentLevel is STANDARD/PREMIUM and status is PENDING, it means user was approved at previous level
  // If status is APPROVED, user is approved at currentLevel
  let highestApprovedLevel: VerificationLevel | null = null;
  if (isApproved && currentLevel) {
    highestApprovedLevel = currentLevel;
  } else if (isPending && currentLevel && currentLevelIndex > 0) {
    // If pending at a higher level, user was approved at the previous level
    highestApprovedLevel = levelOrder[currentLevelIndex - 1];
  }
  
  const highestApprovedIndex = highestApprovedLevel ? levelOrder.indexOf(highestApprovedLevel) : -1;
  
  // User is verified at this level if:
  // 1. Approved and current level is exactly this level, OR
  // 2. Approved at a higher level (meaning they've passed this level), OR
  // 3. Pending at a higher level and this level was previously approved
  const isVerifiedAtThisLevel = (
    (isApproved && currentLevel === level) ||
    (isApproved && currentLevel && currentLevelIndex > targetLevelIndex) ||
    (isPending && highestApprovedIndex >= targetLevelIndex)
  );
  
  // Check if user can upgrade to this level
  // Can upgrade if:
  // 1. Approved at a lower level (can upgrade to higher level)
  // 2. Or no verification yet and this is Basic level
  const canUpgrade = highestApprovedLevel && (
    targetLevelIndex > highestApprovedIndex || 
    (targetLevelIndex === 0 && !highestApprovedLevel) // Can start with Basic
  );
  
  // Can access if this is Basic (always accessible) or if approved at previous level
  const canAccess = targetLevelIndex === 0 || 
    (highestApprovedLevel && targetLevelIndex <= highestApprovedIndex + 1);

  // Determine button state and text
  let buttonText = "Get Verified";
  let buttonVariant: "default" | "outline" | "ghost" = "default";
  let buttonDisabled = false;
  let buttonAction: (() => void) | undefined = onGetVerified;

  if (isViewOnly) {
    // View-only mode for admins - disable all actions
    buttonText = "View Only";
    buttonVariant = "outline";
    buttonDisabled = true;
    buttonAction = undefined;
  } else if (isVerifiedAtThisLevel) {
    buttonText = "View Details";
    buttonVariant = "outline";
    buttonDisabled = false;
    buttonAction = onViewDetails || onGetVerified;
  } else if (canUpgrade) {
    buttonText = `Upgrade to ${config.name}`;
    buttonAction = onUpgrade;
  } else if (!canAccess) {
    buttonText = "Complete previous level first";
    buttonVariant = "outline";
    buttonDisabled = true;
  }

  return (
    <Card className={`${config.bgColor} ${config.borderColor} border-2 h-full flex flex-col`}>
      <CardHeader>
        <div className="flex items-center gap-3 mb-2">
          <Icon className={`w-6 h-6 ${config.textColor}`} />
          <CardTitle className={config.textColor}>{config.name}</CardTitle>
          {level === VerificationLevel.PREMIUM && (
            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
              Recommended
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <ul className="text-sm text-gray-700 space-y-2 mb-4 flex-1">
          {config.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <CheckCircle className={`w-4 h-4 ${config.textColor} mt-0.5 flex-shrink-0`} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-4 border-t border-gray-200">
          <Button
            onClick={buttonAction}
            disabled={buttonDisabled || !buttonAction}
            variant={buttonVariant}
            className={`w-full ${
              buttonDisabled || isViewOnly
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : isVerifiedAtThisLevel
                ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                : level === VerificationLevel.BASIC
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : level === VerificationLevel.STANDARD
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-purple-600 text-white hover:bg-purple-700"
            }`}
          >
            {isVerifiedAtThisLevel && !isViewOnly && (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            {buttonText}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function canAccessLevel(
  targetLevel: VerificationLevel,
  currentLevel: VerificationLevel | null,
  isApproved: boolean
): boolean {
  if (!currentLevel || !isApproved) {
    // No verification yet, can start with Basic
    return targetLevel === VerificationLevel.BASIC;
  }

  const levelOrder = [
    VerificationLevel.BASIC,
    VerificationLevel.STANDARD,
    VerificationLevel.PREMIUM,
  ];

  const currentIndex = levelOrder.indexOf(currentLevel);
  const targetIndex = levelOrder.indexOf(targetLevel);

  // Can access if target is current level or next level
  return targetIndex <= currentIndex + 1;
}

function isLevelHigher(level1: VerificationLevel, level2: VerificationLevel): boolean {
  const levelOrder = [
    VerificationLevel.BASIC,
    VerificationLevel.STANDARD,
    VerificationLevel.PREMIUM,
  ];
  return levelOrder.indexOf(level1) > levelOrder.indexOf(level2);
}


import { CheckCircle, Clock, XCircle, AlertCircle, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { VerificationStatus, VerificationLevel, type SellerVerification } from "../services/seller-verification.service";

interface VerificationStatusCardProps {
  verification: SellerVerification;
}

export function VerificationStatusCard({ verification }: VerificationStatusCardProps) {
  const getStatusBadge = () => {
    switch (verification.status) {
      case VerificationStatus.APPROVED:
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">Verified Seller</span>
            <span className="text-sm">({verification.verificationLevel})</span>
          </div>
        );
      case VerificationStatus.PENDING:
      case VerificationStatus.IN_REVIEW:
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">Under Review</span>
          </div>
        );
      case VerificationStatus.REJECTED:
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg">
            <XCircle className="w-5 h-5" />
            <span className="font-semibold">Rejected</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Verification Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {getStatusBadge()}

          {verification.rejectionReason && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-900 mb-1">Rejection Reason:</p>
                  <p className="text-red-800">{verification.rejectionReason}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Level:
              </span>
              <span className="ml-2 font-medium capitalize">{verification.verificationLevel}</span>
            </div>
            {verification.submittedAt && (
              <div>
                <span className="text-gray-600 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  Submitted:
                </span>
                <span className="ml-2 font-medium">
                  {new Date(verification.submittedAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {verification.approvedAt && (
              <div>
                <span className="text-gray-600 flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Approved:
                </span>
                <span className="ml-2 font-medium">
                  {new Date(verification.approvedAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {verification.rejectedAt && (
              <div>
                <span className="text-gray-600 flex items-center gap-1">
                  <XCircle className="w-4 h-4" />
                  Rejected:
                </span>
                <span className="ml-2 font-medium">
                  {new Date(verification.rejectedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/Dialog";
import { PromotionPricingCard } from "./PromotionPricingCard";
import { PromotionService } from "../../services/promotion.service";
import type { PromotionPricing, ListingDetail } from "../../types";
import toast from "react-hot-toast";

interface PromoteListingDialogProps {
  listing: ListingDetail;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PromoteListingDialog({
  listing,
  open,
  onClose,
  onSuccess,
}: PromoteListingDialogProps) {
  const navigate = useNavigate();
  const [pricing, setPricing] = useState<PromotionPricing[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      loadPricing();
    }
  }, [open]);

  const loadPricing = async () => {
    try {
      setLoading(true);
      const data = await PromotionService.getPricing();
      setPricing(data);
    } catch (error: any) {
      toast.error("Failed to load pricing");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPackage = async (packageType: string) => {
    try {
      setSubmitting(true);
      const response = await PromotionService.createPromotion(
        listing.id,
        packageType
      );

      // Redirect to payment page
      if (response.paymentUrl && response.promotionId) {
        // Use promotionId from response
        navigate(`/promotions/${response.promotionId}/pay`);
        onClose();
      } else if (response.paymentUrl) {
        // Extract promotion ID from paymentUrl (format: /promotions/{id}/pay)
        const match = response.paymentUrl.match(/\/promotions\/([^\/]+)\/pay/);
        if (match && match[1]) {
          navigate(`/promotions/${match[1]}/pay`);
          onClose();
        } else {
          toast.error("Unable to redirect to payment page");
        }
      } else {
        toast.success("Promotion request created successfully!");
        onSuccess?.();
        onClose();
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to create promotion request"
      );
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            <DialogTitle>Promote Listing to Top</DialogTitle>
          </div>
          <DialogDescription>
            Choose a promotion package to make your listing appear at the top of the homepage
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">Loading pricing...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pricing.map((p) => (
                <PromotionPricingCard
                  key={p.packageType}
                  pricing={p}
                  onSelect={handleSelectPackage}
                  loading={submitting}
                />
              ))}
            </div>
          )}

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h5 className="font-semibold text-sm text-gray-900 mb-2">
              Benefits of promoting your listing:
            </h5>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Listing appears at the top of homepage</li>
              <li>• Increase views and engagement</li>
              <li>• More buyers will contact you</li>
              <li>• Sell faster</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


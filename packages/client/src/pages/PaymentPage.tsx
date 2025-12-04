import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { CreditCard, CheckCircle, AlertCircle, Shield, Lock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { PromotionService } from "../services/promotion.service";
import { apiClient } from "../lib/api";
import type { ListingPromotion } from "../types";
import toast from "react-hot-toast";

export function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [promotion, setPromotion] = useState<ListingPromotion | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (id) {
      loadPromotionDetails();
    }
  }, [id]);

  const loadPromotionDetails = async () => {
    if (!id) {
      toast.error("Invalid promotion ID");
      navigate("/my-listings");
      return;
    }

    try {
      setLoading(true);
      const data = await PromotionService.getPromotionDetails(id);
      setPromotion(data);
    } catch (error: any) {
      console.error("Error loading promotion:", error);
      // Don't show error toast immediately, try to get from my-promotions instead
      try {
        const myPromotions = await PromotionService.getMyPromotions();
        const foundPromotion = myPromotions.find(p => p.id === id);
        if (foundPromotion) {
          setPromotion(foundPromotion);
        } else {
          toast.error("Failed to load promotion information");
          navigate("/my-listings");
        }
      } catch (fallbackError) {
        toast.error("Không thể tải thông tin promotion");
        navigate("/my-listings");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!id) return;

    try {
      setProcessing(true);
      
      // Create payment URL from backend
      const response = await PromotionService.createPaymentUrl(id);
      
      // Redirect to PayOS payment page
      window.location.href = response.paymentUrl;
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(error.response?.data?.message || "Failed to create payment. Please try again.");
      setProcessing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const getPackageLabel = (packageType: string) => {
    switch (packageType) {
      case "1_day":
        return "1 Day";
      case "3_days":
        return "3 Days";
      case "7_days":
        return "7 Days";
      default:
        return packageType;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading payment information...</p>
        </div>
      </div>
    );
  }

  if (!promotion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Promotion information not found
            </h2>
            <Button
              onClick={() => navigate("/my-listings")}
              className="mt-4 bg-blue-600 text-white hover:bg-blue-700"
            >
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-6 w-6" />
              Payment for Promotion
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Promotion Info */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-gray-900 mb-2">
                Promotion Package Information
              </h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Package:</span>
                  <span className="font-medium">{getPackageLabel(promotion.packageType)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">
                    {promotion.packageType === '1_day' ? 1 : 
                     promotion.packageType === '3_days' ? 3 : 7} {promotion.packageType === '1_day' ? 'day' : 'days'}
                  </span>
                </div>
                {promotion.listing && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Listing:</span>
                    <span className="font-medium">{promotion.listing.title}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Amount */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-lg border-2 border-blue-200">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold text-gray-700">Total Amount:</span>
                <span className="text-3xl font-bold text-blue-600">
                  {formatPrice(promotion.amount)}
                </span>
              </div>
              <div className="flex items-start gap-2 mt-3 pt-3 border-t border-blue-200">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-700">
                  After payment, your listing will be promoted to the top of the homepage immediately
                </p>
              </div>
            </div>

            {/* PayOS Payment Method */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900">Payment Gateway:</h4>
              <div className="bg-white border-2 border-blue-500 rounded-lg p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <CreditCard className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">PayOS</div>
                      <div className="text-sm text-gray-500">Secure Payment Gateway</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <Shield className="h-5 w-5" />
                    <Lock className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Supports Credit Cards, Debit Cards & E-Wallets</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>256-bit SSL encryption for secure transactions</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => navigate("/my-listings")}
                className="flex-1"
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePayment}
                disabled={processing}
                className="flex-1 bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all"
              >
                {processing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Redirecting to PayOS...
                  </>
                ) : (
                  <>
                    <span>Pay with PayOS</span>
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


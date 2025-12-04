import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { apiClient } from "../lib/api";
import toast from "react-hot-toast";

export function PayOSCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{
    success: boolean;
    promotionId: string;
    message: string;
  } | null>(null);
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    // Only process callback once, even if component re-renders
    if (!hasProcessedRef.current) {
      hasProcessedRef.current = true;
      handleCallback();
    }
  }, []);

  useEffect(() => {
    if (result?.success) {
      const timer = setTimeout(() => {
        navigate("/my-listings", { state: { reloadPromotions: true } });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [result, navigate]);

  const handleCallback = async () => {
    try {
      setLoading(true);
      
      // Check if payment was cancelled
      const status = searchParams.get("status");
      if (status === "cancelled") {
        setResult({
          success: false,
          promotionId: searchParams.get("orderCode") || "",
          message: "Payment was cancelled",
        });
        toast.error("Payment was cancelled", { id: 'payment-cancelled' });
        setLoading(false);
        return;
      }
      
      // Get all query parameters from PayOS (PayOS redirects directly to this URL)
      const params: Record<string, string> = {};
      searchParams.forEach((value, key) => {
        params[key] = value;
      });

      // Log params for debugging
      console.log('PayOS Callback Frontend - Query Params from URL:', params);
      console.log('PayOS Callback Frontend - Full URL:', window.location.href);
      console.log('PayOS Callback Frontend - orderCode:', searchParams.get("orderCode"));
      console.log('PayOS Callback Frontend - code:', searchParams.get("code"));
      console.log('PayOS Callback Frontend - status:', searchParams.get("status"));

      // Build query string manually to ensure params are sent correctly to backend
      // PayOS sends: ?code=00&orderCode=123&amount=20000&status=PAID&signature=...
      const queryString = new URLSearchParams(params).toString();
      const callbackUrl = `/payment/callback?${queryString}`;
      
      console.log('PayOS Callback Frontend - Calling backend URL:', callbackUrl);

      // Call backend to verify and process payment
      // Pass query string directly in URL instead of using params object
      const response = await apiClient.get<{
        success: boolean;
        promotionId: string;
        message: string;
      }>(callbackUrl);

      setResult(response);
      
      // Only show toast if we haven't shown it yet (prevent duplicate toasts)
      if (response.success) {
        toast.success("Payment successful!", { id: 'payment-success' });
      } else {
        toast.error(response.message || "Payment failed", { id: 'payment-error' });
      }
    } catch (error: any) {
      console.error("Callback error:", error);
      toast.error("Error processing payment callback", { id: 'payment-callback-error' });
      setResult({
        success: false,
        promotionId: searchParams.get("orderCode") || searchParams.get("orderId") || "",
        message: "Error processing payment callback",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-16 w-16 text-blue-500 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Processing Payment...
            </h2>
            <p className="text-gray-600">
              Please wait while we verify your payment
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const isSuccess = result.success;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {isSuccess ? (
            <>
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Successful!
              </h2>
              <p className="text-gray-600 mb-6">
                {result.message || "Your listing has been promoted to the top."}
              </p>
              <Button
                onClick={() => navigate("/my-listings", { state: { reloadPromotions: true } })}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                View My Listings
              </Button>
              <p className="text-sm text-gray-500 mt-4">
                Redirecting automatically in 3 seconds...
              </p>
            </>
          ) : (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Failed
              </h2>
              <p className="text-gray-600 mb-6">{result.message}</p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => navigate("/my-listings")}
                >
                  Go Back
                </Button>
                {result.promotionId && (
                  <Button
                    onClick={() => navigate(`/promotions/${result.promotionId}/pay`)}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Try Again
                  </Button>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


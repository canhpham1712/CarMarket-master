import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import toast from "react-hot-toast";

export function PaymentCallbackPage() {
  const { id, status: paymentStatus } = useParams<{ id: string; status: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (paymentStatus === "success") {
      setMessage("Payment successful! Your listing has been promoted to the top.");
      // Auto redirect after 3 seconds
      const timer = setTimeout(() => {
        navigate("/my-listings", { state: { reloadPromotions: true } });
      }, 3000);
      return () => clearTimeout(timer);
    } else if (paymentStatus === "failed") {
      setMessage("Payment failed. Please try again.");
    } else {
      setMessage("Invalid payment status.");
    }
  }, [paymentStatus, navigate]);

  const isSuccess = paymentStatus === "success";

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
              <p className="text-gray-600 mb-6">{message}</p>
              <Button
                onClick={() => navigate("/my-listings", { state: { reloadPromotions: true } })}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                View My Listings
              </Button>
              {paymentStatus === "success" && (
                <p className="text-sm text-gray-500 mt-4">
                  Redirecting automatically in 3 seconds...
                </p>
              )}
            </>
          ) : (
            <>
              <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Failed
              </h2>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => navigate("/my-listings")}
                >
                  Go Back
                </Button>
                {id && (
                  <Button
                    onClick={() => navigate(`/promotions/${id}/pay`)}
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


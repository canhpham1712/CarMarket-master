import { useState } from "react";
import { Calculator, Loader2, TrendingUp, Info } from "lucide-react";
import { Button } from "./ui/Button";
import { ValuationService, type ValuationRequest, type ValuationResponse } from "../services/valuation.service";
import toast from "react-hot-toast";

interface CarValuationProps {
  brand: string;
  model: string;
  year: number;
  mileage: number;
  color?: string;
  version?: string;
  onPriceEstimate?: (price: number) => void;
}

export function CarValuation({
  brand,
  model,
  year,
  mileage,
  color,
  version,
  onPriceEstimate,
}: CarValuationProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ValuationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canEstimate = brand && model && year && mileage > 0;

  const handleEstimate = async () => {
    if (!canEstimate) {
      toast.error("Please fill in all required information: Make, Model, Year, and Mileage");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const request: ValuationRequest = {
        brand,
        model,
        year,
        mileage_km: mileage,
        ...(color && { color }),
        ...(version && { version }),
      };

      const response = await ValuationService.estimatePrice(request);
      setResult(response);
      
      // Callback để set giá vào form
      if (onPriceEstimate) {
        onPriceEstimate(response.price_estimate);
      }

      toast.success("Price estimation successful!");
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.details ||
        err?.response?.data?.message ||
        err?.message ||
        "Unable to connect to valuation service. Please try again later.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        onClick={handleEstimate}
        disabled={!canEstimate || loading}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Calculating...
          </>
        ) : (
          <>
            <Calculator className="w-4 h-4 mr-2" />
            Auto Estimate Price
          </>
        )}
      </Button>

      {result && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-blue-900 font-semibold">
            <TrendingUp className="w-5 h-5" />
            <span>Price Estimate Result</span>
          </div>
          
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Estimated Price:</span>
              <span className="font-bold text-blue-700">
                {result.price_estimate.toLocaleString("en-US")} million VND
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Price Range:</span>
              <span>
                {result.price_min.toLocaleString("en-US")} - {result.price_max.toLocaleString("en-US")} million VND
              </span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Confidence Level:</span>
              <span className="font-medium">{result.confidence_level}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-blue-200">
            <div className="flex items-start gap-2 text-xs text-gray-600">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                This is only a reference price. You can use this price or enter a different one.
              </span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!canEstimate && (
        <p className="text-xs text-gray-500">
          Fill in Make, Model, Year, and Mileage to use the price estimation feature
        </p>
      )}
    </div>
  );
}


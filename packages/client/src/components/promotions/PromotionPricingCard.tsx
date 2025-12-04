import { Check } from "lucide-react";
import { Card, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import type { PromotionPricing } from "../../types";

interface PromotionPricingCardProps {
  pricing: PromotionPricing;
  onSelect: (packageType: string) => void;
  loading?: boolean;
}

export function PromotionPricingCard({
  pricing,
  onSelect,
  loading = false,
}: PromotionPricingCardProps) {
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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  return (
    <Card
      className="relative transition-all hover:shadow-lg border border-gray-200 flex flex-col h-full"
    >
      <CardContent className="p-6 flex flex-col flex-1">
        <div className="text-center mb-4">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {getPackageLabel(pricing.packageType)}
          </h3>
          <div className="text-3xl font-bold text-blue-600 mb-1">
            {formatPrice(pricing.price)}
          </div>
          <div className="text-sm text-gray-500">
            {formatPrice(pricing.pricePerDay)} / day
          </div>
        </div>

        <ul className="space-y-2 mb-6 flex-1">
          <li className="flex items-center text-sm text-gray-700">
            <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
            <span>Listing appears at top of homepage</span>
          </li>
          <li className="flex items-center text-sm text-gray-700">
            <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
            <span>Display for {pricing.durationDays} {pricing.durationDays === 1 ? 'day' : 'days'}</span>
          </li>
          <li className="flex items-center text-sm text-gray-700">
            <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
            <span>Increase views and contacts</span>
          </li>
          {pricing.durationDays > 1 ? (() => {
            // Base price: 20,000 VND/day (price of 1 day package)
            const basePricePerDay = 20000;
            const totalPriceIfDaily = basePricePerDay * pricing.durationDays;
            const savingsPercent = Math.round(
              ((totalPriceIfDaily - pricing.price) / totalPriceIfDaily) * 100
            );
            return (
              <li className="flex items-center text-sm text-green-600 font-medium">
                <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                <span>
                  Save {savingsPercent}% compared to daily posting
                </span>
              </li>
            );
          })() : (
            <li className="flex items-center text-sm text-transparent">
              <Check className="h-4 w-4 text-transparent mr-2 flex-shrink-0" />
              <span>&nbsp;</span>
            </li>
          )}
        </ul>

        <Button
          onClick={() => onSelect(pricing.packageType)}
          disabled={loading}
          className="w-full bg-blue-600 text-white hover:bg-blue-700 mt-auto"
        >
          {loading ? "Processing..." : "Select Package"}
        </Button>
      </CardContent>
    </Card>
  );
}


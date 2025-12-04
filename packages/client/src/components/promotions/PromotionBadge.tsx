import { useState, useEffect } from "react";
import { TrendingUp } from "lucide-react";
import type { ListingPromotion } from "../../types";

interface PromotionBadgeProps {
  promotion: ListingPromotion;
}

export function PromotionBadge({ promotion }: PromotionBadgeProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    const updateTimeRemaining = () => {
      const now = new Date();
      const endDate = new Date(promotion.endDate);
      const diff = endDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("Expired");
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h left`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m left`);
      } else {
        setTimeRemaining(`${minutes}m left`);
      }
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [promotion.endDate]);

  if (promotion.status !== "active") {
    return null;
  }

  return (
    <div className="absolute top-2 right-2 z-10">
      <div className="bg-yellow-400 text-yellow-900 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-lg">
        <TrendingUp className="h-3.5 w-3.5" />
        <span>Promoted</span>
        {timeRemaining && (
          <span className="ml-1 text-yellow-800">• {timeRemaining}</span>
        )}
      </div>
    </div>
  );
}


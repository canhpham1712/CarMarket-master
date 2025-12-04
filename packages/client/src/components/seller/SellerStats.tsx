import { Car, Star, Eye, Calendar } from "lucide-react";
import { Card, CardContent } from "../ui/Card";
import { RatingDisplay } from "../ratings/RatingDisplay";
import type { RatingStats, ListingDetail } from "../../types";
import { formatNumber } from "../../lib/utils";

interface SellerStatsProps {
  listings: ListingDetail[];
  ratingStats: RatingStats | null;
  memberSince: string;
}

export function SellerStats({
  listings,
  ratingStats,
  memberSince,
}: SellerStatsProps) {
  const totalListings = listings.length;
  const activeListings = listings.filter(
    (l) => l.status === "approved" || l.status === "active"
  ).length;
  const soldListings = listings.filter((l) => l.status === "sold").length;
  const totalViews = listings.reduce((sum, l) => sum + l.viewCount, 0);
  const totalFavorites = listings.reduce((sum, l) => sum + l.favoriteCount, 0);
  const memberYears = new Date().getFullYear() - new Date(memberSince).getFullYear();

  const stats = [
    {
      label: "Total Listings",
      value: formatNumber(totalListings),
      icon: Car,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      subLabel: `${activeListings} active, ${soldListings} sold`,
    },
    {
      label: "Total Views",
      value: formatNumber(totalViews),
      icon: Eye,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      subLabel: "Across all listings",
    },
    {
      label: "Total Favorites",
      value: formatNumber(totalFavorites),
      icon: Star,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      subLabel: "Saved by users",
    },
    {
      label: "Member Since",
      value: `${memberYears} year${memberYears !== 1 ? "s" : ""}`,
      icon: Calendar,
      color: "text-green-600",
      bgColor: "bg-green-50",
      subLabel: new Date(memberSince).getFullYear().toString(),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Rating Card - Prominent */}
      {ratingStats && ratingStats.totalRatings > 0 && (
        <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-2">
                  Seller Rating
                </p>
                <div className="flex items-center gap-3">
                  <RatingDisplay stats={ratingStats} size="lg" />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Based on {ratingStats.totalRatings}{" "}
                  {ratingStats.totalRatings === 1 ? "review" : "reviews"}
                </p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-yellow-600">
                  {ratingStats.averageRating.toFixed(1)}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        star <= Math.round(ratingStats.averageRating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card
              key={index}
              className="hover:shadow-md transition-shadow duration-200"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600 mb-1">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mb-1">
                      {stat.value}
                    </p>
                    {stat.subLabel && (
                      <p className="text-xs text-gray-500">{stat.subLabel}</p>
                    )}
                  </div>
                  <div
                    className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}


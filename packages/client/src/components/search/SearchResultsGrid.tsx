import React from "react";
import { Car } from "lucide-react";
import { Card, CardContent } from "../ui/Card";
import { CarCard } from "../CarCard";
import type { ListingDetail } from "../../types";

interface SearchResultsGridProps {
  listings: ListingDetail[];
  loading: boolean;
  user?: any;
  onFavoriteChange: (listingId: string, isFavorite: boolean) => void;
}

export const SearchResultsGrid = React.memo(function SearchResultsGrid({
  listings,
  loading,
  user,
  onFavoriteChange,
}: SearchResultsGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-48 bg-gray-200 rounded-t-lg"></div>
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-6 bg-gray-200 rounded mb-4"></div>
              <div className="flex justify-between">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="text-center py-12">
        <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No cars found
        </h3>
        <p className="text-gray-500">
          Try adjusting your search criteria
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {listings.map((listing, index) => (
        <div
          key={`${listing.id}-${user?.id || "anonymous"}`}
          className="car-card-fade-in-up"
          style={{ animationDelay: `${index * 0.1}s` }}
        >
          <CarCard
            listing={listing}
            onFavoriteChange={onFavoriteChange}
          />
        </div>
      ))}
    </div>
  );
});

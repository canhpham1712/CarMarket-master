import React from "react";
import { ListingMap } from "../ListingMap";
import type { ListingDetail } from "../../types";

interface SearchResultsMapProps {
  listings: ListingDetail[];
  loading: boolean;
  onMarkerClick: (listing: ListingDetail) => void;
}

export const SearchResultsMap = React.memo(function SearchResultsMap({
  listings,
  loading,
  onMarkerClick,
}: SearchResultsMapProps) {
  return (
    <div
      className="w-full rounded-lg overflow-hidden border border-gray-200 shadow-lg mb-6"
      style={{ height: "600px", minHeight: "600px" }}
    >
      {loading ? (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600">
              Loading all listings on the map...
            </p>
          </div>
        </div>
      ) : (
        <ListingMap
          listings={listings}
          onMarkerClick={onMarkerClick}
        />
      )}
    </div>
  );
});

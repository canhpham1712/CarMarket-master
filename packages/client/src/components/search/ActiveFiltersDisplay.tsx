import React from "react";
import { X } from "lucide-react";
import type { SearchFilters } from "../../types";

const DEFAULT_MAX_PRICE = 1000000000000;

interface ActiveFiltersDisplayProps {
  searchQuery: string;
  appliedFilters: SearchFilters;
  onRemoveSearchQuery: () => void;
  onRemoveFilter: (key: keyof SearchFilters) => void;
  onClearFilters: () => void;
}

export const ActiveFiltersDisplay = React.memo(function ActiveFiltersDisplay({
  searchQuery,
  appliedFilters,
  onRemoveSearchQuery,
  onRemoveFilter,
  onClearFilters,
}: ActiveFiltersDisplayProps) {
  const hasActiveFilters =
    searchQuery.trim() ||
    appliedFilters.make ||
    appliedFilters.model ||
    (appliedFilters.priceMin && appliedFilters.priceMin > 0) ||
    (appliedFilters.priceMax && appliedFilters.priceMax < DEFAULT_MAX_PRICE) ||
    appliedFilters.yearMin ||
    appliedFilters.yearMax ||
    appliedFilters.mileageMax ||
    appliedFilters.fuelType ||
    appliedFilters.bodyType ||
    appliedFilters.transmission ||
    appliedFilters.condition ||
    appliedFilters.location;

  if (!hasActiveFilters) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {searchQuery.trim() && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
          Search: "{searchQuery}"
          <button
            onClick={onRemoveSearchQuery}
            className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
            aria-label="Remove search"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      )}
      {appliedFilters.make && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
          Make: {appliedFilters.make}
          <button
            onClick={() => onRemoveFilter("make")}
            className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      )}
      {appliedFilters.model && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
          Model: {appliedFilters.model}
          <button
            onClick={() => onRemoveFilter("model")}
            className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      )}
      {(appliedFilters.priceMin && appliedFilters.priceMin > 0) ||
      (appliedFilters.priceMax &&
        appliedFilters.priceMax < DEFAULT_MAX_PRICE) ? (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
          Price: ${((appliedFilters.priceMin || 0) / 1000).toFixed(0)}
          k - $
          {(
            (appliedFilters.priceMax || DEFAULT_MAX_PRICE) / 1000
          ).toFixed(0)}
          k
          <button
            onClick={() => {
              onRemoveFilter("priceMin");
              onRemoveFilter("priceMax");
            }}
            className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ) : null}
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium border border-gray-300 hover:bg-gray-200 transition-colors"
        >
          <X className="h-3 w-3" />
          Clear All
        </button>
      )}
    </div>
  );
});

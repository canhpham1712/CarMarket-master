import React from "react";
import { List, Map } from "lucide-react";
import { Button } from "../ui/Button";
import { EnhancedSelect } from "../ui/EnhancedSelect";
import { cn } from "../../lib/utils";

interface SortOption {
  value: string;
  label: string;
  sortBy: string;
  sortOrder: "ASC" | "DESC";
}

interface SearchResultsHeaderProps {
  loading: boolean;
  total: number;
  searchQuery: string;
  sortOptions: SortOption[];
  currentSort: string;
  onSortChange: (value: string) => void;
  viewMode: "list" | "map";
  onViewModeChange: (mode: "list" | "map") => void;
  hasActiveFilters: boolean;
}

export const SearchResultsHeader = React.memo(function SearchResultsHeader({
  loading,
  total,
  searchQuery,
  sortOptions,
  currentSort,
  onSortChange,
  viewMode,
  onViewModeChange,
  hasActiveFilters,
}: SearchResultsHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {loading
            ? "Searching..."
            : `${total.toLocaleString()} results`}
        </h2>
        {hasActiveFilters && (
          <p className="text-sm text-gray-600 mt-1">
            {searchQuery && `Search: "${searchQuery}"`}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <EnhancedSelect
          options={sortOptions.map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
          value={currentSort}
          onValueChange={(value) => onSortChange(value as string)}
          placeholder="Sort by"
          searchable={false}
          multiple={false}
        />
        <div className="flex items-center gap-1 border rounded-md">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewModeChange("list")}
            className={cn(
              "rounded-r-none border-r-0",
              viewMode === "list" &&
                "bg-black text-white hover:bg-black/90"
            )}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewModeChange("map")}
            className={cn(
              "rounded-l-none",
              viewMode === "map" &&
                "bg-black text-white hover:bg-black/90"
            )}
          >
            <Map className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});

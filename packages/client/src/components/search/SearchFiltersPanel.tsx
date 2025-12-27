import React from "react";
import { Card, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { EnhancedSelect } from "../ui/EnhancedSelect";
import { X } from "lucide-react";

interface SearchFiltersPanelProps {
  metadata?: any;
  metadataLoading?: boolean;
  metadataError?: string;
  availableModels: any[];
  selectedMakeId: string;
  appliedFilters: any;
  priceMinInput: string;
  priceMaxInput: string;
  mileageMaxInput: string;
  locationInput: string;
  setSelectedMakeId: (value: string) => void;
  setAppliedFilters: (update: (prev: any) => any) => void;
  setPriceMinInput: (value: string) => void;
  setPriceMaxInput: (value: string) => void;
  setMileageMaxInput: (value: string) => void;
  setLocationInput: (value: string) => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  hasActiveFilters: () => boolean;
}

export const SearchFiltersPanel = React.memo(function SearchFiltersPanel({
  metadata,
  metadataLoading,
  metadataError,
  availableModels,
  selectedMakeId,
  appliedFilters,
  priceMinInput,
  priceMaxInput,
  mileageMaxInput,
  locationInput,
  setSelectedMakeId,
  setAppliedFilters,
  setPriceMinInput,
  setPriceMaxInput,
  setMileageMaxInput,
  setLocationInput,
  onApplyFilters,
  onClearFilters,
  hasActiveFilters,
}: SearchFiltersPanelProps) {
  return (
    <Card className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          <div className="flex items-center gap-2">
            <Button
              onClick={onApplyFilters}
              size="sm"
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg border-0"
            >
              Apply
            </Button>
            {hasActiveFilters() && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Make */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Make
            </label>
            <EnhancedSelect
              options={
                metadata?.makes?.map((make: any) => ({
                  value: make.id,
                  label: make.displayName || make.name,
                })) || []
              }
              value={selectedMakeId}
              onValueChange={(value) => {
                setSelectedMakeId(value as string);
              }}
              placeholder={
                metadataLoading
                  ? "Loading makes..."
                  : metadata?.makes?.length === 0
                    ? "No makes available"
                    : "Select a make"
              }
              searchable={true}
              multiple={false}
              maxHeight="360px"
            />
            {metadataError && (
              <p className="mt-1 text-xs text-red-600">{metadataError}</p>
            )}
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model
            </label>
            <EnhancedSelect
              value={
                availableModels.find((m: any) => m.name === appliedFilters.model)
                  ?.id || ""
              }
              options={
                availableModels && availableModels.length > 0
                  ? availableModels.map((model: any) => ({
                      value: model.id,
                      label: model.displayName || model.name,
                    }))
                  : []
              }
              onValueChange={(value) => {
                const selectedModel = availableModels.find(
                  (model: any) => model.id === value
                );
                if (selectedModel) {
                  setAppliedFilters((prev: any) => ({
                    ...prev,
                    model: selectedModel.name,
                  }));
                }
              }}
              placeholder={
                selectedMakeId && availableModels.length === 0
                  ? "Loading models..."
                  : selectedMakeId
                    ? "Select a model"
                    : "Select make first"
              }
              searchable={true}
              multiple={false}
            />
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price Range ($)
            </label>
            <div className="flex space-x-2">
              <Input
                id="price-min-input"
                type="number"
                placeholder="Min"
                value={priceMinInput}
                onChange={(e) => setPriceMinInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onApplyFilters();
                  }
                }}
              />
              <Input
                id="price-max-input"
                type="number"
                placeholder="Max"
                value={priceMaxInput}
                onChange={(e) => setPriceMaxInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onApplyFilters();
                  }
                }}
              />
            </div>
          </div>

          {/* Year Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year Range
            </label>
            <div className="flex space-x-2">
              <EnhancedSelect
                className="w-full"
                options={[
                  { value: "", label: "From" },
                  ...Array.from(
                    { length: new Date().getFullYear() - 1989 },
                    (_, i) => ({
                      value: String(new Date().getFullYear() - i),
                      label: String(new Date().getFullYear() - i),
                    })
                  ),
                ]}
                value={appliedFilters.yearMin ? String(appliedFilters.yearMin) : ""}
                onValueChange={(value) => {
                  setAppliedFilters((prev: any) => {
                    const { yearMin, ...rest } = prev;
                    return value ? { ...rest, yearMin: Number(value) } : rest;
                  });
                }}
                placeholder="From"
                searchable={true}
                multiple={false}
              />
              <EnhancedSelect
                className="w-full"
                options={[
                  { value: "", label: "To" },
                  ...Array.from(
                    { length: new Date().getFullYear() - 1989 },
                    (_, i) => ({
                      value: String(new Date().getFullYear() - i),
                      label: String(new Date().getFullYear() - i),
                    })
                  ),
                ]}
                value={appliedFilters.yearMax ? String(appliedFilters.yearMax) : ""}
                onValueChange={(value) => {
                  setAppliedFilters((prev: any) => {
                    const { yearMax, ...rest } = prev;
                    return value ? { ...rest, yearMax: Number(value) } : rest;
                  });
                }}
                placeholder="To"
                searchable={true}
                multiple={false}
              />
            </div>
          </div>

          {/* Mileage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Mileage (miles)
            </label>
            <Input
              id="mileage-max-input"
              type="number"
              placeholder="e.g., 50000"
              value={mileageMaxInput}
              onChange={(e) => setMileageMaxInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onApplyFilters();
                }
              }}
            />
          </div>

          {/* Fuel Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fuel Type
            </label>
            <EnhancedSelect
              options={[
                { value: "", label: "Any Fuel" },
                ...(metadata?.fuelTypes?.map((type: any) => ({
                  value: type.value,
                  label: type.displayValue,
                })) || []),
              ]}
              value={appliedFilters.fuelType || ""}
              onValueChange={(value) => {
                setAppliedFilters((prev: any) => {
                  const { fuelType, ...rest } = prev;
                  return value ? { ...rest, fuelType: value as string } : rest;
                });
              }}
              placeholder="Any Fuel"
              searchable={true}
              multiple={false}
            />
          </div>

          {/* Body Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Body Type
            </label>
            <EnhancedSelect
              options={[
                { value: "", label: "Any Body Type" },
                ...(metadata?.bodyTypes?.map((type: any) => ({
                  value: type.value,
                  label: type.displayValue,
                })) || []),
              ]}
              value={appliedFilters.bodyType || ""}
              onValueChange={(value) => {
                setAppliedFilters((prev: any) => {
                  const { bodyType, ...rest } = prev;
                  return value ? { ...rest, bodyType: value as string } : rest;
                });
              }}
              placeholder="Any Body Type"
              searchable={true}
              multiple={false}
            />
          </div>

          {/* Transmission */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transmission
            </label>
            <EnhancedSelect
              options={[
                { value: "", label: "Any Transmission" },
                ...(metadata?.transmissionTypes?.map((type: any) => ({
                  value: type.value,
                  label: type.displayValue,
                })) || []),
              ]}
              value={appliedFilters.transmission || ""}
              onValueChange={(value) => {
                setAppliedFilters((prev: any) => {
                  const { transmission, ...rest } = prev;
                  return value
                    ? { ...rest, transmission: value as string }
                    : rest;
                });
              }}
              placeholder="Any Transmission"
              searchable={true}
              multiple={false}
            />
          </div>

          {/* Condition */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condition
            </label>
            <EnhancedSelect
              options={[
                { value: "", label: "Any Condition" },
                ...(metadata?.conditions?.map((type: any) => ({
                  value: type.value,
                  label: type.displayValue,
                })) || []),
              ]}
              value={appliedFilters.condition || ""}
              onValueChange={(value) => {
                setAppliedFilters((prev: any) => {
                  const { condition, ...rest } = prev;
                  return value ? { ...rest, condition: value as string } : rest;
                });
              }}
              placeholder="Any Condition"
              searchable={false}
              multiple={false}
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <Input
              id="location-input"
              type="text"
              placeholder="City or State"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onApplyFilters();
                }
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

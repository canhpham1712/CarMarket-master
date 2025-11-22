import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Filter,
  Car,
  X,
  ChevronLeft,
  ChevronRight,
  Truck,
  Zap,
  Leaf,
  Wrench,
  Mountain,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";
import { EnhancedSelect } from "../components/ui/EnhancedSelect";
import { DualRangeSlider } from "../components/ui/DualRangeSlider";
import { CarCard } from "../components/CarCard";
import { useAuthStore } from "../store/auth";
import type { ListingDetail, SearchFilters } from "../types";
import { ListingService } from "../services/listing.service";
import { useMetadata } from "../services/metadata.service";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";

export function HomePage() {
  const { user } = useAuthStore();
  const location = useLocation();
  const [listings, setListings] = useState<ListingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(""); // Temporary search query
  const [appliedSearchQuery, setAppliedSearchQuery] = useState(""); // Applied search query
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    priceMin: 0,
    priceMax: 100000000,
  }); // Temporary filters (being edited)
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>({}); // Applied filters
  const { metadata, loading: metadataLoading, error: metadataError } = useMetadata();
  const [selectedMakeId, setSelectedMakeId] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<any[]>([]);

  // Pagination state
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });

  // Store total available cars (unfiltered count)
  const [totalCarsAvailable, setTotalCarsAvailable] = useState<number | null>(
    null
  );

  // Store pending match count (from current filters before applying)
  const [pendingMatchCount, setPendingMatchCount] = useState<number | null>(
    null
  );

  const sortOptions = [
    {
      value: "newest",
      label: "Newest First",
      sortBy: "createdAt",
      sortOrder: "DESC" as const,
    },
    {
      value: "oldest",
      label: "Oldest First",
      sortBy: "createdAt",
      sortOrder: "ASC" as const,
    },
    {
      value: "price-low",
      label: "Price: Low to High",
      sortBy: "price",
      sortOrder: "ASC" as const,
    },
    {
      value: "price-high",
      label: "Price: High to Low",
      sortBy: "price",
      sortOrder: "DESC" as const,
    },
    {
      value: "year-new",
      label: "Year: Newest First",
      sortBy: "year",
      sortOrder: "DESC" as const,
    },
    {
      value: "year-old",
      label: "Year: Oldest First",
      sortBy: "year",
      sortOrder: "ASC" as const,
    },
    {
      value: "mileage-low",
      label: "Mileage: Low to High",
      sortBy: "mileage",
      sortOrder: "ASC" as const,
    },
    {
      value: "mileage-high",
      label: "Mileage: High to Low",
      sortBy: "mileage",
      sortOrder: "DESC" as const,
    },
  ];

  // Show welcome message for OAuth users (only once)
  useEffect(() => {
    if (user && user.provider && user.provider !== "local") {
      // Check if this is a fresh OAuth login by checking if we just navigated from callback
      const fromCallback = location.state?.fromCallback;
      if (fromCallback) {
        // Use a ref to prevent duplicate toasts
        const hasShownToast = sessionStorage.getItem('oauth_welcome_shown');
        if (!hasShownToast) {
          toast.success(
            `🎉 Welcome ${user.firstName}! You're successfully logged in with ${user.provider}.`
          );
          sessionStorage.setItem('oauth_welcome_shown', 'true');
          // Clear after 5 seconds to allow showing again if needed
          setTimeout(() => {
            sessionStorage.removeItem('oauth_welcome_shown');
          }, 5000);
        }
      }
    }
  }, [user, location.state]);

  // Models are now loaded via selectedMakeId in the unified useEffect below

  const fetchListings = useCallback(
    async (currentFilters: SearchFilters = {}) => {
      try {
        setLoading(true);

        // Determine current sort option
        const defaultSort = { sortBy: "createdAt", sortOrder: "DESC" as const };
        const currentSort =
          currentFilters.sortBy && currentFilters.sortOrder
            ? {
                sortBy: currentFilters.sortBy,
                sortOrder: currentFilters.sortOrder,
              }
            : defaultSort;

        const searchFilters: SearchFilters = {
          ...currentFilters,
          page: pagination.page,
          limit: pagination.limit,
          sortBy: currentSort.sortBy,
          sortOrder: currentSort.sortOrder,
        };

        // If there are active filters or search query, use search endpoint
        const hasActiveFilters =
          searchFilters.query ||
          searchFilters.make ||
          searchFilters.model ||
          searchFilters.yearMin ||
          searchFilters.yearMax ||
          searchFilters.priceMin ||
          searchFilters.priceMax ||
          searchFilters.mileageMax ||
          searchFilters.fuelType ||
          searchFilters.transmission ||
          searchFilters.bodyType ||
          searchFilters.condition ||
          searchFilters.location;

        let response;
        if (hasActiveFilters) {
          response = await ListingService.searchListings(searchFilters);
        } else {
          // Use regular listings endpoint for default view
          response = (await ListingService.getListings(
            pagination.page,
            pagination.limit
          )) as {
            listings: ListingDetail[];
            pagination: {
              page: number;
              limit: number;
              total: number;
              totalPages: number;
            };
          };
        }

        setListings(response.listings || []);
        setPagination(
          response.pagination || {
            page: 1,
            limit: 12,
            total: 0,
            totalPages: 0,
          }
        );

        // Store the total available cars when no filters are applied
        if (!hasActiveFilters && response.pagination) {
          setTotalCarsAvailable(response.pagination.total);
        }
      } catch (error) {
        console.error("Failed to fetch listings:", error);
        toast.error("Failed to load listings. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [pagination.page, pagination.limit]
  );

  // (debug logs removed)

  // Load initial listings on mount or when pagination changes
  useEffect(() => {
    // Only fetch if filters have been applied (not on initial mount with empty filters)
    const shouldFetch = hasActiveFilters();

    if (shouldFetch) {
      // Build current filters from applied filters
      const currentFilters: SearchFilters = {
        ...appliedFilters,
        ...(appliedSearchQuery.trim() && { query: appliedSearchQuery }),
      };
      fetchListings(currentFilters);
    } else {
      // Load initial listings when no filters are applied
      const loadInitialListings = async () => {
        try {
          setLoading(true);
          const response = (await ListingService.getListings(
            pagination.page,
            pagination.limit
          )) as {
            listings: ListingDetail[];
            pagination: {
              page: number;
              limit: number;
              total: number;
              totalPages: number;
            };
          };
          setListings(response.listings || []);
          setPagination(
            response.pagination || {
              page: 1,
              limit: 12,
              total: 0,
              totalPages: 0,
            }
          );
          if (response.pagination) {
            setTotalCarsAvailable(response.pagination.total);
          }
        } catch (error) {
          console.error("Failed to fetch initial listings:", error);
          toast.error("Failed to load listings. Please try again.");
        } finally {
          setLoading(false);
        }
      };
      loadInitialListings();
    }

    // Refresh favorite states when user comes back to the page
    const handleFocus = () => {
      // Force re-render of CarCard components to refresh favorite states
      setListings((prev) => [...prev]);
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [
    pagination.page,
    pagination.limit,
    appliedFilters,
    appliedSearchQuery,
    fetchListings,
  ]);

  // Load models when make is selected - unified logic for both filter panels
  useEffect(() => {
    const loadModels = async () => {
      if (selectedMakeId && metadata?.makes) {
        const selectedMake = metadata.makes.find(
          (make) => make.id === selectedMakeId
        );
        if (selectedMake) {
          setFilters((prev) => ({
            ...prev,
            make: selectedMake.name,
          }));

          try {
            // Fetch models for the selected make
            const API_BASE_URL =
              import.meta.env.VITE_API_URL || "http://localhost:3000/api";
            const response = await fetch(
              `${API_BASE_URL}/metadata/makes/${selectedMakeId}/models`
            );
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const models = await response.json();
            setAvailableModels(models || []);
          } catch (error) {
            console.error("Failed to fetch models:", error);
            setAvailableModels([]);
          }
        }
      } else {
        setAvailableModels([]);
        // Clear make and model when no make is selected
        setFilters((prev) => ({
          ...prev,
          make: "",
          model: "",
        }));
      }
    };

    loadModels();
  }, [selectedMakeId, metadata]);

  // Fetch count when filters change (debounced)
  useEffect(() => {
    const fetchCount = async () => {
      // Build current filters from temporary filters
      const currentFilters: SearchFilters = {
        ...filters,
        ...(searchQuery.trim() && { query: searchQuery }),
      };

      // Check if there are any active filters
      const hasFilters =
        currentFilters.query ||
        currentFilters.make ||
        currentFilters.model ||
        currentFilters.yearMin ||
        currentFilters.yearMax ||
        (currentFilters.priceMin && currentFilters.priceMin > 0) ||
        (currentFilters.priceMax && currentFilters.priceMax < 100000000) ||
        currentFilters.mileageMax ||
        currentFilters.fuelType ||
        currentFilters.transmission ||
        currentFilters.bodyType ||
        currentFilters.condition ||
        currentFilters.location;

      if (!hasFilters) {
        // No filters, use totalCarsAvailable
        setPendingMatchCount(null);
        return;
      }

      try {
        // Fetch with limit=1 to get total count efficiently
        const response = await ListingService.searchListings({
          ...currentFilters,
          page: 1,
          limit: 1,
        });
        setPendingMatchCount(response.pagination?.total || 0);
      } catch (error) {
        console.error("Failed to fetch count:", error);
        setPendingMatchCount(null);
      }
    };

    // Debounce: wait 500ms after user stops changing filters
    const timeoutId = setTimeout(() => {
      fetchCount();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filters, searchQuery]);

  const handleSearch = () => {
    // Apply temporary filters and search query
    setAppliedFilters({
      ...filters,
    });
    setAppliedSearchQuery(searchQuery.trim());
    // Clear pending count since we're applying filters now
    setPendingMatchCount(null);

    // Reset to first page when applying new filters
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));

    // The useEffect will trigger fetchListings with updated appliedFilters
  };

  // Helper function to check if there are active filters
  const hasActiveFilters = () => {
    return (
      appliedSearchQuery.trim() ||
      appliedFilters.make ||
      appliedFilters.model ||
      appliedFilters.yearMin ||
      appliedFilters.yearMax ||
      appliedFilters.priceMin ||
      appliedFilters.priceMax ||
      appliedFilters.mileageMax ||
      appliedFilters.fuelType ||
      appliedFilters.transmission ||
      appliedFilters.bodyType ||
      appliedFilters.condition ||
      appliedFilters.location
    );
  };

  const clearFilters = () => {
    setFilters({
      priceMin: 0,
      priceMax: 100000000,
    });
    setAppliedFilters({});
    setSearchQuery("");
    setAppliedSearchQuery("");
    setPendingMatchCount(null);
    setShowFilters(false);
    setSelectedMakeId("");
    setAvailableModels([]);
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
  };

  const handlePageChange = (newPage: number) => {
    setPagination((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination((prev) => ({
      ...prev,
      limit: newLimit,
      page: 1, // Reset to first page when changing limit
    }));
  };

  const handleSortChange = (sortValue: string) => {
    const sortOption = sortOptions.find((opt) => opt.value === sortValue);
    if (sortOption) {
      // Sort is applied immediately
      setAppliedFilters((prev) => ({
        ...prev,
        sortBy: sortOption.sortBy,
        sortOrder: sortOption.sortOrder,
      }));
      setPagination((prev) => ({
        ...prev,
        page: 1, // Reset to first page when sorting changes
      }));
    }
  };

  const getCurrentSortValue = () => {
    const currentSort = sortOptions.find(
      (opt) =>
        opt.sortBy === appliedFilters.sortBy &&
        opt.sortOrder === appliedFilters.sortOrder
    );
    return currentSort?.value || "newest";
  };

  // Handle style selection (body type or fuel type)
  const handleStyleSelect = (type: "bodyType" | "fuelType", value: string) => {
    setFilters((prev) => ({
      ...prev,
      [type]: value,
    }));
    // Apply filters immediately
    setAppliedFilters((prev) => ({
      ...prev,
      [type]: value,
    }));
    setPagination((prev) => ({
      ...prev,
      page: 1,
    }));
    // Scroll to top of car listings
    const listingsSection = document.getElementById("featured-cars-section");
    if (listingsSection) {
      listingsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              Find Your Perfect Car
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100">
              Browse thousands of quality used cars from trusted sellers
            </p>

            {/* Search Bar with Simplified Filters */}
            <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg p-8 text-black">
              {/* Main Search Bar */}
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="Search by make, model, or keyword..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 text-lg text-gray-900 bg-gray-50 border-gray-300"
                  />
                </div>
              </div>

              {/* Simplified Filter Section - Only 4 filters as requested */}
              <div className="space-y-4">
                {/* Row 1: Make and Model */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Make Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Make
                    </label>
                    <EnhancedSelect
                      options={
                        metadata?.makes?.map((make) => ({
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
                      <p className="mt-1 text-xs text-red-600">
                        {metadataError}
                      </p>
                    )}
                  </div>

                  {/* Model Filter - Synchronized with advanced filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model
                    </label>
                    <EnhancedSelect
                      value={
                        availableModels.find((m) => m.name === filters.model)
                          ?.id || ""
                      }
                      options={
                        availableModels && availableModels.length > 0
                          ? availableModels.map((model) => ({
                              value: model.id,
                              label: model.displayName || model.name,
                            }))
                          : []
                      }
                      onValueChange={(value) => {
                        const selectedModel = availableModels.find(
                          (model) => model.id === value
                        );
                        if (selectedModel) {
                          setFilters((prev) => ({
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
                </div>

                {/* Row 2: Max Mileage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Mileage (miles)
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g., 50000"
                    value={filters.mileageMax || ""}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        mileageMax: e.target.value ? Number(e.target.value) : 0,
                      }))
                    }
                  />
                </div>

                {/* Row 3: Price Range Dual Slider */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Price Range: ${(filters.priceMin || 0).toLocaleString()} - $
                    {(filters.priceMax || 100000000).toLocaleString()}
                  </label>
                  <DualRangeSlider
                    min={0}
                    max={100000000}
                    step={1000}
                    valueMin={filters.priceMin || 0}
                    valueMax={filters.priceMax || 100000000}
                    onChangeMin={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        priceMin: value,
                      }))
                    }
                    onChangeMax={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        priceMax: value,
                      }))
                    }
                    formatValue={(v) => `$${v.toLocaleString()}`}
                  />
                </div>
              </div>
              {/* Show Results Button */}
              <div className="mt-8 text-center">
                <Button
                  size="lg"
                  className="h-12 px-12 bg-blue-600 hover:bg-blue-700 text-white text-lg"
                  onClick={handleSearch}
                  disabled={loading}
                >
                  {loading ? (
                    "Loading..."
                  ) : (
                    <>
                      Show{" "}
                      {pendingMatchCount !== null
                        ? `${pendingMatchCount.toLocaleString()}`
                        : hasActiveFilters() && pagination.total > 0
                          ? `${pagination.total.toLocaleString()}`
                          : totalCarsAvailable
                            ? `${totalCarsAvailable.toLocaleString()}+`
                            : "10,000+"}{" "}
                      matches
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Cars */}
      <section id="featured-cars-section" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">Featured Cars</h2>
            <div className="flex space-x-2">
              {hasActiveFilters() && (
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
              <div className="relative">
                <EnhancedSelect
                  options={sortOptions.map((opt) => ({
                    value: opt.value,
                    label: opt.label,
                  }))}
                  value={getCurrentSortValue()}
                  onValueChange={(value) => handleSortChange(value as string)}
                  placeholder="Sort by"
                  searchable={false}
                  multiple={false}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && metadata && (
            <Card className="mb-8">
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {/* Make */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Make
                    </label>
                    <EnhancedSelect
                      options={
                        metadata.makes?.map((make) => ({
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
                  </div>

                  {/* Model - Synchronized with main search */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model
                    </label>
                    <EnhancedSelect
                      value={
                        availableModels.find((m) => m.name === filters.model)
                          ?.id || ""
                      }
                      options={
                        availableModels && availableModels.length > 0
                          ? availableModels.map((model) => ({
                              value: model.id,
                              label: model.displayName || model.name,
                            }))
                          : []
                      }
                      onValueChange={(value) => {
                        const selectedModel = availableModels.find(
                          (model) => model.id === value
                        );
                        if (selectedModel) {
                          setFilters((prev) => ({
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Price Range ($)
                    </label>
                    <div className="flex space-x-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filters.priceMin || ""}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            priceMin: e.target.value ? Number(e.target.value) : 0,
                          })
                        }
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filters.priceMax || ""}
                        onChange={(e) =>
                          setFilters({
                            ...filters,
                            priceMax: e.target.value ? Number(e.target.value) : 0,
                          })
                        }
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
                        value={filters.yearMin ? String(filters.yearMin) : ""}
                        onValueChange={(value) =>
                          setFilters({
                            ...filters,
                            yearMin: value ? Number(value) : 0,
                          })
                        }
                        placeholder="From"
                        searchable={true}
                        multiple={false}
                      />
                      <EnhancedSelect
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
                        value={filters.yearMax ? String(filters.yearMax) : ""}
                        onValueChange={(value) =>
                          setFilters({
                            ...filters,
                            yearMax: value ? Number(value) : 0,
                          })
                        }
                        placeholder="To"
                        searchable={true}
                        multiple={false}
                      />
                    </div>
                  </div>

                  {/* Mileage */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Mileage (miles)
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g., 50000"
                      value={filters.mileageMax || ""}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          mileageMax: e.target.value ? Number(e.target.value) : 0,
                        })
                      }
                    />
                  </div>

                  {/* Fuel Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fuel Type
                    </label>
                    <EnhancedSelect
                      options={[
                        { value: "", label: "Any Fuel" },
                        ...(metadata.fuelTypes?.map((type) => ({
                          value: type.value,
                          label: type.displayValue,
                        })) || []),
                      ]}
                      value={filters.fuelType || ""}
                      onValueChange={(value) =>
                        setFilters({
                          ...filters,
                          fuelType: (value as string) || "",
                        })
                      }
                      placeholder="Any Fuel"
                      searchable={true}
                      multiple={false}
                    />
                  </div>

                  {/* Body Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Body Type
                    </label>
                    <EnhancedSelect
                      options={[
                        { value: "", label: "Any Body Type" },
                        ...(metadata.bodyTypes?.map((type) => ({
                          value: type.value,
                          label: type.displayValue,
                        })) || []),
                      ]}
                      value={filters.bodyType || ""}
                      onValueChange={(value) =>
                        setFilters({
                          ...filters,
                          bodyType: (value as string) || "",
                        })
                      }
                      placeholder="Any Body Type"
                      searchable={true}
                      multiple={false}
                    />
                  </div>

                  {/* Transmission */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transmission
                    </label>
                    <EnhancedSelect
                      options={[
                        { value: "", label: "Any Transmission" },
                        ...(metadata.transmissionTypes?.map((type) => ({
                          value: type.value,
                          label: type.displayValue,
                        })) || []),
                      ]}
                      value={filters.transmission || ""}
                      onValueChange={(value) =>
                        setFilters({
                          ...filters,
                          transmission: (value as string) || "",
                        })
                      }
                      placeholder="Any Transmission"
                      searchable={true}
                      multiple={false}
                    />
                  </div>

                  {/* Condition */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Condition
                    </label>
                    <EnhancedSelect
                      options={[
                        { value: "", label: "Any Condition" },
                        ...(metadata.conditions?.map((type) => ({
                          value: type.value,
                          label: type.displayValue,
                        })) || []),
                      ]}
                      value={filters.condition || ""}
                      onValueChange={(value) =>
                        setFilters({
                          ...filters,
                          condition: (value as string) || "",
                        })
                      }
                      placeholder="Any Condition"
                      searchable={false}
                      multiple={false}
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <Input
                      type="text"
                      placeholder="City or State"
                      value={filters.location || ""}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          location: e.target.value || "",
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-between mt-6">
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={clearFilters}>
                      <X className="h-4 w-4 mr-2" />
                      Clear All
                    </Button>
                  </div>
                  <Button
                    onClick={handleSearch}
                    className="bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Search className="h-4 w-4 mr-2" />
                    Apply Filters (
                    {Object.keys(filters).filter(
                      (key) =>
                        key !== "priceMin" ||
                        filters[key as keyof SearchFilters] !== 0
                    ).length + (searchQuery.trim() ? 1 : 0)}{" "}
                    active)
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <CarCard
                  key={`${listing.id}-${user?.id || "anonymous"}`}
                  listing={listing}
                />
              ))}
            </div>
          )}

          {!loading && listings.length === 0 && (
            <div className="text-center py-12">
              <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No cars found
              </h3>
              <p className="text-gray-500">
                Try adjusting your search criteria
              </p>
            </div>
          )}

          {/* Pagination */}
          {!loading && listings.length > 0 && (
            <div className="flex items-center justify-between mt-8">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Show</span>
                <select
                  value={pagination.limit}
                  onChange={(e) => handleLimitChange(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value={6}>6</option>
                  <option value={12}>12</option>
                  <option value={24}>24</option>
                  <option value={48}>48</option>
                </select>
                <span className="text-sm text-gray-700">per page</span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}{" "}
                  of {pagination.total} results
                </span>
              </div>

              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>

                <div className="flex items-center space-x-1">
                  {Array.from(
                    { length: Math.min(5, pagination.totalPages) },
                    (_, i) => {
                      let pageNum;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }

                      return (
                        <Button
                          key={pageNum}
                          variant={
                            pagination.page === pageNum ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => handlePageChange(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      );
                    }
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="flex items-center gap-1"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Shop Vehicles by Style */}
      {metadata && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              Shop Vehicles by Style
            </h2>

            {/* Body Types */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
              {[
                { value: "sedan", label: "Sedans", icon: Car },
                { value: "pickup", label: "Trucks", icon: Truck },
                { value: "suv", label: "SUV/Crossovers", icon: Car },
                { value: "coupe", label: "Coupes", icon: Car },
                { value: "hatchback", label: "Hatchbacks", icon: Car },
                { value: "minivan", label: "Van/Minivans", icon: Car },
                { value: "convertible", label: "Convertibles", icon: Car },
                { value: "wagon", label: "Wagons", icon: Car },
              ].map(({ value, label, icon: Icon }) => {
                const isActive = appliedFilters.bodyType === value;
                return (
                  <button
                    key={value}
                    onClick={() => handleStyleSelect("bodyType", value)}
                    className={`flex flex-col items-center p-4 rounded-lg transition-all hover:shadow-md cursor-pointer ${
                      isActive
                        ? "bg-blue-50 border-2 border-blue-600"
                        : "bg-white border-2 border-transparent hover:border-gray-200"
                    }`}
                  >
                    {/* Vehicle Image Placeholder */}
                    <div className="w-24 h-16 mb-3 flex items-center justify-center bg-gray-50 rounded overflow-hidden">
                      <Icon
                        className={`w-20 h-16 object-contain ${
                          isActive ? "text-blue-600" : "text-gray-400"
                        }`}
                        strokeWidth={1.5}
                      />
                    </div>
                    <span
                      className={`text-sm font-medium text-center ${
                        isActive ? "text-blue-600" : "text-gray-900"
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Separator */}
            <div className="border-t border-gray-200 my-8"></div>

            {/* Fuel/Drivetrain Types */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  type: "fuelType" as const,
                  value: "hybrid",
                  label: "Hybrids",
                  icon: Leaf,
                },
                {
                  type: "fuelType" as const,
                  value: "electric",
                  label: "Electrics",
                  icon: Zap,
                },
                {
                  type: "bodyType" as const,
                  value: "suv",
                  label: "AWD/4WDs",
                  icon: Mountain,
                  // Note: AWD/4WD would need to be a feature filter, but we'll use SUV as proxy
                },
                {
                  type: "bodyType" as const,
                  value: "van",
                  label: "Commercial",
                  icon: Wrench,
                },
              ].map(({ type, value, label, icon: Icon }) => {
                const isActive =
                  (type === "bodyType" && appliedFilters.bodyType === value) ||
                  (type === "fuelType" && appliedFilters.fuelType === value);
                return (
                  <button
                    key={`${type}-${value}`}
                    onClick={() => handleStyleSelect(type, value)}
                    className={`flex flex-col items-center p-4 rounded-lg transition-all hover:shadow-md relative cursor-pointer ${
                      isActive
                        ? "bg-blue-50 border-2 border-blue-600"
                        : "bg-white border-2 border-transparent hover:border-gray-200"
                    }`}
                  >
                    {/* Vehicle with Icon */}
                    <div className="relative w-24 h-16 mb-3 flex items-center justify-center bg-gray-50 rounded overflow-hidden">
                      {/* Orange Icon Badge */}
                      <div className="absolute -top-1 -left-1 w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center z-10 shadow-sm">
                        <Icon
                          className="w-4 h-4 text-white"
                          strokeWidth={2.5}
                        />
                      </div>
                      {/* Vehicle Icon */}
                      <Car
                        className={`w-20 h-16 object-contain ${
                          isActive ? "text-blue-600" : "text-gray-400"
                        }`}
                        strokeWidth={1.5}
                      />
                    </div>
                    <span
                      className={`text-sm font-medium text-center ${
                        isActive ? "text-blue-600" : "text-gray-900"
                      }`}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Stats Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose CarMarket?
            </h2>
            <p className="text-lg text-gray-600">
              Trusted by thousands of buyers and sellers nationwide
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {totalCarsAvailable !== null ? (
                  totalCarsAvailable.toLocaleString()
                ) : (
                  <span className="text-gray-400">Loading...</span>
                )}
              </div>
              <div className="text-lg text-gray-600">Cars Available</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {totalCarsAvailable !== null ? (
                  (totalCarsAvailable * 5).toLocaleString() + "+"
                ) : (
                  <span className="text-gray-400">Loading...</span>
                )}
              </div>
              <div className="text-lg text-gray-600">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">99%</div>
              <div className="text-lg text-gray-600">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

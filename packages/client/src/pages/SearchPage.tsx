import { useState, useEffect, useCallback, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "../components/ui/Button";
import { EnhancedSelect } from "../components/ui/EnhancedSelect";
import { SearchFiltersPanel } from "../components/search/SearchFiltersPanel";
import { SearchBar } from "../components/search/SearchBar";
import { SearchResultsHeader } from "../components/search/SearchResultsHeader";
import { ActiveFiltersDisplay } from "../components/search/ActiveFiltersDisplay";
import { SearchResultsGrid } from "../components/search/SearchResultsGrid";
import { SearchResultsMap } from "../components/search/SearchResultsMap";
import { SearchPagination } from "../components/search/SearchPagination";
import { useAuthStore } from "../store/auth";
import type { ListingDetail, SearchFilters } from "../types";
import { ListingService } from "../services/listing.service";
import { useMetadata } from "../services/metadata.service";
import { useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { cn } from "../lib/utils";

const MAP_VIEW_FETCH_LIMIT = 500;
const DEFAULT_MAX_PRICE = 1000000000000;

export function SearchPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<ListingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>({
    priceMin: 0,
    priceMax: DEFAULT_MAX_PRICE,
  });
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const {
    metadata,
    loading: metadataLoading,
    error: metadataError,
  } = useMetadata();
  const [selectedMakeId, setSelectedMakeId] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<any[]>([]);

  // Local state for text inputs
  const [priceMinInput, setPriceMinInput] = useState<string>("");
  const [priceMaxInput, setPriceMaxInput] = useState<string>("");
  const [mileageMaxInput, setMileageMaxInput] = useState<string>("");
  const [locationInput, setLocationInput] = useState<string>("");

  const [viewMode, setViewMode] = useState<"list" | "map">(() => {
    const viewParam = searchParams.get("view");
    return viewParam === "map" || viewParam === "list" ? viewParam : "list";
  });
  const [mapListings, setMapListings] = useState<ListingDetail[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const mapFiltersSignatureRef = useRef<string>("");

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });

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

  // Tự động cuộn lên đầu trang mỗi khi số trang (page) thay đổi
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pagination.page]);
  
  // Set browser card meta tags
  useEffect(() => {
    const hasFilters = hasActiveFilters();
    const baseUrl = window.location.origin;
    const currentUrl = `${baseUrl}/search${window.location.search}`;
    const title = hasFilters
      ? `Search Cars - ${pagination.total > 0 ? pagination.total.toLocaleString() : ""} Results | CarMarket`
      : "Search Cars - Find Your Perfect Vehicle | CarMarket";
    const description = hasFilters
      ? `Browse ${pagination.total > 0 ? pagination.total.toLocaleString() : "thousands of"} quality used cars. Filter by make, model, price, year, and more.`
      : "Search thousands of quality used cars from trusted sellers. Filter by make, model, price, year, mileage, fuel type, and more. Find your perfect car today!";
    const imageUrl = `${baseUrl}/og-search-image.jpg`;

    // Update or create meta tags
    const updateMetaTag = (
      property: string,
      content: string,
      isProperty = true
    ) => {
      const selector = isProperty
        ? `meta[property="${property}"]`
        : `meta[name="${property}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement;
      if (!meta) {
        meta = document.createElement("meta");
        if (isProperty) {
          meta.setAttribute("property", property);
        } else {
          meta.setAttribute("name", property);
        }
        document.head.appendChild(meta);
      }
      meta.setAttribute("content", content);
    };

    // Update title
    document.title = title;

    // Basic meta tags
    updateMetaTag("description", description, false);
    updateMetaTag(
      "keywords",
      "used cars, car search, buy car, car marketplace, vehicle search, car listings",
      false
    );

    // Open Graph tags
    updateMetaTag("og:title", title);
    updateMetaTag("og:description", description);
    updateMetaTag("og:type", "website");
    updateMetaTag("og:url", currentUrl);
    updateMetaTag("og:image", imageUrl);
    updateMetaTag("og:site_name", "CarMarket");

    // Twitter Card tags
    updateMetaTag("twitter:card", "summary_large_image", false);
    updateMetaTag("twitter:title", title, false);
    updateMetaTag("twitter:description", description, false);
    updateMetaTag("twitter:image", imageUrl, false);

    // Cleanup function
    return () => {
      document.title = "CarMarket - Buy and Sell Cars";
    };
  }, [pagination.total, searchQuery, appliedFilters]);

  // Read initial filters from URL
  useEffect(() => {
    const query = searchParams.get("q") || "";
    const make = searchParams.get("make") || "";
    const model = searchParams.get("model") || "";
    const yearMin = searchParams.get("yearMin");
    const yearMax = searchParams.get("yearMax");
    const priceMin = searchParams.get("priceMin");
    const priceMax = searchParams.get("priceMax");
    const mileageMax = searchParams.get("mileageMax");
    const fuelType = searchParams.get("fuelType") || "";
    const transmission = searchParams.get("transmission") || "";
    const bodyType = searchParams.get("bodyType") || "";
    const condition = searchParams.get("condition") || "";
    const location = searchParams.get("location") || "";
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const sortBy = searchParams.get("sortBy") || "";
    const sortOrder = searchParams.get("sortOrder") || "";

    setSearchQuery(query);
    setAppliedFilters({
      make: make || undefined,
      model: model || undefined,
      yearMin: yearMin ? Number(yearMin) : undefined,
      yearMax: yearMax ? Number(yearMax) : undefined,
      priceMin: priceMin ? Number(priceMin) : 0,
      priceMax: priceMax ? Number(priceMax) : DEFAULT_MAX_PRICE,
      mileageMax: mileageMax ? Number(mileageMax) : undefined,
      fuelType: fuelType || undefined,
      transmission: transmission || undefined,
      bodyType: bodyType || undefined,
      condition: condition || undefined,
      location: location || undefined,
      sortBy: sortBy || undefined,
      sortOrder: (sortOrder as "ASC" | "DESC") || undefined,
    });

    // Sync local input states
    setPriceMinInput(priceMin && Number(priceMin) > 0 ? String(priceMin) : "");
    setPriceMaxInput(priceMax && Number(priceMax) < DEFAULT_MAX_PRICE ? String(priceMax) : "");
    setMileageMaxInput(mileageMax ? String(mileageMax) : "");
    setLocationInput(location || "");

    if (page) setPagination((prev) => ({ ...prev, page: Number(page) }));
    if (limit) setPagination((prev) => ({ ...prev, limit: Number(limit) }));

    // Set make/model if provided
    if (make && metadata?.makes) {
      const makeObj = metadata.makes.find((m) => m.name === make);
      if (makeObj) setSelectedMakeId(makeObj.id);
    }
  }, []); // Only run on mount

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();

    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    if (appliedFilters.make) params.set("make", appliedFilters.make);
    if (appliedFilters.model) params.set("model", appliedFilters.model);
    if (appliedFilters.yearMin)
      params.set("yearMin", String(appliedFilters.yearMin));
    if (appliedFilters.yearMax)
      params.set("yearMax", String(appliedFilters.yearMax));
    if (appliedFilters.priceMin && appliedFilters.priceMin > 0)
      params.set("priceMin", String(appliedFilters.priceMin));
    if (appliedFilters.priceMax && appliedFilters.priceMax < DEFAULT_MAX_PRICE)
      params.set("priceMax", String(appliedFilters.priceMax));
    if (appliedFilters.mileageMax)
      params.set("mileageMax", String(appliedFilters.mileageMax));
    if (appliedFilters.fuelType)
      params.set("fuelType", appliedFilters.fuelType);
    if (appliedFilters.transmission)
      params.set("transmission", appliedFilters.transmission);
    if (appliedFilters.bodyType)
      params.set("bodyType", appliedFilters.bodyType);
    if (appliedFilters.condition)
      params.set("condition", appliedFilters.condition);
    if (appliedFilters.location)
      params.set("location", appliedFilters.location);
    if (appliedFilters.sortBy) params.set("sortBy", appliedFilters.sortBy);
    if (appliedFilters.sortOrder)
      params.set("sortOrder", appliedFilters.sortOrder);
    if (pagination.page > 1) params.set("page", String(pagination.page));
    if (pagination.limit !== 12) params.set("limit", String(pagination.limit));
    if (viewMode === "map") params.set("view", "map");

    setSearchParams(params, { replace: true });
  }, [
    searchQuery,
    appliedFilters,
    pagination.page,
    pagination.limit,
    viewMode,
    setSearchParams,
  ]);

  const fetchListings = useCallback(
    async (currentFilters: SearchFilters = {}) => {
      try {
        setLoading(true);

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
      } catch (error) {
        console.error("Failed to fetch listings:", error);
        toast.error("Failed to load listings. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [pagination.page, pagination.limit]
  );

  const hasActiveFilters = useCallback(
    (filtersToCheck?: SearchFilters) => {
      const filters = filtersToCheck || appliedFilters;
      const queryValue =
        filtersToCheck && "query" in filtersToCheck
          ? (filtersToCheck.query || "").toString().trim()
          : searchQuery.trim();
      return Boolean(
        queryValue ||
        filters.make ||
        filters.model ||
        filters.yearMin ||
        filters.yearMax ||
        (filters.priceMin && filters.priceMin > 0) ||
        (filters.priceMax && filters.priceMax < DEFAULT_MAX_PRICE) ||
        filters.mileageMax ||
        filters.fuelType ||
        filters.transmission ||
        filters.bodyType ||
        filters.condition ||
        filters.location
      );
    },
    [appliedFilters, searchQuery]
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const currentFilters: SearchFilters = {
        ...appliedFilters,
        ...(searchQuery.trim() && { query: searchQuery }),
      };

      const hasFilters = hasActiveFilters(currentFilters);

      if (hasFilters) {
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, appliedFilters.make, appliedFilters.model]);

  useEffect(() => {
    const currentFilters: SearchFilters = {
      ...appliedFilters,
      ...(searchQuery.trim() && { query: searchQuery }),
    };

    const shouldFetch = hasActiveFilters(currentFilters);

    if (shouldFetch) {
      fetchListings(currentFilters);
    } else {
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
        } catch (error) {
          console.error("Failed to fetch initial listings:", error);
          toast.error("Failed to load listings. Please try again.");
        } finally {
          setLoading(false);
        }
      };
      loadInitialListings();
    }
  }, [
    pagination.page,
    pagination.limit,
    appliedFilters,
    searchQuery,
    fetchListings,
    hasActiveFilters,
  ]);

  useEffect(() => {
    const loadModels = async () => {
      if (selectedMakeId && metadata?.makes) {
        const selectedMake = metadata.makes.find(
          (make) => make.id === selectedMakeId
        );
        if (selectedMake) {
          setAppliedFilters((prev) => ({
            ...prev,
            make: selectedMake.name,
            model: "",
          }));
          setPagination((prev) => ({ ...prev, page: 1 }));

          try {
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
        setAppliedFilters((prev) => {
          const { make, model, ...rest } = prev;
          return rest;
        });
      }
    };

    loadModels();
  }, [selectedMakeId, metadata]);

  useEffect(() => {
    if (viewMode !== "map") {
      return;
    }

    const fetchMapListings = async () => {
      const trimmedQuery = searchQuery.trim();
      const filtersForMap: SearchFilters = {
        ...appliedFilters,
        page: 1,
        limit: MAP_VIEW_FETCH_LIMIT,
        sortBy: appliedFilters.sortBy || "createdAt",
        sortOrder: (appliedFilters.sortOrder as "ASC" | "DESC") || "DESC",
        ...(trimmedQuery && { query: trimmedQuery }),
      };

      const signature = JSON.stringify(filtersForMap);
      if (
        mapFiltersSignatureRef.current === signature &&
        mapListings.length > 0
      ) {
        return;
      }

      mapFiltersSignatureRef.current = signature;
      setMapLoading(true);

      try {
        let response;
        if (hasActiveFilters(filtersForMap)) {
          response = await ListingService.searchListings(filtersForMap);
        } else {
          response = (await ListingService.getListings(
            1,
            MAP_VIEW_FETCH_LIMIT
          )) as {
            listings: ListingDetail[];
          };
        }
        setMapListings(response.listings || []);
      } catch (error) {
        console.error("Failed to fetch listings for map view:", error);
        if (!mapListings.length) {
          toast.error("Unable to load listings on the map. Please try again.");
        }
      } finally {
        setMapLoading(false);
      }
    };

    fetchMapListings();
  }, [
    viewMode,
    appliedFilters,
    searchQuery,
    hasActiveFilters,
    mapListings.length,
  ]);

  const removeFilter = (filterKey: keyof SearchFilters) => {
    setAppliedFilters((prev) => {
      const { [filterKey]: removed, ...rest } = prev;
      return rest;
    });
    if (filterKey === "make") {
      setSelectedMakeId("");
      setAvailableModels([]);
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const removeSearchQuery = () => {
    setSearchQuery("");
  };

  const clearFilters = () => {
    setAppliedFilters({
      priceMin: 0,
      priceMax: DEFAULT_MAX_PRICE,
    });
    setSearchQuery("");
    setSelectedMakeId("");
    setAvailableModels([]);
    setPriceMinInput("");
    setPriceMaxInput("");
    setMileageMaxInput("");
    setLocationInput("");
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
      page: 1,
    }));
  };

  const handleSortChange = (sortValue: string) => {
    const sortOption = sortOptions.find((opt) => opt.value === sortValue);
    if (sortOption) {
      setAppliedFilters((prev) => ({
        ...prev,
        sortBy: sortOption.sortBy,
        sortOrder: sortOption.sortOrder,
      }));
      setPagination((prev) => ({
        ...prev,
        page: 1,
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const applyTextInputFilters = () => {
    setAppliedFilters((prev) => ({
      ...prev,
      priceMin: priceMinInput ? Number(priceMinInput) : 0,
      priceMax: priceMaxInput ? Number(priceMaxInput) : DEFAULT_MAX_PRICE,
      mileageMax: mileageMaxInput ? Number(mileageMaxInput) : undefined,
      location: locationInput || undefined,
    }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Search Bar */}
      <SearchBar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onSearch={handleSearch}
        onSuggestionClick={(listingId) => navigate(`/cars/${listingId}`)}
        showMobileFilters={showMobileFilters}
        setShowMobileFilters={setShowMobileFilters}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Left Sidebar - Desktop */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <SearchFiltersPanel
              metadata={metadata}
              metadataLoading={metadataLoading}
              metadataError={metadataError}
              availableModels={availableModels}
              selectedMakeId={selectedMakeId}
              appliedFilters={appliedFilters}
              priceMinInput={priceMinInput}
              priceMaxInput={priceMaxInput}
              mileageMaxInput={mileageMaxInput}
              locationInput={locationInput}
              setSelectedMakeId={setSelectedMakeId}
              setAppliedFilters={setAppliedFilters}
              setPriceMinInput={setPriceMinInput}
              setPriceMaxInput={setPriceMaxInput}
              setMileageMaxInput={setMileageMaxInput}
              setLocationInput={setLocationInput}
              onApplyFilters={applyTextInputFilters}
              onClearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />
          </aside>

          {/* Mobile Filters Drawer */}
          {showMobileFilters && (
            <div
              className="lg:hidden fixed inset-0 z-50 bg-black/50"
              onClick={() => setShowMobileFilters(false)}
            >
              <div
                className="absolute left-0 top-0 bottom-0 w-80 bg-white shadow-xl overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between z-10">
                  <h3 className="text-lg font-semibold">Filters</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMobileFilters(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-4">
                  <SearchFiltersPanel
                    metadata={metadata}
                    metadataLoading={metadataLoading}
                    metadataError={metadataError}
                    availableModels={availableModels}
                    selectedMakeId={selectedMakeId}
                    appliedFilters={appliedFilters}
                    priceMinInput={priceMinInput}
                    priceMaxInput={priceMaxInput}
                    mileageMaxInput={mileageMaxInput}
                    locationInput={locationInput}
                    setSelectedMakeId={setSelectedMakeId}
                    setAppliedFilters={setAppliedFilters}
                    setPriceMinInput={setPriceMinInput}
                    setPriceMaxInput={setPriceMaxInput}
                    setMileageMaxInput={setMileageMaxInput}
                    setLocationInput={setLocationInput}
                    onApplyFilters={applyTextInputFilters}
                    onClearFilters={clearFilters}
                    hasActiveFilters={hasActiveFilters}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Right Content - Results */}
          <main className="flex-1 min-w-0">
            {/* Results Header */}
            <SearchResultsHeader
              loading={loading}
              total={pagination.total}
              searchQuery={searchQuery}
              sortOptions={sortOptions}
              currentSort={getCurrentSortValue()}
              onSortChange={handleSortChange}
              viewMode={viewMode}
              onViewModeChange={(mode) => {
                setViewMode(mode);
                const newSearchParams = new URLSearchParams(searchParams);
                newSearchParams.set("view", mode);
                setSearchParams(newSearchParams, { replace: true });
              }}
              hasActiveFilters={hasActiveFilters()}
            />

            {/* Active Filters */}
            <ActiveFiltersDisplay
              searchQuery={searchQuery}
              appliedFilters={appliedFilters}
              onRemoveSearchQuery={removeSearchQuery}
              onRemoveFilter={removeFilter}
              onClearFilters={clearFilters}
            />

            {/* Map View or List View */}
            {viewMode === "map" ? (
              <SearchResultsMap
                listings={mapListings}
                loading={mapLoading}
                onMarkerClick={(listing) => {
                  navigate(`/cars/${listing.id}`);
                }}
              />
            ) : (
              <>
                <SearchResultsGrid
                  listings={listings}
                  loading={loading}
                  user={user}
                  onFavoriteChange={(listingId, isFavorite) => {
                    setListings((prev) =>
                      prev.map((l) =>
                        l.id === listingId
                          ? {
                              ...l,
                              favoriteCount: isFavorite
                                ? l.favoriteCount + 1
                                : Math.max(0, l.favoriteCount - 1),
                            }
                          : l
                      )
                    );
                    setMapListings((prev) =>
                      prev.map((l) =>
                        l.id === listingId
                          ? {
                              ...l,
                              favoriteCount: isFavorite
                                ? l.favoriteCount + 1
                                : Math.max(0, l.favoriteCount - 1),
                            }
                          : l
                      )
                    );
                  }}
                />

                {/* Pagination */}
                {!loading && listings.length > 0 && (
                  <SearchPagination
                    page={pagination.page}
                    limit={pagination.limit}
                    total={pagination.total}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                    onLimitChange={handleLimitChange}
                  />
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

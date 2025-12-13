import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Filter,
  Car,
  X,
  ChevronLeft,
  ChevronRight,
  List,
  Map,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";
import { EnhancedSelect } from "../components/ui/EnhancedSelect";
import { CarCard } from "../components/CarCard";
import { ListingMap } from "../components/ListingMap";
import { useAuthStore } from "../store/auth";
import type { ListingDetail, SearchFilters } from "../types";
import { ListingService } from "../services/listing.service";
import { useMetadata } from "../services/metadata.service";
import { useSearchParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getMediaUrl, handleImageError, cn } from "../lib/utils";

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

  const [viewMode, setViewMode] = useState<"list" | "map">(() => {
    const viewParam = searchParams.get("view");
    return viewParam === "map" || viewParam === "list" ? viewParam : "list";
  });
  const [mapListings, setMapListings] = useState<ListingDetail[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const mapFiltersSignatureRef = useRef<string>("");

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLFormElement>(null);

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length >= 2) {
        try {
          const results = await ListingService.getSuggestions(searchQuery);
          setSuggestions(results);
          setShowSuggestions(true);
        } catch (error) {
          console.error("Error fetching suggestions:", error);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSuggestionClick = (listingId: string) => {
    navigate(`/cars/${listingId}`);
    setShowSuggestions(false);
  };

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
      return (
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

  // Filters Panel Component
  const FiltersPanel = () => (
    <Card className="sticky top-24 max-h-[calc(100vh-6rem)] overflow-y-auto">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
          {hasActiveFilters() && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="text-xs"
            >
              <X className="h-3 w-3 mr-1" />
              Clear All
            </Button>
          )}
        </div>

        <div className="space-y-6">
          {/* Make */}
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
                availableModels.find((m) => m.name === appliedFilters.model)
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
                  setAppliedFilters((prev) => ({
                    ...prev,
                    model: selectedModel.name,
                  }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
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
                type="number"
                placeholder="Min"
                value={
                  appliedFilters.priceMin && appliedFilters.priceMin > 0
                    ? appliedFilters.priceMin
                    : ""
                }
                onChange={(e) => {
                  setAppliedFilters((prev) => ({
                    ...prev,
                    priceMin: e.target.value ? Number(e.target.value) : 0,
                  }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              />
              <Input
                type="number"
                placeholder="Max"
                value={
                  appliedFilters.priceMax &&
                  appliedFilters.priceMax < DEFAULT_MAX_PRICE
                    ? appliedFilters.priceMax
                    : ""
                }
                onChange={(e) => {
                  setAppliedFilters((prev) => ({
                    ...prev,
                    priceMax: e.target.value
                      ? Number(e.target.value)
                      : DEFAULT_MAX_PRICE,
                  }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              />
            </div>
          </div>

          {/* Year Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
                value={
                  appliedFilters.yearMin ? String(appliedFilters.yearMin) : ""
                }
                onValueChange={(value) => {
                  setAppliedFilters((prev) => {
                    const { yearMin, ...rest } = prev;
                    return value ? { ...rest, yearMin: Number(value) } : rest;
                  });
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
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
                value={
                  appliedFilters.yearMax ? String(appliedFilters.yearMax) : ""
                }
                onValueChange={(value) => {
                  setAppliedFilters((prev) => {
                    const { yearMax, ...rest } = prev;
                    return value ? { ...rest, yearMax: Number(value) } : rest;
                  });
                  setPagination((prev) => ({ ...prev, page: 1 }));
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
              type="number"
              placeholder="e.g., 50000"
              value={appliedFilters.mileageMax || ""}
              onChange={(e) => {
                setAppliedFilters((prev) => {
                  const { mileageMax, ...rest } = prev;
                  return e.target.value
                    ? { ...rest, mileageMax: Number(e.target.value) }
                    : rest;
                });
                setPagination((prev) => ({ ...prev, page: 1 }));
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
                ...(metadata?.fuelTypes?.map((type) => ({
                  value: type.value,
                  label: type.displayValue,
                })) || []),
              ]}
              value={appliedFilters.fuelType || ""}
              onValueChange={(value) => {
                setAppliedFilters((prev) => {
                  const { fuelType, ...rest } = prev;
                  return value ? { ...rest, fuelType: value as string } : rest;
                });
                setPagination((prev) => ({ ...prev, page: 1 }));
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
                ...(metadata?.bodyTypes?.map((type) => ({
                  value: type.value,
                  label: type.displayValue,
                })) || []),
              ]}
              value={appliedFilters.bodyType || ""}
              onValueChange={(value) => {
                setAppliedFilters((prev) => {
                  const { bodyType, ...rest } = prev;
                  return value ? { ...rest, bodyType: value as string } : rest;
                });
                setPagination((prev) => ({ ...prev, page: 1 }));
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
                ...(metadata?.transmissionTypes?.map((type) => ({
                  value: type.value,
                  label: type.displayValue,
                })) || []),
              ]}
              value={appliedFilters.transmission || ""}
              onValueChange={(value) => {
                setAppliedFilters((prev) => {
                  const { transmission, ...rest } = prev;
                  return value
                    ? { ...rest, transmission: value as string }
                    : rest;
                });
                setPagination((prev) => ({ ...prev, page: 1 }));
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
                ...(metadata?.conditions?.map((type) => ({
                  value: type.value,
                  label: type.displayValue,
                })) || []),
              ]}
              value={appliedFilters.condition || ""}
              onValueChange={(value) => {
                setAppliedFilters((prev) => {
                  const { condition, ...rest } = prev;
                  return value ? { ...rest, condition: value as string } : rest;
                });
                setPagination((prev) => ({ ...prev, page: 1 }));
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
              type="text"
              placeholder="City or State"
              value={appliedFilters.location || ""}
              onChange={(e) => {
                setAppliedFilters((prev) => {
                  const { location, ...rest } = prev;
                  return e.target.value
                    ? { ...rest, location: e.target.value }
                    : rest;
                });
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Search Bar */}
      <div className="bg-white border-b sticky top-16 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <form
            onSubmit={handleSearch}
            className="relative"
            ref={searchContainerRef}
          >
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 z-10" />
                <Input
                  type="text"
                  placeholder="Search by make, model, or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) setShowSuggestions(true);
                  }}
                  className="pl-10 h-12 text-lg"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearch(e);
                    }
                  }}
                />

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-md shadow-xl border border-gray-100 z-50 overflow-hidden">
                    {suggestions.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSuggestionClick(item.id)}
                        className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      >
                        <div className="h-12 w-16 flex-shrink-0 bg-gray-200 rounded overflow-hidden mr-4">
                          {item.thumbnail ? (
                            <img
                              src={
                                item.thumbnail.startsWith("http")
                                  ? item.thumbnail
                                  : getMediaUrl(item.thumbnail)
                              }
                              alt={item.title}
                              className="h-full w-full object-cover"
                              onError={handleImageError}
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-400">
                              <Car size={20} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">
                            {item.title}
                          </h4>
                          <div className="flex items-center text-xs text-gray-500 mt-1">
                            <span className="capitalize bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 mr-2">
                              {item.condition}
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <span className="text-blue-600 font-bold text-sm">
                            ${item.price.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="lg:hidden"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Left Sidebar - Desktop */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <FiltersPanel />
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
                  <FiltersPanel />
                </div>
              </div>
            </div>
          )}

          {/* Right Content - Results */}
          <main className="flex-1 min-w-0">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {loading
                    ? "Searching..."
                    : `${pagination.total.toLocaleString()} results`}
                </h2>
                {hasActiveFilters() && (
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
                  value={getCurrentSortValue()}
                  onValueChange={(value) => handleSortChange(value as string)}
                  placeholder="Sort by"
                  searchable={false}
                  multiple={false}
                />
                <div className="flex items-center gap-1 border rounded-md">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setViewMode("list");
                      const newSearchParams = new URLSearchParams(searchParams);
                      newSearchParams.set("view", "list");
                      setSearchParams(newSearchParams, { replace: true });
                    }}
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
                    onClick={() => {
                      setViewMode("map");
                      const newSearchParams = new URLSearchParams(searchParams);
                      newSearchParams.set("view", "map");
                      setSearchParams(newSearchParams, { replace: true });
                    }}
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

            {/* Active Filters */}
            {hasActiveFilters() && (
              <div className="flex flex-wrap gap-2 mb-6">
                {searchQuery.trim() && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
                    Search: "{searchQuery}"
                    <button
                      onClick={removeSearchQuery}
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
                      onClick={() => removeFilter("make")}
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
                      onClick={() => removeFilter("model")}
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
                        setAppliedFilters((prev) => {
                          const { priceMin, priceMax, ...rest } = prev;
                          return {
                            ...rest,
                            priceMin: 0,
                            priceMax: DEFAULT_MAX_PRICE,
                          };
                        });
                      }}
                      className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ) : null}
                {hasActiveFilters() && (
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium border border-gray-300 hover:bg-gray-200 transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Clear All
                  </button>
                )}
              </div>
            )}

            {/* Map View or List View */}
            {viewMode === "map" ? (
              <div
                className="w-full rounded-lg overflow-hidden border border-gray-200 shadow-lg mb-6"
                style={{ height: "600px", minHeight: "600px" }}
              >
                {mapLoading ? (
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
                    listings={mapListings}
                    onMarkerClick={(listing) => {
                      navigate(`/cars/${listing.id}`);
                    }}
                  />
                )}
              </div>
            ) : (
              <>
                {loading ? (
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
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {listings.map((listing, index) => (
                      <div
                        key={`${listing.id}-${user?.id || "anonymous"}`}
                        className="car-card-fade-in-up"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <CarCard
                          listing={listing}
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
                      </div>
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
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-700">Show</span>
                      <select
                        value={pagination.limit}
                        onChange={(e) =>
                          handleLimitChange(parseInt(e.target.value))
                        }
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
                        Showing {(pagination.page - 1) * pagination.limit + 1}{" "}
                        to{" "}
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
                            } else if (
                              pagination.page >=
                              pagination.totalPages - 2
                            ) {
                              pageNum = pagination.totalPages - 4 + i;
                            } else {
                              pageNum = pagination.page - 2 + i;
                            }

                            return (
                              <Button
                                key={pageNum}
                                variant={
                                  pagination.page === pageNum
                                    ? "default"
                                    : "outline"
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
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

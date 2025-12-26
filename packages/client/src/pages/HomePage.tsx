import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search,
  Filter,
  Car,
  X,
  ChevronLeft,
  ChevronRight,
  Map,
  List,
  Star,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Card, CardContent } from "../components/ui/Card";
import { EnhancedSelect } from "../components/ui/EnhancedSelect";
import { CarCard } from "../components/CarCard";
import { RecommendationsSection } from "../components/RecommendationsSection";
import { ListingMap } from "../components/ListingMap";
import { useAuthStore } from "../store/auth";
import type { ListingDetail, SearchFilters } from "../types";
import { ListingService } from "../services/listing.service";
import { useMetadata } from "../services/metadata.service";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { getMediaUrl, handleImageError, cn, formatPriceShort } from "../lib/utils";
import { DualRangeSlider } from "../components/ui/DualRangeSlider";

const MAP_VIEW_FETCH_LIMIT = 500;

// CẤU HÌNH LOGIC GIÁ
// Giá trị thực tế gửi xuống Backend khi chọn "Max" (50 Tỷ)
const BACKEND_MAX_PRICE = 50000000000; 

// Giá trị hiển thị tối đa trên thanh trượt (2 Tỷ)
const UI_SOFT_LIMIT = 2000000000; 

// Bước nhảy (50 triệu để kéo mượt hơn trong khoảng 0-2 tỷ)
const PRICE_STEP = 50000000; 

// Giá trị max thực tế CỦA THANH TRƯỢT (2 Tỷ + 1 bước nhảy = 2 Tỷ 050tr)
// Nấc này sẽ đại diện cho "> 2 Tỷ"
const UI_SLIDER_MAX = UI_SOFT_LIMIT + PRICE_STEP;

// Helper hiển thị label
const formatPriceLabel = (value: number) => {
  if (value >= UI_SLIDER_MAX) return "> 2 Tỷ";
  return formatPriceShort(value);
};

export function HomePage() {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<ListingDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>({
    priceMin: 0,
    priceMax: BACKEND_MAX_PRICE,
  });
  
  const [showFilters, setShowFilters] = useState(false);
  
  // Local State cho Slider (Max là UI_SLIDER_MAX ~ 2.05 Tỷ)
  const [localPriceRange, setLocalPriceRange] = useState<[number, number]>([0, UI_SLIDER_MAX]);

  const { metadata, loading: metadataLoading, error: metadataError } = useMetadata();
  const [selectedMakeId, setSelectedMakeId] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  
  const [viewMode, setViewMode] = useState<"list" | "map">(() => {
    const viewParam = searchParams.get("view");
    return (viewParam === "map" || viewParam === "list") ? viewParam : "list";
  });
  const [mapListings, setMapListings] = useState<ListingDetail[]>([]);
  const [mapLoading, setMapLoading] = useState(false);
  const mapFiltersSignatureRef = useRef<string>("");

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  });

  const [totalCarsAvailable, setTotalCarsAvailable] = useState<number | null>(null);

  const sortOptions = [
    { value: "newest", label: "Newest First", sortBy: "createdAt", sortOrder: "DESC" as const },
    { value: "oldest", label: "Oldest First", sortBy: "createdAt", sortOrder: "ASC" as const },
    { value: "price-low", label: "Price: Low to High", sortBy: "price", sortOrder: "ASC" as const },
    { value: "price-high", label: "Price: High to Low", sortBy: "price", sortOrder: "DESC" as const },
    { value: "year-new", label: "Year: Newest First", sortBy: "year", sortOrder: "DESC" as const },
    { value: "year-old", label: "Year: Oldest First", sortBy: "year", sortOrder: "ASC" as const },
    { value: "mileage-low", label: "Mileage: Low to High", sortBy: "mileage", sortOrder: "ASC" as const },
    { value: "mileage-high", label: "Mileage: High to Low", sortBy: "mileage", sortOrder: "DESC" as const },
  ];

  // --- LOGIC XỬ LÝ SLIDER ---

  // Effect A: Đồng bộ local state khi appliedFilters thay đổi (Data -> UI)
  useEffect(() => {
    let uiMin = appliedFilters.priceMin || 0;
    let uiMax = appliedFilters.priceMax || BACKEND_MAX_PRICE;

    // Nếu giá max từ server >= UI_SLIDER_MAX (hoặc là BACKEND_MAX_PRICE), thì gán UI về nấc cuối cùng
    if (uiMax >= UI_SLIDER_MAX) {
      uiMax = UI_SLIDER_MAX;
    }

    setLocalPriceRange([uiMin, uiMax]);
  }, [appliedFilters.priceMin, appliedFilters.priceMax]);

  // Effect B: Debounce 1.5s - Chỉ gọi API khi người dùng dừng kéo (UI -> Data)
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentMinFilter = appliedFilters.priceMin || 0;
      const currentMaxFilter = appliedFilters.priceMax || BACKEND_MAX_PRICE;
      
      let newMin = localPriceRange[0];
      let newMax = localPriceRange[1];

      // LOGIC QUAN TRỌNG: Nếu người dùng kéo kịch kim phải (>= 2.05 Tỷ)
      // -> Gán giá trị thực là Vô cực (BACKEND_MAX_PRICE)
      if (newMax >= UI_SLIDER_MAX) {
        newMax = BACKEND_MAX_PRICE;
      }

      // Chỉ gọi API nếu giá trị thực sự thay đổi
      if (newMin !== currentMinFilter || newMax !== currentMaxFilter) {
        setAppliedFilters((prev) => ({
          ...prev,
          priceMin: newMin,
          priceMax: newMax,
        }));
        setPagination((prev) => ({ ...prev, page: 1 }));
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [localPriceRange, appliedFilters]);

  // ---------------------------

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
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

  useEffect(() => {
    const viewParam = searchParams.get("view");
    if (viewParam === "map" || viewParam === "list") {
      if (viewMode !== viewParam) {
        setViewMode(viewParam);
      }
    } else if (!viewParam && viewMode !== "list") {
      setViewMode("list");
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && user.provider && user.provider !== "local") {
      const fromCallback = location.state?.fromCallback;
      if (fromCallback) {
        const hasShownToast = sessionStorage.getItem('oauth_welcome_shown');
        if (!hasShownToast) {
          toast.success(
            `🎉 Welcome ${user.firstName}! You're successfully logged in with ${user.provider}.`
          );
          sessionStorage.setItem('oauth_welcome_shown', 'true');
          setTimeout(() => {
            sessionStorage.removeItem('oauth_welcome_shown');
          }, 5000);
        }
      }
    }
  }, [user, location.state]);

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

    const handleFocus = () => {
      setListings((prev) => [...prev]);
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [
    pagination.page,
    pagination.limit,
    appliedFilters,
    searchQuery,
    fetchListings,
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
        (filters.priceMax && filters.priceMax < BACKEND_MAX_PRICE) ||
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
    if (filterKey === 'make') {
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
      priceMax: BACKEND_MAX_PRICE,
    });
    setLocalPriceRange([0, UI_SLIDER_MAX]); // Reset local slider về 2.05 Tỷ (Đại diện cho Max)
    setSearchQuery("");
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

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative text-white py-20 md:py-24">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80)'
          }}
        >
          <div className="absolute inset-0 bg-black/40"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-[45]">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 hero-fade-in-up">
              Find Your Perfect Car
            </h1>
            
            <p className="text-xl md:text-2xl mb-8 text-blue-100 hero-fade-in-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
              Browse thousands of quality used cars from trusted sellers
            </p>
            
            <div className="flex flex-wrap justify-center gap-3 mb-8 md:mb-12 hero-fade-in-up" style={{ animationDelay: '0.4s', opacity: 0 }}>
              <span className="px-4 py-2 bg-white/10 rounded-full text-sm md:text-base border border-white/20">
                ✓ Verified Sellers
              </span>
              <span className="px-4 py-2 bg-white/10 rounded-full text-sm md:text-base border border-white/20">
                ✓ Best Prices
              </span>
              <span className="px-4 py-2 bg-white/10 rounded-full text-sm md:text-base border border-white/20">
                ✓ Easy Financing
              </span>
            </div>

            {/* Search Bar with Quick Filters */}
            <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg p-6 md:p-8 text-black hero-fade-in-up" style={{ animationDelay: '0.6s', opacity: 0 }}>
              {/* Main Search Bar */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6 relative" ref={searchContainerRef}>
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
                    className="pl-10 h-12 text-lg text-gray-900 bg-gray-50 border-gray-300"
                  />
                  
                  {/* Container Gợi ý */}
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
                                  item.thumbnail.startsWith('http') 
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
                              {item.sellerRating > 0 && (
                                <div className="flex items-center text-yellow-500">
                                  <span className="font-medium mr-0.5">{item.sellerRating}</span>
                                  <Star size={10} fill="currentColor" />
                                  <span className="text-gray-400 ml-1">({item.sellerReviewCount})</span>
                                </div>
                              )}
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
              </div>

              {/* Quick Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky Filter Bar */}
      {(hasActiveFilters() || showFilters) && (
        <div className="sticky top-16 z-40 bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex-1 w-full sm:w-auto overflow-x-auto sm:overflow-x-visible">
                <div className="flex flex-wrap sm:flex-wrap items-center gap-2 min-w-0 pb-2 sm:pb-0 -mx-2 px-2 sm:mx-0 sm:px-0">
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
                    Make: {metadata?.makes?.find(m => m.name === appliedFilters.make)?.displayName || appliedFilters.make}
                    <button
                      onClick={() => removeFilter('make')}
                      className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                      aria-label="Remove make filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {/* ... (Các filter tag khác giữ nguyên) ... */}
                {(appliedFilters.priceMin && appliedFilters.priceMin > 0) || (appliedFilters.priceMax && appliedFilters.priceMax < BACKEND_MAX_PRICE) ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
                    Price: {formatPriceShort(appliedFilters.priceMin || 0)} - {formatPriceShort(appliedFilters.priceMax || BACKEND_MAX_PRICE)}
                    <button
                      onClick={() => {
                        setAppliedFilters((prev) => {
                          const { priceMin, priceMax, ...rest } = prev;
                          return { ...rest, priceMin: 0, priceMax: BACKEND_MAX_PRICE };
                        });
                        setLocalPriceRange([0, UI_SLIDER_MAX]);
                      }}
                      className="hover:bg-blue-100 rounded-full p-0.5 transition-colors"
                      aria-label="Remove price filter"
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
              </div>

              {/* Filter Actions */}
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  {showFilters ? 'Hide' : 'More'} Filters
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations Section */}
      <RecommendationsSection limit={3} />

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
              
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setViewMode("list");
                  const newSearchParams = new URLSearchParams(searchParams);
                  newSearchParams.set("view", "list");
                  setSearchParams(newSearchParams, { replace: true });
                }}
                size="sm"
                className={cn(
                  "flex items-center gap-2 transition-all",
                  viewMode === "list" && "bg-black text-white hover:bg-black/90 shadow-md"
                )}
              >
                <List className="h-4 w-4" />
                List View
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setViewMode("map");
                  const newSearchParams = new URLSearchParams(searchParams);
                  newSearchParams.set("view", "map");
                  setSearchParams(newSearchParams, { replace: true });
                }}
                size="sm"
                className={cn(
                  "flex items-center gap-2 transition-all",
                  viewMode === "map" && "bg-black text-white hover:bg-black/90 shadow-md"
                )}
              >
                <Map className="h-4 w-4" />
                Map View
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "transition-all",
                showFilters && "bg-black text-white hover:bg-black/90"
              )}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {/* Filter Panel - BỐ CỤC LẠI */}
          {showFilters && metadata && (
            <Card className="mb-8">
              <CardContent className="p-6">
                {/* Hàng 1: Các bộ lọc cơ bản */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
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
                      placeholder="Select a make"
                      searchable={true}
                      multiple={false}
                      maxHeight="360px"
                    />
                  </div>

                  {/* Model */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      placeholder="Select a model"
                      searchable={true}
                      multiple={false}
                    />
                  </div>

                  {/* Year Range */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Year Range
                    </label>
                    <div className="flex space-x-2">
                      <EnhancedSelect
                        className="w-full" // <--- THÊM DÒNG NÀY
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
                        className="w-full" // <--- THÊM DÒNG NÀY
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

                  {/* Location (Đưa lên hàng 1) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <Input
                      type="text"
                      placeholder="City or State"
                      value={appliedFilters.location || ""}
                      onChange={(e) => {
                        setAppliedFilters((prev) => {
                          const { location, ...rest } = prev;
                          return e.target.value ? { ...rest, location: e.target.value } : rest;
                        });
                        setPagination((prev) => ({ ...prev, page: 1 }));
                      }}
                    />
                  </div>
                </div>

                {/* Hàng 2: Price Range Slider (Riêng biệt) */}
                <div className="mb-8 px-2 py-4 border-t border-b border-gray-100 bg-gray-50/50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-6">
                    Price Range: {formatPriceLabel(localPriceRange[0])} - {formatPriceLabel(localPriceRange[1])} (VND)
                  </label>
                  <DualRangeSlider
                    min={0}
                    max={UI_SLIDER_MAX}
                    step={PRICE_STEP} // Sử dụng bước nhảy 50 Triệu
                    valueMin={localPriceRange[0]}
                    valueMax={localPriceRange[1]}
                    onChangeMin={(val) => setLocalPriceRange(prev => [val, prev[1]])}
                    onChangeMax={(val) => setLocalPriceRange(prev => [prev[0], val])}
                    formatValue={formatPriceLabel}
                    className="mb-2"
                  />
                </div>

                {/* Hàng 3: Các bộ lọc phụ */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  {/* Mileage */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Mileage
                    </label>
                    <Input
                      type="number"
                      placeholder="e.g., 50000"
                      value={appliedFilters.mileageMax || ""}
                      onChange={(e) => {
                        setAppliedFilters((prev) => {
                          const { mileageMax, ...rest } = prev;
                          return e.target.value ? { ...rest, mileageMax: Number(e.target.value) } : rest;
                        });
                        setPagination((prev) => ({ ...prev, page: 1 }));
                      }}
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
                      value={appliedFilters.transmission || ""}
                      onValueChange={(value) => {
                        setAppliedFilters((prev) => {
                          const { transmission, ...rest } = prev;
                          return value ? { ...rest, transmission: value as string } : rest;
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
                </div>

                <div className="flex justify-end mt-6">
                  <Button variant="outline" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-2" />
                    Clear All Filters
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Map View or List View */}
          {viewMode === "map" ? (
            <div className="w-full rounded-lg overflow-hidden border border-gray-200 shadow-lg mb-6" style={{ height: "600px", minHeight: "600px" }}>
              {mapLoading ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-600">Loading all listings on the map...</p>
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
                          // Also update mapListings
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
            </>
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
              <div className="text-4xl font-bold text-black mb-2">
                {totalCarsAvailable !== null ? (
                  totalCarsAvailable.toLocaleString()
                ) : (
                  <span className="text-gray-400">Loading...</span>
                )}
              </div>
              <div className="text-lg text-gray-600">Cars Available</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-black mb-2">
                {totalCarsAvailable !== null ? (
                  (totalCarsAvailable * 5).toLocaleString() + "+"
                ) : (
                  <span className="text-gray-400">Loading...</span>
                )}
              </div>
              <div className="text-lg text-gray-600">Happy Customers</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-black mb-2">99%</div>
              <div className="text-lg text-gray-600">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
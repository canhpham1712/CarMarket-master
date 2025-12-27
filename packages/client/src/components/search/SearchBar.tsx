import React, { useEffect, useRef, useState } from "react";
import { Search, Car, Filter } from "lucide-react";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { getMediaUrl, handleImageError } from "../../lib/utils";

interface SearchBarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onSearch: (e: React.FormEvent) => void;
  onSuggestionClick: (id: string) => void;
  showMobileFilters: boolean;
  setShowMobileFilters: (show: boolean) => void;
}

export const SearchBar = React.memo(({
  searchQuery,
  setSearchQuery,
  onSearch,
  onSuggestionClick,
  showMobileFilters,
  setShowMobileFilters,
}: SearchBarProps) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLFormElement>(null);

  // Handle click outside to close suggestions
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

  // Fetch suggestions based on search query
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length >= 2) {
        try {
          const { ListingService } = await import("../../services/listing.service");
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

  const handleSuggestionClick = (id: string) => {
    onSuggestionClick(id);
    setShowSuggestions(false);
  };

  return (
    <div className="bg-white border-b sticky top-16 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <form
          onSubmit={onSearch}
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
                    onSearch(e);
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
  );
});

SearchBar.displayName = "SearchBar";

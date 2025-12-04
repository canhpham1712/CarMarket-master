import * as React from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "../../lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface EnhancedSelectProps {
  options: SelectOption[];
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  error?: boolean;
  maxHeight?: string;
}

export const EnhancedSelect = React.forwardRef<
  HTMLDivElement,
  EnhancedSelectProps
>(
  (
    {
      options,
      value,
      onValueChange,
      placeholder = "Select an option",
      searchable = true,
      multiple = false,
      disabled = false,
      className,
      error = false,
      maxHeight = "200px",
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [selectedValues, setSelectedValues] = React.useState<string[]>([]);
    const selectRef = React.useRef<HTMLDivElement>(null);
    const searchInputRef = React.useRef<HTMLInputElement>(null);

    // (debug logs removed)

    // Initialize selected values
    React.useEffect(() => {
      if (multiple && Array.isArray(value)) {
        setSelectedValues(value);
      } else if (!multiple && typeof value === "string") {
        setSelectedValues([value]);
      } else {
        setSelectedValues([]);
      }
    }, [value, multiple]);

    // Filter options based on search term
    const filteredOptions = React.useMemo(() => {
      if (!searchable || !searchTerm) return options;
      return options.filter((option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }, [options, searchTerm, searchable]);

    // Handle option selection
    const handleOptionSelect = (optionValue: string) => {
      if (multiple) {
        const newValues = selectedValues.includes(optionValue)
          ? selectedValues.filter((v) => v !== optionValue)
          : [...selectedValues, optionValue];
        setSelectedValues(newValues);
        onValueChange?.(newValues);
      } else {
        setSelectedValues([optionValue]);
        onValueChange?.(optionValue);
        setIsOpen(false);
        setSearchTerm("");
      }
    };

    // Handle remove selected value (for multiple select)
    const handleRemoveValue = (valueToRemove: string) => {
      const newValues = selectedValues.filter((v) => v !== valueToRemove);
      setSelectedValues(newValues);
      onValueChange?.(newValues);
    };

    // Handle clear all (for multiple select)
    const handleClearAll = () => {
      setSelectedValues([]);
      onValueChange?.(multiple ? [] : "");
    };

    // Get display text
    const getDisplayText = () => {
      if (multiple) {
        if (selectedValues.length === 0) return placeholder;
        if (selectedValues.length === 1) {
          const option = options.find((opt) => opt.value === selectedValues[0]);
          return option?.label || selectedValues[0];
        }
        return `${selectedValues.length} selected`;
      } else {
        const option = options.find((opt) => opt.value === selectedValues[0]);
        return option?.label || placeholder;
      }
    };

    // Close dropdown when clicking outside
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          selectRef.current &&
          !selectRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
          setSearchTerm("");
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    React.useEffect(() => {
      if (isOpen && searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [isOpen, searchable]);

    return (
      <div ref={ref || selectRef} className={cn("relative", className)}>
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm bg-white",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error ? "border-red-500" : "border-gray-300",
            isOpen && "ring-2 ring-blue-500 border-transparent"
          )}
        >
          <span className="truncate text-left text-gray-900">
            {getDisplayText()}
          </span>
          <div className="flex items-center gap-1">
            {multiple && selectedValues.length > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearAll();
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 opacity-50 transition-transform",
                isOpen && "rotate-180"
              )}
            />
          </div>
        </button>

        {/* Selected Values (for multiple select) */}
        {multiple && selectedValues.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {selectedValues.map((val) => {
              const option = options.find((opt) => opt.value === val);
              return (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  {option?.label || val}
                  <button
                    type="button"
                    onClick={() => handleRemoveValue(val)}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* Dropdown */}
        {isOpen && (
          <div
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg overflow-hidden"
            style={{ maxHeight: maxHeight || "200px" }}
          >
            {/* Search Input */}
            {searchable && (
              <div className="bg-white border-b border-gray-200 w-full">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm border-0 rounded-none focus:outline-none focus:ring-0 bg-white m-0"
                  />
                </div>
              </div>
            )}

            {/* Options List */}
            <div 
              className="bg-white overflow-y-auto"
              style={{ 
                maxHeight: searchable ? "calc(200px - 45px)" : "200px",
                scrollPaddingBottom: "8px"
              }}
            >
              <div className="pb-2">
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">
                    No options found
                  </div>
                ) : (
                  filteredOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleOptionSelect(option.value)}
                      disabled={option.disabled}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        selectedValues.includes(option.value)
                          ? "bg-blue-50 text-blue-900"
                          : "text-gray-900"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span>{option.label}</span>
                        {selectedValues.includes(option.value) && (
                          <Check className="h-4 w-4 text-blue-600" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

EnhancedSelect.displayName = "EnhancedSelect";

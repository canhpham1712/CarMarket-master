import React, { useState, useEffect, useRef } from "react";

interface RejectionReasonTextareaProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  label?: string;
}

/**
 * Optimized textarea component that uses local state to prevent
 * parent component re-renders on every keystroke.
 * Updates parent state asynchronously to avoid blocking the UI.
 */
export const RejectionReasonTextarea = React.memo<RejectionReasonTextareaProps>(
  ({ value = "", onChange, placeholder, rows = 3, className, label }) => {
    const [localValue, setLocalValue] = useState(value);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isInternalUpdateRef = useRef(false);

    // Sync with parent value when it changes externally (not from our own updates)
    useEffect(() => {
      if (!isInternalUpdateRef.current) {
        setLocalValue(value);
      }
      isInternalUpdateRef.current = false;
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      setLocalValue(newValue);
      
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Update parent state asynchronously to avoid blocking UI
      // This prevents the parent component from re-rendering synchronously
      timeoutRef.current = setTimeout(() => {
        isInternalUpdateRef.current = true;
        onChange(newValue);
      }, 0);
    };

    const handleBlur = () => {
      // Ensure parent is synced immediately on blur
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      isInternalUpdateRef.current = true;
      onChange(localValue);
    };

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        <textarea
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          rows={rows}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if value changes externally (not from local typing)
    // This prevents unnecessary re-renders when parent updates
    return prevProps.value === nextProps.value;
  }
);

RejectionReasonTextarea.displayName = "RejectionReasonTextarea";


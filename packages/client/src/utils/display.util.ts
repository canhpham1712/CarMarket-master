/**
 * Utility functions for displaying values in the admin dashboard
 * Handles formatting differences and null/undefined values
 */

/**
 * Format coordinates to a human-readable format
 * Example: 20.1883648 -> "20.188°N"
 */
function formatCoordinate(value: number, isLatitude: boolean): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "N/A";
  }
  const absValue = Math.abs(value);
  const direction = isLatitude 
    ? (value >= 0 ? "N" : "S")
    : (value >= 0 ? "E" : "W");
  return `${absValue.toFixed(6)}°${direction}`;
}

export function formatDisplayValue(value: any, fieldName?: string): string {
  if (value === null || value === undefined) {
    return "N/A";
  }

  // Special handling for coordinates
  if (fieldName === "latitude" && typeof value === "number") {
    return formatCoordinate(value, true);
  }
  if (fieldName === "longitude" && typeof value === "number") {
    return formatCoordinate(value, false);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      trimmed === "" ||
      trimmed.toLowerCase() === "n/a" ||
      trimmed.toLowerCase() === "na"
    ) {
      return "N/A";
    }
    return trimmed;
  }

  if (typeof value === "number") {
    // Format numbers consistently
    if (Number.isInteger(value)) {
      return value.toString();
    }
    // Remove trailing zeros for decimal numbers
    return parseFloat(value.toString()).toString();
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(", ") : "N/A";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

export function valuesAreEffectivelyEqual(
  original: any,
  updated: any
): boolean {
  const normalizedOriginal = formatDisplayValue(original);
  const normalizedUpdated = formatDisplayValue(updated);

  return normalizedOriginal === normalizedUpdated;
}

export function shouldShowChange(original: any, updated: any): boolean {
  return !valuesAreEffectivelyEqual(original, updated);
}


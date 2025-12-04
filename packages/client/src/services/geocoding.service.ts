import { apiClient } from '../lib/api';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  displayName: string;
  address: {
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    fullAddress?: string;
  };
}

export interface ReverseGeocodeResult {
  displayName: string;
  address: {
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    fullAddress?: string;
  };
}

export class GeocodingService {
  /**
   * Convert address to coordinates
   */
  static async geocode(address: string): Promise<GeocodeResult> {
    const response = await apiClient.get('/geocoding/geocode', {
      params: { address },
    });
    return response.data;
  }

  /**
   * Convert coordinates to address
   */
  static async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<ReverseGeocodeResult> {
    const response = await apiClient.get('/geocoding/reverse', {
      params: { lat: latitude, lng: longitude },
    });
    return response.data;
  }
}


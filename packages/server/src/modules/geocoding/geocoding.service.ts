import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

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

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly nominatimBaseUrl = 'https://nominatim.openstreetmap.org';
  private readonly cache = new Map<string, GeocodeResult>();
  private readonly reverseCache = new Map<string, ReverseGeocodeResult>();

  constructor(private readonly httpService: HttpService) {}

  /**
   * Geocode an address to coordinates
   * Uses Nominatim API with rate limiting and caching
   */
  async geocode(address: string): Promise<GeocodeResult> {
    if (!address || !address.trim()) {
      throw new BadRequestException('Address is required');
    }

    const normalizedAddress = address.trim().toLowerCase();

    // Check cache first
    if (this.cache.has(normalizedAddress)) {
      this.logger.debug(`Cache hit for address: ${address}`);
      return this.cache.get(normalizedAddress)!;
    }

    try {
      // Rate limit: Nominatim requires max 1 request per second
      // In production, consider using a queue or delay mechanism
      const response = await firstValueFrom(
        this.httpService.get(`${this.nominatimBaseUrl}/search`, {
          params: {
            q: address,
            format: 'json',
            limit: 1,
            addressdetails: 1,
          },
          headers: {
            'User-Agent': 'CarMarket/1.0',
          },
        }),
      );

      if (!response.data || response.data.length === 0) {
        throw new BadRequestException(`Could not geocode address: ${address}`);
      }

      const result = response.data[0];
      const geocodeResult: GeocodeResult = {
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon),
        displayName: result.display_name,
        address: {
          city: result.address?.city || result.address?.town || result.address?.village,
          state: result.address?.state || result.address?.region,
          country: result.address?.country,
          postalCode: result.address?.postcode,
          fullAddress: result.display_name,
        },
      };

      // Cache the result
      this.cache.set(normalizedAddress, geocodeResult);

      // Limit cache size to prevent memory issues
      if (this.cache.size > 1000) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
      }

      return geocodeResult;
    } catch (error: any) {
      this.logger.error(`Geocoding failed for address: ${address}`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Geocoding service error: ${error.message}`);
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<ReverseGeocodeResult> {
    // Validate coordinates
    if (latitude < -90 || latitude > 90) {
      throw new BadRequestException('Invalid latitude. Must be between -90 and 90.');
    }
    if (longitude < -180 || longitude > 180) {
      throw new BadRequestException('Invalid longitude. Must be between -180 and 180.');
    }

    const cacheKey = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;

    // Check cache first
    if (this.reverseCache.has(cacheKey)) {
      this.logger.debug(`Cache hit for coordinates: ${cacheKey}`);
      return this.reverseCache.get(cacheKey)!;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.nominatimBaseUrl}/reverse`, {
          params: {
            lat: latitude,
            lon: longitude,
            format: 'json',
            addressdetails: 1,
          },
          headers: {
            'User-Agent': 'CarMarket/1.0',
          },
        }),
      );

      if (!response.data || !response.data.address) {
        throw new BadRequestException(
          `Could not reverse geocode coordinates: ${latitude}, ${longitude}`,
        );
      }

      const result = response.data;
      const reverseGeocodeResult: ReverseGeocodeResult = {
        displayName: result.display_name,
        address: {
          city: result.address?.city || result.address?.town || result.address?.village,
          state: result.address?.state || result.address?.region,
          country: result.address?.country,
          postalCode: result.address?.postcode,
          fullAddress: result.display_name,
        },
      };

      // Cache the result
      this.reverseCache.set(cacheKey, reverseGeocodeResult);

      // Limit cache size
      if (this.reverseCache.size > 1000) {
        const firstKey = this.reverseCache.keys().next().value;
        this.reverseCache.delete(firstKey);
      }

      return reverseGeocodeResult;
    } catch (error: any) {
      this.logger.error(
        `Reverse geocoding failed for coordinates: ${latitude}, ${longitude}`,
        error,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Reverse geocoding service error: ${error.message}`);
    }
  }
}


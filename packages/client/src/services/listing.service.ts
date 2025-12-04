import { apiClient } from "../lib/api";
import type { ListingDetail, SearchFilters, SearchResponse, User } from "../types";

export interface CreateListingPayload {
  title: string;
  description: string;
  price: number;
  priceType?: string;
  location: string;
  city?: string;
  state?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  carDetail: {
    make: string;
    model: string;
    year: number;
    bodyType: string;
    fuelType: string;
    transmission: string;
    engineSize: number;
    enginePower: number;
    mileage: number;
    color: string;
    numberOfDoors?: number;
    numberOfSeats?: number;
    condition: string;
    vin?: string;
    registrationNumber?: string;
    previousOwners?: number;
    description?: string;
    features?: string[];
  };
  images?: {
    filename: string;
    originalName: string;
    url: string;
    type?: string;
    alt?: string;
    fileSize?: number;
    mimeType?: string;
  }[];
  videos?: {
    filename: string;
    originalName: string;
    url: string;
    alt?: string;
    fileSize?: number;
    mimeType?: string;
    duration?: number;
    thumbnailUrl?: string;
  }[];
}

export class ListingService {
  static async createListing(
    data: CreateListingPayload
  ): Promise<ListingDetail> {
    return apiClient.post<ListingDetail>("/listings", data);
  }

  static async getListings(page: number = 1, limit: number = 10) {
    return apiClient.get("/listings", { page, limit });
  }

  static async getListing(id: string): Promise<ListingDetail> {
    return apiClient.get<ListingDetail>(`/listings/${id}`);
  }

  static async updateListing(
    id: string,
    data: Partial<CreateListingPayload>
  ): Promise<ListingDetail> {
    return apiClient.patch<ListingDetail>(`/listings/${id}`, data);
  }

  static async deleteListing(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/listings/${id}`);
  }

  static async searchListings(filters: SearchFilters): Promise<SearchResponse> {
    return apiClient.get<SearchResponse>("/search", filters);
  }

  static async searchNearby(
    latitude: number,
    longitude: number,
    radius: number = 10,
    page: number = 1,
    limit: number = 50
  ): Promise<{
    listings: ListingDetail[];
    distances: Array<{ listingId: string; distance: number }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    center: { latitude: number; longitude: number };
    radius: number;
  }> {
    return apiClient.get("/listings/search/nearby", {
      lat: latitude,
      lng: longitude,
      radius,
      page,
      limit,
    });
  }

  static async uploadCarImages(files: File[]): Promise<{
    images: Array<{
      filename: string;
      url: string;
      originalName: string;
      fileSize: number;
      mimeType: string;
    }>;
  }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append(`images`, file);
    });

    return apiClient.post<{
      images: Array<{
        filename: string;
        url: string;
        originalName: string;
        fileSize: number;
        mimeType: string;
      }>;
    }>("/listings/upload-images", formData);
  }

  static async uploadCarVideos(files: File[]): Promise<{
    videos: Array<{
      filename: string;
      url: string;
      originalName: string;
      fileSize: number;
      mimeType: string;
    }>;
  }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append(`videos`, file);
    });

    return apiClient.post<{
      videos: Array<{
        filename: string;
        url: string;
        originalName: string;
        fileSize: number;
        mimeType: string;
      }>;
    }>("/listings/upload-videos", formData);
  }

  static async getUserListings(page: number = 1, limit: number = 10) {
    return apiClient.get("/users/listings", { page, limit });
  }

  static async updateListingStatus(listingId: string, status: string) {
    return apiClient.put(`/listings/${listingId}/status`, { status });
  }

  static async getListingBuyers(listingId: string): Promise<User[]> {
    return apiClient.get<User[]>(`/listings/${listingId}/buyers`);
  }

  static async markAsSold(
    listingId: string,
    data: {
      buyerId: string;
      amount: number;
      paymentMethod: string;
      paymentReference?: string;
      notes?: string;
    }
  ): Promise<{ listing: ListingDetail; transaction: any }> {
    return apiClient.post(`/listings/${listingId}/mark-as-sold`, data);
  }
}

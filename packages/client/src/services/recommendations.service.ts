import { apiClient } from "../lib/api";
import type { ListingDetail } from "../types";

export interface RecommendationListing extends ListingDetail {
  recommendationScore?: number;
  recommendationReason?: string;
}

export interface SimilarListing extends ListingDetail {
  similarityScore?: number;
  similarityReason?: string;
}

export interface RecommendationsResponse {
  recommendations: RecommendationListing[];
  count: number;
}

export interface SimilarListingsResponse {
  similar: SimilarListing[];
  count: number;
}

export class RecommendationsService {
  /**
   * Get recommendations for the current user
   */
  static async getRecommendations(
    limit: number = 10,
    refresh: boolean = false
  ): Promise<RecommendationsResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      refresh: refresh.toString(),
    });
    
    const response = await apiClient.get(
      `/recommendations?${params.toString()}`
    );
    return response as RecommendationsResponse;
  }

  /**
   * Get similar listings to a specific listing
   */
  static async getSimilarListings(
    listingId: string,
    limit: number = 10
  ): Promise<SimilarListingsResponse> {
    const response = await apiClient.get(
      `/recommendations/similar/${listingId}?limit=${limit}`
    );
    return response as SimilarListingsResponse;
  }

  /**
   * Refresh recommendations for the current user
   */
  static async refreshRecommendations(): Promise<RecommendationsResponse> {
    const response = await apiClient.post(`/recommendations/refresh`);
    return response as RecommendationsResponse;
  }
}


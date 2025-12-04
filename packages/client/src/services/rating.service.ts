import { apiClient } from '../lib/api';
import type {
  SellerRating,
  RatingStats,
  CreateRatingRequest,
  UpdateRatingRequest,
  RatingQueryParams,
  RatingsResponse,
} from '../types';

export class RatingService {
  // Create a new rating
  static async createRating(data: CreateRatingRequest): Promise<SellerRating> {
    const response = await apiClient.post<SellerRating>('/ratings', data);
    return response;
  }

  // Get ratings for a seller
  static async getSellerRatings(
    sellerId: string,
    params?: RatingQueryParams
  ): Promise<RatingsResponse> {
    const response = await apiClient.get<RatingsResponse>(`/ratings/seller/${sellerId}`, params);
    return response;
  }

  // Get rating statistics for a seller
  static async getSellerRatingStats(sellerId: string): Promise<RatingStats> {
    const response = await apiClient.get<RatingStats>(`/ratings/seller/${sellerId}/stats`);
    return response;
  }

  // Get a specific rating
  static async getRating(ratingId: string): Promise<SellerRating> {
    const response = await apiClient.get<SellerRating>(`/ratings/${ratingId}`);
    return response;
  }

  // Update a rating
  static async updateRating(
    ratingId: string,
    data: UpdateRatingRequest
  ): Promise<SellerRating> {
    const response = await apiClient.put<SellerRating>(`/ratings/${ratingId}`, data);
    return response;
  }

  // Delete a rating
  static async deleteRating(ratingId: string): Promise<void> {
    await apiClient.delete(`/ratings/${ratingId}`);
  }
}


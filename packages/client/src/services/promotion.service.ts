import { apiClient } from "../lib/api";
import type {
  PromotionPricing,
  ListingPromotion,
  CreatePromotionRequest,
  CreatePromotionResponse,
} from "../types";

export class PromotionService {
  static async getPricing(): Promise<PromotionPricing[]> {
    return apiClient.get<PromotionPricing[]>("/promotions/pricing");
  }

  static async createPromotion(
    listingId: string,
    packageType: string
  ): Promise<CreatePromotionResponse> {
    const data: CreatePromotionRequest = {
      listingId,
      packageType: packageType as any,
    };
    return apiClient.post<CreatePromotionResponse>("/promotions", data);
  }

  static async getMyPromotions(): Promise<ListingPromotion[]> {
    return apiClient.get<ListingPromotion[]>("/promotions/my-promotions");
  }

  static async getPromotionDetails(
    promotionId: string
  ): Promise<ListingPromotion> {
    return apiClient.get<ListingPromotion>(`/promotions/details/${promotionId}`);
  }

  static async activatePromotion(
    promotionId: string
  ): Promise<ListingPromotion> {
    return apiClient.post<ListingPromotion>(`/promotions/${promotionId}/activate`);
  }

  static async createPaymentUrl(
    promotionId: string
  ): Promise<{ paymentUrl: string }> {
    return apiClient.post<{ paymentUrl: string }>(`/payment/create/${promotionId}`);
  }
}


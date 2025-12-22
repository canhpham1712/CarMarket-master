import { apiClient } from "../lib/api";

export interface ValuationRequest {
  brand: string;
  model: string;
  year: number;
  mileage_km: number;
  version?: string;
  color?: string;
}

export interface ValuationResponse {
  price_estimate: number;
  price_min: number;
  price_max: number;
  confidence_level: string;
  mae_estimate: number;
}

export class ValuationService {
  /**
   * Estimate car price based on car details
   */
  static async estimatePrice(
    request: ValuationRequest
  ): Promise<ValuationResponse> {
    return apiClient.post<ValuationResponse>("/valuation", request);
  }
}

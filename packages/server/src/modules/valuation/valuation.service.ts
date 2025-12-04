import { Injectable } from '@nestjs/common';
import axios from 'axios';

interface ValuationPayload {
  brand: string;
  model: string;
  year: number;
  mileage_km: number;
  version?: string;
  color?: string;
}

@Injectable()
export class ValuationService {
  // URL service định giá Python (FastAPI)
  private readonly valuationServiceUrl =
    process.env.VALUATION_SERVICE_URL ?? 'http://127.0.0.1:8001';

  async estimatePrice(payload: ValuationPayload) {
    const url = `${this.valuationServiceUrl}/predict`;
    console.log(`[ValuationService] Calling FastAPI at: ${url}`);
    console.log(`[ValuationService] Payload:`, payload);
    try {
      const response = await axios.post(url, payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log(`[ValuationService] Response received:`, response.status);
      return response.data;
    } catch (error) {
      console.error(`[ValuationService] Error details:`, {
        url,
        code: axios.isAxiosError(error) ? error.code : 'unknown',
        message: error instanceof Error ? error.message : String(error),
        response: axios.isAxiosError(error) && error.response
          ? {
              status: error.response.status,
              data: error.response.data,
            }
          : null,
      });
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
          throw new Error(
            `Cannot connect to valuation service at ${this.valuationServiceUrl}. Please ensure the FastAPI service is running on port 8001.`,
          );
        }
        if (error.response) {
          throw new Error(
            `Valuation service error: ${error.response.status} - ${JSON.stringify(error.response.data)}`,
          );
        }
        throw new Error(`Network error: ${error.message}`);
      }
      throw error;
    }
  }
}





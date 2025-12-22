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
    
    // Retry logic for Render free tier (service might be sleeping)
    const maxRetries = 2;
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // First attempt: normal timeout
        // Retry attempts: longer timeout to allow service to wake up
        const timeout = attempt === 0 ? 10000 : 30000;
        
        if (attempt > 0) {
          console.log(`[ValuationService] Retry attempt ${attempt}/${maxRetries} with longer timeout...`);
          // Wait a bit before retry to allow service to wake up
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        const response = await axios.post(url, payload, {
          timeout,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        console.log(`[ValuationService] Response received:`, response.status);
        return response.data;
      } catch (error) {
        lastError = error;
        // If it's a connection error and we have retries left, continue loop
        if (axios.isAxiosError(error)) {
          const isConnectionError = 
            error.code === 'ECONNREFUSED' || 
            error.code === 'ECONNRESET' ||
            error.code === 'ETIMEDOUT' ||
            (error.response && error.response.status >= 500);
          
          if (isConnectionError && attempt < maxRetries) {
            console.log(`[ValuationService] Connection error, will retry...`);
            continue;
          }
        }
        
        // If we've exhausted retries or it's not a retryable error, break
        break;
      }
    }
    
    // Handle final error after all retries
    console.error(`[ValuationService] Error details after ${maxRetries + 1} attempts:`, {
      url,
      code: axios.isAxiosError(lastError) ? lastError.code : 'unknown',
      message: lastError instanceof Error ? lastError.message : String(lastError),
      response: axios.isAxiosError(lastError) && lastError.response
        ? {
            status: lastError.response.status,
            data: lastError.response.data,
          }
        : null,
    });
    
    if (axios.isAxiosError(lastError)) {
      if (lastError.code === 'ECONNREFUSED' || lastError.code === 'ECONNRESET') {
        throw new Error(
          `Cannot connect to valuation service at ${this.valuationServiceUrl}. The service might be sleeping (free tier) or not running. Please try again in a few seconds.`,
        );
      }
      if (lastError.code === 'ETIMEDOUT') {
        throw new Error(
          `Valuation service timeout. The service might be waking up from sleep. Please try again.`,
        );
      }
      if (lastError.response) {
        throw new Error(
          `Valuation service error: ${lastError.response.status} - ${JSON.stringify(lastError.response.data)}`,
        );
      }
      throw new Error(`Network error: ${lastError.message}`);
    }
    throw lastError;
  }
}





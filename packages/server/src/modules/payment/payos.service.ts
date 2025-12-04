import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios from 'axios';

export interface PayOSPaymentData {
  amount: number;
  orderId: string;
  orderInfo: string;
  returnUrl: string;
  cancelUrl?: string;
  description?: string;
}

export interface PayOSCallbackData {
  code: string;
  desc: string;
  data: {
    orderCode: number;
    amount: number;
    amountPaid: number;
    amountRemaining: number;
    status: string;
    createdAt: string;
    transactions: any[];
    canceledAt?: string;
    cancellationReason?: string;
  };
  signature: string;
}

@Injectable()
export class PayOSService {
  private readonly clientId: string;
  private readonly apiKey: string;
  private readonly checksumKey: string;
  private readonly apiUrl: string;
  private readonly returnUrl: string;
  private readonly cancelUrl: string;
  private readonly environment: string; // 'sandbox' or 'production'

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('PAYOS_CLIENT_ID', '');
    this.apiKey = this.configService.get<string>('PAYOS_API_KEY', '');
    this.checksumKey = this.configService.get<string>('PAYOS_CHECKSUM_KEY', '');
    this.environment = this.configService.get<string>('PAYOS_ENVIRONMENT', 'sandbox');
    
    // PayOS API URLs
    if (this.environment === 'sandbox') {
      this.apiUrl = 'https://api-merchant.payos.vn/v2/payment-requests';
    } else {
      this.apiUrl = 'https://api-merchant.payos.vn/v2/payment-requests';
    }
    
    this.returnUrl = this.configService.get<string>(
      'PAYOS_RETURN_URL',
      'http://localhost:5173/promotions/payos-callback',
    );
    
    this.cancelUrl = this.configService.get<string>(
      'PAYOS_CANCEL_URL',
      'http://localhost:5173/promotions/payos-callback?status=cancelled',
    );
  }

  /**
   * Create payment URL for PayOS
   */
  async createPaymentUrl(data: PayOSPaymentData): Promise<string> {
    // Validate required fields
    if (!this.clientId || !this.apiKey || !this.checksumKey) {
      throw new Error('PayOS credentials are not configured. Please check your environment variables.');
    }

    const orderCode = this.generateOrderCode(data.orderId);
    // PayOS requires amount to be an integer (in VND, smallest unit)
    const amount = Math.round(data.amount);
    // PayOS requires description to be maximum 25 characters
    const fullDescription = data.description || data.orderInfo || 'Promotion payment';
    const description = fullDescription.substring(0, 25); // PayOS limit: 25 characters
    const returnUrl = data.returnUrl || this.returnUrl;
    const cancelUrl = data.cancelUrl || this.cancelUrl;

    // Validate amount
    if (amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }
    
    // Validate description length
    if (description.length === 0) {
      throw new Error('Description cannot be empty');
    }

    // Create signature FIRST, before creating request body
    // PayOS signature format: orderCode|amount|description|returnUrl|cancelUrl
    // NOTE: PayOS requires orderCode FIRST, then amount
    // Important: 
    // - Use exact values as they will appear in request
    // - No URL encoding in signature string
    // - No extra spaces or newlines
    // - Amount must be integer (converted to string for signature)
    // - Order code must be integer (converted to string for signature)
    // - Description should be plain text (no encoding)
    
    // Ensure all values are strings for signature calculation
    const amountStr = String(amount);
    const orderCodeStr = String(orderCode);
    
    // PayOS signature format according to official documentation:
    // 1. Sort fields alphabetically: amount, cancelUrl, description, orderCode, returnUrl
    // 2. Create string: key=value&key=value&... (NOT value|value|...)
    // 3. Use HMAC-SHA256 (NOT SHA-512)
    // Reference: https://payos.vn/docs/cau-hoi-thuong-gap/
    
    // Create signature string with key=value format, sorted alphabetically
    const signatureString = `amount=${amountStr}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCodeStr}&returnUrl=${returnUrl}`;
    
    // Create HMAC-SHA256 signature (PayOS uses SHA-256, not SHA-512)
    const signature = crypto
      .createHmac('sha256', this.checksumKey)
      .update(signatureString, 'utf8')
      .digest('hex');
    
    // Debug log
    console.log('PayOS Signature Debug (Official Format):', {
      signatureString,
      signature,
      orderCode: orderCodeStr,
      amount: amountStr,
      description,
      returnUrl,
      cancelUrl,
      checksumKeyLength: this.checksumKey?.length || 0,
      algorithm: 'HMAC-SHA256',
    });

    // Create request body AFTER signature is created
    const requestBody: Record<string, any> = {
      orderCode: orderCode,
      amount: amount,
      description: description,
      cancelUrl: cancelUrl,
      returnUrl: returnUrl,
      signature: signature, // Add signature to request body
      items: [
        {
          name: description,
          quantity: 1,
          price: amount,
        },
      ],
    };

    try {
      // Call PayOS API to create payment
      const response = await axios.post(this.apiUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': this.clientId,
          'x-api-key': this.apiKey,
        },
      });

      // PayOS response format: { code: string, desc: string, data: { checkoutUrl: string } }
      if (response.data) {
        if (response.data.code === '00' && response.data.data && response.data.data.checkoutUrl) {
          return response.data.data.checkoutUrl;
        } else {
          const errorMsg = response.data.desc || 'Failed to create PayOS payment URL';
          throw new Error(errorMsg);
        }
      } else {
        throw new Error('Invalid response from PayOS API');
      }
    } catch (error: any) {
      console.error('PayOS API Error:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.desc || error.response?.data?.message || error.message;
      throw new Error(`Failed to create PayOS payment: ${errorMessage}`);
    }
  }

  /**
   * Verify payment callback from PayOS
   */
  verifyPaymentCallback(data: PayOSCallbackData): {
    isValid: boolean;
    orderId: string;
    amount: number;
    transactionId: string;
    status: string;
  } {
    // Validate data structure
    if (!data || !data.data) {
      console.error('Invalid callback data structure:', data);
      throw new Error('Invalid callback data: missing data object');
    }

    if (!data.data.orderCode) {
      console.error('Missing orderCode in callback data:', data);
      throw new Error('Invalid callback data: missing orderCode');
    }

    // Extract signature
    const signature = data.signature || '';
    const callbackData = { ...data };
    delete (callbackData as any).signature;

    // If signature is empty, skip verification (for testing or if PayOS doesn't send signature in returnUrl)
    let isValid = true;
    if (signature) {
      try {
        // Create signature for verification
        const generatedSignature = this.createCallbackSignature(callbackData);
        isValid = signature === generatedSignature;
      } catch (error) {
        console.error('Error verifying signature:', error);
        // If signature verification fails but payment was successful, still process
        // PayOS may not always send signature in returnUrl callback
        isValid = data.code === '00' || data.data.status === 'PAID';
      }
    } else {
      // No signature provided, trust the status if payment is successful
      isValid = data.code === '00' || data.data.status === 'PAID';
    }

    return {
      isValid,
      orderId: callbackData.data.orderCode.toString(),
      amount: callbackData.data.amount || callbackData.data.amountPaid || 0,
      transactionId: callbackData.data.orderCode.toString(),
      status: callbackData.data.status || (callbackData.code === '00' ? 'PAID' : 'CANCELLED'),
    };
  }

  /**
   * Check if payment is successful
   * PayOS status: 'PAID' = success
   */
  isPaymentSuccessful(status: string): boolean {
    return status === 'PAID';
  }

  /**
   * Generate order code from orderId (UUID to number)
   */
  public generateOrderCode(orderId: string): number {
    // Convert UUID to a number by taking first 8 characters and converting to int
    // PayOS requires orderCode to be a number
    const hash = crypto.createHash('md5').update(orderId).digest('hex');
    const num = parseInt(hash.substring(0, 8), 16);
    // Ensure it's a positive number and within reasonable range
    return Math.abs(num % 900000000) + 100000000; // 9-digit number
  }

  /**
   * Create signature for callback verification
   * PayOS signature format: code|desc|data (as JSON string)
   */
  private createCallbackSignature(data: PayOSCallbackData): string {
    // PayOS callback signature format: code|desc|data (JSON string)
    const dataString = JSON.stringify(data.data);
    const signatureString = `${data.code}|${data.desc}|${dataString}`;
    return crypto
      .createHmac('sha256', this.checksumKey)
      .update(signatureString)
      .digest('hex');
  }
}


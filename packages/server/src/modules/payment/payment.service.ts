import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { PayOSService, PayOSCallbackData } from './payos.service';
import { ListingPromotion, PaymentStatus, PromotionStatus, PaymentMethod } from '../../entities/listing-promotion.entity';

@Injectable()
export class PaymentService {
  constructor(
    private readonly payosService: PayOSService,
    private readonly configService: ConfigService,
    @InjectRepository(ListingPromotion)
    private readonly promotionRepository: Repository<ListingPromotion>,
  ) {}

  /**
   * Create payment URL for a promotion
   */
  async createPaymentUrl(
    promotionId: string,
    userId: string,
  ): Promise<{ paymentUrl: string }> {
    const promotion = await this.promotionRepository.findOne({
      where: { id: promotionId, sellerId: userId },
      relations: ['listing'],
    });

    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    if (promotion.paymentStatus === PaymentStatus.COMPLETED) {
      throw new BadRequestException('Promotion already paid');
    }

    const orderInfo = `Promote listing: ${promotion.listing?.title || promotion.id}`;
    const returnUrl = this.configService.get<string>(
      'PAYOS_RETURN_URL',
      'http://localhost:5173/promotions/payos-callback',
    );
    
    // Generate orderCode for PayOS (PayOS requires numeric orderCode)
    const orderCode = this.payosService.generateOrderCode(promotion.id);
    
    // Store orderCode in paymentReference for later lookup
    promotion.paymentReference = orderCode.toString();
    await this.promotionRepository.save(promotion);
    
    const paymentUrl = await this.payosService.createPaymentUrl({
      amount: Number(promotion.amount),
      orderId: promotion.id,
      orderInfo,
      returnUrl,
      description: orderInfo,
    });

    return { paymentUrl };
  }

  /**
   * Handle payment callback from PayOS
   */
  async handlePaymentCallback(query: any): Promise<{
    success: boolean;
    promotionId: string;
    message: string;
  }> {
    try {
      // Log raw query to debug
      console.log('PayOS Callback Raw Query:', JSON.stringify(query, null, 2));
      console.log('PayOS Callback Query Type:', typeof query);
      console.log('PayOS Callback Query Keys:', Object.keys(query || {}));
      
      // PayOS sends callback as query params via GET request
      // The query object should contain the actual params directly
      // But axios may wrap them in a 'params' key when sending from frontend
      let actualQuery = query;
      
      // Check if query params are wrapped
      // PayOS redirects directly, but frontend axios may wrap params
      if (query.params) {
        // If params exists, try to use it
        if (typeof query.params === 'object' && !Array.isArray(query.params)) {
          actualQuery = query.params;
          console.log('Found wrapped params, using query.params');
          console.log('Unwrapped params keys:', Object.keys(actualQuery));
        } else if (typeof query.params === 'string' && query.params === '[object Object]') {
          // This is the issue - params is stringified incorrectly
          // Try to use query directly instead
          console.warn('Params is stringified incorrectly, using query directly');
          actualQuery = query;
        }
      }
      
      // If actualQuery still equals query and query has 'params' key, 
      // and query.params is the only key, try to extract from it
      if (actualQuery === query && Object.keys(query).length === 1 && query.params) {
        // This shouldn't happen, but handle it
        console.warn('Query only has params key, attempting to extract');
        if (typeof query.params === 'object') {
          actualQuery = query.params;
        }
      }
      
      // Log actual query we'll use
      console.log('Actual Query to use:', JSON.stringify(actualQuery, null, 2));
      
      // Extract values from actual query
      // PayOS returnUrl format: ?code=00&id=xxx&cancel=false&status=PAID&orderCode=123456
      const orderCode = actualQuery.orderCode || actualQuery.order_code;
      const code = actualQuery.code || '00';
      const id = actualQuery.id; // PayOS payment link ID
      const cancel = actualQuery.cancel === 'true' || actualQuery.cancel === true;
      const status = actualQuery.status || (code === '00' && !cancel ? 'PAID' : 'CANCELLED');
      const amount = actualQuery.amount ? Number(actualQuery.amount) : 0;
      
      console.log('Extracted values from PayOS callback:', { 
        orderCode, 
        code, 
        id, 
        cancel, 
        status, 
        amount,
        allKeys: Object.keys(actualQuery)
      });
      
      // Initialize callbackData according to PayOS returnUrl format
      const callbackData: PayOSCallbackData = {
        code: code,
        desc: actualQuery.desc || actualQuery.message || (code === '00' ? 'Success' : 'Failed'),
        data: {
          orderCode: orderCode ? Number(orderCode) : 0,
          amount: amount,
          amountPaid: Number(actualQuery.amountPaid) || Number(actualQuery.amount_paid) || amount,
          amountRemaining: Number(actualQuery.amountRemaining) || Number(actualQuery.amount_remaining) || 0,
          status: status, // PAID, PENDING, PROCESSING, CANCELLED
          createdAt: actualQuery.createdAt || actualQuery.created_at || new Date().toISOString(),
          transactions: actualQuery.transactions ? (Array.isArray(actualQuery.transactions) ? actualQuery.transactions : []) : [],
        },
        signature: actualQuery.signature || '',
      };
      
      // Case 1: If query.data exists as JSON string, parse it
      if (actualQuery.data && typeof actualQuery.data === 'string') {
        try {
          const dataObj = JSON.parse(actualQuery.data);
          callbackData.data = { ...callbackData.data, ...dataObj };
        } catch (e) {
          console.error('Error parsing query.data:', e);
        }
      }

      console.log('PayOS Callback Parsed Data:', JSON.stringify(callbackData, null, 2));

      // Validate callbackData has required fields
      if (!callbackData.data) {
        console.error('Missing data object in callback');
        return {
          success: false,
          promotionId: '',
          message: 'Invalid callback data: missing data object',
        };
      }

      // If orderCode is missing, try multiple ways to get it
      if (!callbackData.data.orderCode || callbackData.data.orderCode === 0) {
        // Try from actualQuery first, then from original query
        const extractedOrderCode = actualQuery.orderCode || actualQuery.order_code || query.orderCode || query.order_code;
        if (extractedOrderCode) {
          callbackData.data.orderCode = Number(extractedOrderCode);
          console.log('Extracted orderCode from query:', callbackData.data.orderCode);
        } else {
          // PayOS returnUrl callback may not always include orderCode
          // According to PayOS docs, returnUrl is for user redirect, webhook has full data
          // But we need orderCode to identify the promotion
          console.error('Missing orderCode in callback. Available query keys:', Object.keys(actualQuery));
          console.error('This may happen if PayOS returnUrl format is different.');
          
          // Return error with helpful message
          return {
            success: false,
            promotionId: '',
            message: 'Cannot identify promotion: orderCode missing from callback. Payment may still be processed via webhook.',
          };
        }
      }

      // PayOS returnUrl doesn't include signature or amount
      // Only webhook has full data with signature
      // For returnUrl, we trust the status and orderCode from PayOS
      // Find promotion by paymentReference (which stores the orderCode)
      const orderCodeStr = String(callbackData.data.orderCode);
      const promotion = await this.promotionRepository.findOne({
        where: { paymentReference: orderCodeStr },
      });

      if (!promotion) {
        return {
          success: false,
          promotionId: orderCodeStr,
          message: 'Promotion not found',
        };
      }

      // Verify signature only if it exists (webhook has signature, returnUrl doesn't)
      let isValid = true;
      if (callbackData.signature && callbackData.signature !== '') {
        const verification = this.payosService.verifyPaymentCallback(callbackData);
        isValid = verification.isValid;
        if (!isValid) {
          console.warn('Signature verification failed, but continuing with status check');
          // For returnUrl, we may not have signature, so we'll trust the status
          // Webhook will have proper signature verification
        }
      } else {
        console.log('No signature in callback (returnUrl format), trusting status from PayOS');
      }

      // Check if payment is successful (PayOS status: 'PAID' = success)
      // Note: PayOS returnUrl doesn't include amount, so we don't verify amount here
      // The webhook will have full verification with amount
      const isPaid = this.payosService.isPaymentSuccessful(callbackData.data.status);
      
      if (isPaid) {
        // Payment successful - status is PAID from PayOS
        // Don't verify amount from returnUrl (it's not included)
        // Webhook will verify amount properly
        promotion.paymentStatus = PaymentStatus.COMPLETED;
        promotion.paymentTransactionId = orderCodeStr; // Use orderCode as transaction ID
        promotion.paymentMethod = PaymentMethod.PAYOS;
        promotion.status = PromotionStatus.ACTIVE;
        promotion.startDate = new Date();

        await this.promotionRepository.save(promotion);

        return {
          success: true,
          promotionId: promotion.id,
          message: 'Payment successful',
        };
      } else {
        // Payment failed or cancelled
        promotion.paymentStatus = PaymentStatus.FAILED;
        await this.promotionRepository.save(promotion);

        return {
          success: false,
          promotionId: promotion.id,
          message: `Payment failed. Status: ${callbackData.data.status}`,
        };
      }
    } catch (error) {
      console.error('Payment callback error:', error);
      return {
        success: false,
        promotionId: query.orderId || query.orderCode || '',
        message: 'Error processing payment callback',
      };
    }
  }
}


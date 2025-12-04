import {
  Controller,
  Post,
  Get,
  Query,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create/:promotionId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create payment URL for promotion' })
  @ApiResponse({ status: 200, description: 'Payment URL created successfully' })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  async createPayment(
    @CurrentUser() user: User,
    @Param('promotionId') promotionId: string,
  ) {
    return this.paymentService.createPaymentUrl(promotionId, user.id);
  }

  @Get('callback')
  @ApiOperation({ summary: 'Handle payment callback from PayOS' })
  @ApiResponse({ status: 200, description: 'Payment callback processed' })
  async handleCallback(@Query() query: any, @Req() req: Request) {
    // PayOS redirects directly to this URL with query params
    // Format: ?code=00&id=xxx&cancel=false&status=PAID&orderCode=123456
    // NestJS @Query() should parse these automatically
    
    // Log both @Query() result and raw URL query string
    console.log('PaymentController - @Query() result:', query);
    console.log('PaymentController - Query Keys:', Object.keys(query || {}));
    console.log('PaymentController - Raw URL:', req.url);
    console.log('PaymentController - Query String:', req.url.split('?')[1] || '');
    
    // If query has 'params' key with '[object Object]', it means params weren't parsed correctly
    // Try to parse from URL directly
    let actualQuery = query;
    if (query.params && String(query.params) === '[object Object]') {
      // Parse query string from URL manually
      const queryString = req.url.split('?')[1] || '';
      if (queryString) {
        const parsedParams: Record<string, string> = {};
        queryString.split('&').forEach(param => {
          const [key, value] = param.split('=');
          if (key && value) {
            parsedParams[decodeURIComponent(key)] = decodeURIComponent(value);
          }
        });
        actualQuery = parsedParams;
        console.log('PaymentController - Manually parsed query:', actualQuery);
      }
    }
    
    const result = await this.paymentService.handlePaymentCallback(actualQuery);
    // Return result as JSON for frontend
    return result;
  }
}


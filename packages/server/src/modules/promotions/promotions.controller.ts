import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

@ApiTags('Promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get('pricing')
  @ApiOperation({ summary: 'Get pricing for all promotion packages' })
  @ApiResponse({ status: 200, description: 'Pricing retrieved successfully' })
  async getPricing() {
    return this.promotionsService.getPricing();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a promotion request' })
  @ApiResponse({ status: 201, description: 'Promotion request created successfully' })
  @ApiResponse({ status: 404, description: 'Listing or package not found' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createPromotion(
    @CurrentUser() user: User,
    @Body() createPromotionDto: CreatePromotionDto,
  ) {
    return this.promotionsService.createPromotionRequest(
      createPromotionDto.listingId,
      createPromotionDto.packageType,
      user.id,
    );
  }

  @Get('my-promotions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get promotions for current user' })
  @ApiResponse({ status: 200, description: 'Promotions retrieved successfully' })
  async getMyPromotions(@CurrentUser() user: User) {
    return this.promotionsService.getMyPromotions(user.id);
  }

  @Get('details/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get promotion details by ID' })
  @ApiResponse({ status: 200, description: 'Promotion retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  async getPromotionDetails(
    @Param('id') id: string,
    @CurrentUser() user?: User,
  ) {
    return this.promotionsService.getPromotionDetails(id, user?.id);
  }

  @Post('payment/callback')
  @ApiOperation({ summary: 'Handle payment callback from payment gateway' })
  @ApiResponse({ status: 200, description: 'Payment callback processed' })
  async handlePaymentCallback(
    @Query('promotionId') promotionId: string,
    @Body() paymentData: {
      transactionId: string;
      status: 'success' | 'failed';
      paymentMethod: string;
    },
  ) {
    return this.promotionsService.handlePaymentCallback(promotionId, paymentData);
  }

  @Post(':id/activate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Activate a promotion after payment' })
  @ApiResponse({ status: 200, description: 'Promotion activated successfully' })
  @ApiResponse({ status: 404, description: 'Promotion not found' })
  async activatePromotion(
    @Param('id') id: string,
  ) {
    return this.promotionsService.activatePromotion(id);
  }
}


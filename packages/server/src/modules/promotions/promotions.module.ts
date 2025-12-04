import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { ListingPromotion } from '../../entities/listing-promotion.entity';
import { PromotionPricing } from '../../entities/promotion-pricing.entity';
import { ListingDetail } from '../../entities/listing-detail.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ListingPromotion,
      PromotionPricing,
      ListingDetail,
    ]),
  ],
  controllers: [PromotionsController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}


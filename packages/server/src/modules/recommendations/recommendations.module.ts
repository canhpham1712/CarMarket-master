import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { UserRecommendation } from '../../entities/user-recommendation.entity';
import { UserSearchHistory } from '../../entities/user-search-history.entity';
import { UserViewHistory } from '../../entities/user-view-history.entity';
import { ListingDetail } from '../../entities/listing-detail.entity';
import { CarDetail } from '../../entities/car-detail.entity';
import { Favorite } from '../../entities/favorite.entity';
import { User } from '../../entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserRecommendation,
      UserSearchHistory,
      UserViewHistory,
      ListingDetail,
      CarDetail,
      Favorite,
      User,
    ]),
  ],
  controllers: [RecommendationsController],
  providers: [RecommendationsService],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}


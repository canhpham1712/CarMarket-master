import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { RecommendationQueryDto } from './dto/recommendation-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get()
  async getRecommendations(
    @CurrentUser() user: User,
    @Query() query: RecommendationQueryDto,
  ) {
    const limit = query.limit || 3;
    const refresh = query.refresh || false;

    const recommendations = await this.recommendationsService.getRecommendations(
      user.id,
      limit,
      refresh,
    );

    return {
      recommendations: recommendations.map((rec) => ({
        ...rec.listing,
        recommendationScore: rec.score,
        recommendationReason: rec.reason,
      })),
      count: recommendations.length,
    };
  }

  @Get('similar/:listingId')
  async getSimilarListings(
    @Param('listingId') listingId: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
  ) {
    const similar = await this.recommendationsService.getSimilarListings(
      listingId,
      limit,
    );

    return {
      similar: similar.map((rec) => ({
        ...rec.listing,
        similarityScore: rec.score,
        similarityReason: rec.reason,
      })),
      count: similar.length,
    };
  }

  @Post('refresh')
  async refreshRecommendations(@CurrentUser() user: User) {
    await this.recommendationsService.invalidateUserCache(user.id);
    const recommendations = await this.recommendationsService.getRecommendations(
      user.id,
      3,
      true,
    );

    return {
      message: 'Recommendations refreshed successfully',
      recommendations: recommendations.map((rec) => ({
        ...rec.listing,
        recommendationScore: rec.score,
        recommendationReason: rec.reason,
      })),
      count: recommendations.length,
    };
  }
}


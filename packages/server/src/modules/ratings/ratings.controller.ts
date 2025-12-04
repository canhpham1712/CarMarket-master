import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';
import { RatingQueryDto } from './dto/rating-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

@ApiTags('Ratings')
@Controller('ratings')
export class RatingsController {
  constructor(private readonly ratingsService: RatingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a rating for a seller' })
  @ApiResponse({ status: 201, description: 'Rating created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Seller or transaction not found' })
  async createRating(
    @CurrentUser() user: User,
    @Body() createRatingDto: CreateRatingDto,
  ) {
    return this.ratingsService.createRating(user.id, createRatingDto);
  }

  @Get('seller/:sellerId')
  @ApiOperation({ summary: 'Get all ratings for a seller' })
  @ApiResponse({ status: 200, description: 'Ratings retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async getSellerRatings(
    @Param('sellerId', ParseUUIDPipe) sellerId: string,
    @Query() query: RatingQueryDto,
  ) {
    return this.ratingsService.getSellerRatings(sellerId, query);
  }

  @Get('seller/:sellerId/stats')
  @ApiOperation({ summary: 'Get rating statistics for a seller' })
  @ApiResponse({ status: 200, description: 'Rating statistics retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async getSellerRatingStats(@Param('sellerId', ParseUUIDPipe) sellerId: string) {
    return this.ratingsService.getSellerRatingStats(sellerId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific rating' })
  @ApiResponse({ status: 200, description: 'Rating retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Rating not found' })
  async getRating(@Param('id', ParseUUIDPipe) ratingId: string) {
    return this.ratingsService.getRatingById(ratingId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a rating' })
  @ApiResponse({ status: 200, description: 'Rating updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Rating not found' })
  async updateRating(
    @Param('id', ParseUUIDPipe) ratingId: string,
    @CurrentUser() user: User,
    @Body() updateRatingDto: UpdateRatingDto,
  ) {
    return this.ratingsService.updateRating(ratingId, user.id, updateRatingDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a rating' })
  @ApiResponse({ status: 200, description: 'Rating deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Rating not found' })
  async deleteRating(
    @Param('id', ParseUUIDPipe) ratingId: string,
    @CurrentUser() user: User,
  ) {
    return this.ratingsService.deleteRating(ratingId, user.id);
  }
}


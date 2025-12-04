import {
  Injectable,
  ConflictException,
  NotFoundException,
  Inject,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from '../../entities/favorite.entity';
import { ListingDetail } from '../../entities/listing-detail.entity';
import { RecommendationsService } from '../recommendations/recommendations.service';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(ListingDetail)
    private readonly listingRepository: Repository<ListingDetail>,
    @Optional() @Inject(RecommendationsService)
    private readonly recommendationsService?: RecommendationsService,
  ) {}

  async addToFavorites(
    userId: string,
    listingId: string,
  ): Promise<{ message: string }> {
    // Check if listing exists
    const listing = await this.listingRepository.findOne({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Check if already favorited
    const existingFavorite = await this.favoriteRepository.findOne({
      where: { userId, listingId },
    });

    if (existingFavorite) {
      throw new ConflictException('Listing already in favorites');
    }

    // Add to favorites
    const favorite = this.favoriteRepository.create({
      userId,
      listingId,
    });

    await this.favoriteRepository.save(favorite);

    // Update favorite count
    await this.listingRepository.update(listingId, {
      favoriteCount: listing.favoriteCount + 1,
    });

    // Invalidate recommendations cache
    if (this.recommendationsService) {
      this.recommendationsService.invalidateUserCache(userId).catch((err) => {
        // Log but don't fail the request
        console.error('Failed to invalidate recommendations cache:', err);
      });
    }

    return { message: 'Added to favorites successfully' };
  }

  async removeFromFavorites(
    userId: string,
    listingId: string,
  ): Promise<{ message: string }> {
    const favorite = await this.favoriteRepository.findOne({
      where: { userId, listingId },
    });

    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }

    await this.favoriteRepository.remove(favorite);

    // Update favorite count
    const listing = await this.listingRepository.findOne({
      where: { id: listingId },
    });

    if (listing) {
      await this.listingRepository.update(listingId, {
        favoriteCount: Math.max(0, listing.favoriteCount - 1),
      });
    }

    // Invalidate recommendations cache
    if (this.recommendationsService) {
      this.recommendationsService.invalidateUserCache(userId).catch((err) => {
        // Log but don't fail the request
        console.error('Failed to invalidate recommendations cache:', err);
      });
    }

    return { message: 'Removed from favorites successfully' };
  }

  async getUserFavorites(userId: string, page: number = 1, limit: number = 10) {
    const [favorites, total] = await this.favoriteRepository.findAndCount({
      where: { userId },
      relations: [
        'listing',
        'listing.carDetail',
        'listing.carDetail.images',
        'listing.seller',
      ],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      favorites: favorites.map((fav) => fav.listing),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async checkIfFavorite(
    userId: string,
    listingId: string,
  ): Promise<{ isFavorite: boolean }> {
    const favorite = await this.favoriteRepository.findOne({
      where: { userId, listingId },
    });

    return { isFavorite: !!favorite };
  }
}

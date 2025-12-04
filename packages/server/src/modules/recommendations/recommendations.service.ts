import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, MoreThan } from 'typeorm';
import { UserRecommendation } from '../../entities/user-recommendation.entity';
import { UserSearchHistory } from '../../entities/user-search-history.entity';
import { UserViewHistory, ViewAction } from '../../entities/user-view-history.entity';
import { ListingDetail, ListingStatus } from '../../entities/listing-detail.entity';
import { CarDetail } from '../../entities/car-detail.entity';
import { Favorite } from '../../entities/favorite.entity';
import { User } from '../../entities/user.entity';

interface RecommendationResult {
  listing: ListingDetail;
  score: number;
  reason: string;
}

interface ScoringWeights {
  contentBased: number;
  location: number;
  popularity: number;
  priceAffinity: number;
}

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);
  private readonly defaultWeights: ScoringWeights = {
    contentBased: 0.7, // Tăng trọng số cho content-based (make/model/body type)
    location: 0.1,
    popularity: 0.1,
    priceAffinity: 0.1,
  };

  constructor(
    @InjectRepository(UserRecommendation)
    private readonly recommendationRepository: Repository<UserRecommendation>,
    @InjectRepository(UserSearchHistory)
    private readonly searchHistoryRepository: Repository<UserSearchHistory>,
    @InjectRepository(UserViewHistory)
    private readonly viewHistoryRepository: Repository<UserViewHistory>,
    @InjectRepository(ListingDetail)
    private readonly listingRepository: Repository<ListingDetail>,
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Get recommendations for a user
   */
  async getRecommendations(
    userId: string,
    limit: number = 3,
    refresh: boolean = false,
  ): Promise<RecommendationResult[]> {
    // Check cache first if not refreshing
    if (!refresh) {
      const cached = await this.getCachedRecommendations(userId, limit);
      if (cached.length > 0) {
        return cached;
      }
    }

    // Generate new recommendations
    const recommendations = await this.generateRecommendations(userId, limit);

    // Cache the results
    await this.cacheRecommendations(userId, recommendations);

    return recommendations.slice(0, limit);
  }

  /**
   * Get similar listings to a specific listing
   */
  async getSimilarListings(
    listingId: string,
    limit: number = 10,
  ): Promise<RecommendationResult[]> {
    const targetListing = await this.listingRepository.findOne({
      where: { id: listingId },
      relations: ['carDetail'],
    });

    if (!targetListing) {
      return [];
    }

    const allListings = await this.listingRepository.find({
      where: {
        status: ListingStatus.APPROVED,
        isActive: true,
        id: Not(listingId),
      },
      relations: ['carDetail', 'carDetail.images', 'seller'],
    });

    const scored = allListings.map((listing) => {
      const score = this.calculateSimilarityScore(
        targetListing.carDetail,
        listing.carDetail,
        targetListing.price,
        listing.price,
      );
      const reason = this.generateSimilarityReason(
        targetListing.carDetail,
        listing.carDetail,
      );
      return { listing, score, reason };
    });

    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Generate recommendations based on user preferences
   */
  private async generateRecommendations(
    userId: string,
    limit: number,
  ): Promise<RecommendationResult[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return [];
    }

    // Get user's favorites
    const favorites = await this.favoriteRepository.find({
      where: { userId },
      relations: ['listing', 'listing.carDetail'],
    });

    // Get user's recent search history (last 30 searches, within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const searchHistory = await this.searchHistoryRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 30,
    });

    // Get user's view history (last 50 views, within last 30 days)
    const viewHistory = await this.viewHistoryRepository.find({
      where: {
        userId,
        viewedAt: MoreThan(thirtyDaysAgo),
      },
      order: { viewedAt: 'DESC' },
      take: 50,
      relations: ['listing', 'listing.carDetail'],
    });

    // Get all approved and active listings (excluding user's own listings)
    const allListings = await this.listingRepository.find({
      where: {
        status: ListingStatus.APPROVED,
        isActive: true,
        sellerId: Not(userId),
      },
      relations: ['carDetail', 'carDetail.images', 'seller'],
    });

    if (allListings.length === 0) {
      return [];
    }

    // Calculate scores for each listing
    const scoredListings: RecommendationResult[] = [];

    // Get statistics for popularity normalization
    const popularityStats = this.calculatePopularityStats(allListings);

    for (const listing of allListings) {
      // Skip if already favorited
      if (favorites.some((fav) => fav.listingId === listing.id)) {
        continue;
      }

      const scores = {
        contentBased: this.calculateContentBasedScore(
          listing.carDetail,
          favorites,
        ),
        searchHistory: this.calculateSearchHistoryScore(
          listing.carDetail,
          listing,
          searchHistory,
        ),
        viewHistory: this.calculateViewHistoryScore(
          listing,
          viewHistory,
        ),
        location: this.calculateLocationScore(listing, user),
        popularity: this.calculatePopularityScore(
          listing,
          popularityStats,
        ),
        priceAffinity: this.calculatePriceAffinityScore(
          listing.price,
          favorites,
        ),
      };

      // Adjust weights based on available data
      // View history has highest priority, then search history, then content-based
      const viewHistoryWeight = viewHistory.length > 0 ? 0.4 : 0;
      const searchHistoryWeight = searchHistory.length > 0 ? 0.3 : 0;
      const contentBasedWeight = viewHistory.length > 0 || searchHistory.length > 0 ? 0.1 : 0.7;

      const totalScore =
        scores.contentBased * contentBasedWeight +
        scores.searchHistory * searchHistoryWeight +
        scores.viewHistory * viewHistoryWeight +
        scores.location * this.defaultWeights.location +
        scores.popularity * this.defaultWeights.popularity +
        scores.priceAffinity * this.defaultWeights.priceAffinity;

      const reason = this.generateReason(scores, listing, favorites, listing.carDetail, searchHistory, viewHistory);

      scoredListings.push({
        listing,
        score: totalScore,
        reason,
      });
    }

    // Sort by score descending and return top results
    return scoredListings
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Calculate content-based score based on user's favorites
   * Priority: Make + Model match > Make match > Body type match
   */
  private calculateContentBasedScore(
    carDetail: CarDetail,
    favorites: Favorite[],
  ): number {
    if (favorites.length === 0) {
      return 0.3; // Lower score if no favorites
    }

    let totalScore = 0;
    let matchCount = 0;

    for (const favorite of favorites) {
      const favCarDetail = favorite.listing.carDetail;
      let score = 0;
      const makeMatch = favCarDetail.make.toLowerCase() === carDetail.make.toLowerCase();
      const modelMatch = favCarDetail.model.toLowerCase() === carDetail.model.toLowerCase();
      const bodyTypeMatch = favCarDetail.bodyType === carDetail.bodyType;

      // Priority 1: Make + Model match (highest priority)
      if (makeMatch && modelMatch) {
        score = 1.0; // Perfect match
      }
      // Priority 2: Make match only
      else if (makeMatch) {
        score = 0.7; // High score for same make
      }
      // Priority 3: Body type match
      else if (bodyTypeMatch) {
        score = 0.5; // Medium score for same body type
      }
      // Lower priority: Other matches
      else {
        // Year similarity (within 3 years)
        const yearDiff = Math.abs(favCarDetail.year - carDetail.year);
        if (yearDiff <= 3) {
          score += 0.2 * (1 - yearDiff / 3);
        }

        // Fuel type match
        if (favCarDetail.fuelType === carDetail.fuelType) {
          score += 0.1;
        }

        // Transmission match
        if (favCarDetail.transmission === carDetail.transmission) {
          score += 0.1;
        }
      }

      if (score > 0) {
        totalScore += score;
        matchCount++;
      }
    }

    return matchCount > 0 ? totalScore / matchCount : 0;
  }

  /**
   * Calculate search history-based score
   * Priority: Search query match (make/model) > Filter match
   */
  private calculateSearchHistoryScore(
    carDetail: CarDetail,
    listing: ListingDetail,
    searchHistory: UserSearchHistory[],
  ): number {
    if (searchHistory.length === 0) {
      return 0;
    }

    let totalScore = 0;
    let matchCount = 0;

    for (const history of searchHistory) {
      let score = 0;

      // Check search query match (highest priority)
      if (history.searchQuery) {
        const query = history.searchQuery.toLowerCase().trim();
        const make = carDetail.make.toLowerCase();
        const model = carDetail.model.toLowerCase();
        const title = listing.title.toLowerCase();

        // Exact make match
        if (query === make) {
          score = 1.0; // Perfect match
        }
        // Make in query
        else if (query.includes(make) || make.includes(query)) {
          score = 0.8;
        }
        // Model match
        else if (query === model || model.includes(query) || query.includes(model)) {
          score = 0.7;
        }
        // Make + Model in query
        else if (query.includes(make) && query.includes(model)) {
          score = 0.9;
        }
        // Title contains query
        else if (title.includes(query)) {
          score = 0.6;
        }
      }

      // Check filter matches (if no query match or lower priority)
      if (score < 0.8 && history.filters) {
        const filters = history.filters;

        // Make filter match (very high priority)
        if (filters.make) {
          const filterMake = filters.make.toLowerCase();
          const carMake = carDetail.make.toLowerCase();
          if (filterMake === carMake || carMake.includes(filterMake) || filterMake.includes(carMake)) {
            score = Math.max(score, 0.9);
          }
        }

        // Model filter match
        if (filters.model) {
          const filterModel = filters.model.toLowerCase();
          const carModel = carDetail.model.toLowerCase();
          if (filterModel === carModel || carModel.includes(filterModel) || filterModel.includes(carModel)) {
            score = Math.max(score, 0.8);
          }
        }

        // Body type filter match
        if (filters.bodyType && filters.bodyType === carDetail.bodyType) {
          score = Math.max(score, 0.5);
        }

        // Fuel type filter match
        if (filters.fuelType && filters.fuelType === carDetail.fuelType) {
          score = Math.max(score, 0.3);
        }

        // Year range match
        if (filters.yearMin || filters.yearMax) {
          const yearMin = filters.yearMin || 1900;
          const yearMax = filters.yearMax || new Date().getFullYear() + 1;
          if (carDetail.year >= yearMin && carDetail.year <= yearMax) {
            score = Math.max(score, 0.4);
          }
        }

        // Price range match
        if (filters.priceMin || filters.priceMax) {
          const priceMin = filters.priceMin || 0;
          const priceMax = filters.priceMax || Number.MAX_SAFE_INTEGER;
          if (listing.price >= priceMin && listing.price <= priceMax) {
            score = Math.max(score, 0.3);
          }
        }
      }

      if (score > 0) {
        totalScore += score;
        matchCount++;
      }
    }

    return matchCount > 0 ? totalScore / matchCount : 0;
  }

  /**
   * Calculate view history-based score
   * Higher score for listings user has viewed, especially long views and actions
   */
  private calculateViewHistoryScore(
    listing: ListingDetail,
    viewHistory: UserViewHistory[],
  ): number {
    if (viewHistory.length === 0) {
      return 0;
    }

    // Find views for this specific listing
    const listingViews = viewHistory.filter(
      (view) => view.listingId === listing.id,
    );

    if (listingViews.length === 0) {
      return 0;
    }

    let totalScore = 0;

    for (const view of listingViews) {
      let score = 0;

      // Different actions have different weights
      switch (view.action) {
        case ViewAction.LONG_VIEW:
          // Long view (30+ seconds) indicates strong interest
          score = 1.0;
          break;
        case ViewAction.CLICK_CONTACT:
          // Clicking contact shows high intent
          score = 0.9;
          break;
        case ViewAction.CLICK_FAVORITE:
          // Favoriting shows interest (but already handled by favorites)
          score = 0.7;
          break;
        case ViewAction.VIEW:
          // Regular view
          if (view.viewDuration && view.viewDuration > 30) {
            score = 0.8; // Long view
          } else if (view.viewDuration && view.viewDuration > 10) {
            score = 0.6; // Medium view
          } else {
            score = 0.4; // Short view
          }
          break;
      }

      // Recent views have higher weight (decay over time)
      const daysSinceView = (Date.now() - view.viewedAt.getTime()) / (1000 * 60 * 60 * 24);
      const timeDecay = Math.max(0, 1 - daysSinceView / 30); // Decay over 30 days
      score *= timeDecay;

      totalScore += score;
    }

    // Average score, but cap at 1.0
    return Math.min(1.0, totalScore / listingViews.length);
  }

  /**
   * Calculate location-based score
   */
  private calculateLocationScore(listing: ListingDetail, user: User): number {
    if (!user.location && !listing.city) {
      return 0.5; // Neutral if no location data
    }

    if (!user.location || !listing.city) {
      return 0.3; // Lower score if one is missing
    }

    const userLocation = user.location.toLowerCase();
    const listingCity = listing.city?.toLowerCase() || '';
    const listingState = listing.state?.toLowerCase() || '';
    const listingCountry = listing.country?.toLowerCase() || '';

    // Same city
    if (userLocation.includes(listingCity) || listingCity.includes(userLocation)) {
      return 1.0;
    }

    // Same state
    if (listingState && userLocation.includes(listingState)) {
      return 0.6;
    }

    // Same country
    if (listingCountry && userLocation.includes(listingCountry)) {
      return 0.3;
    }

    return 0.1; // Different location
  }

  /**
   * Calculate popularity score
   */
  private calculatePopularityScore(
    listing: ListingDetail,
    stats: { maxViews: number; maxFavorites: number },
  ): number {
    const viewScore = stats.maxViews > 0
      ? listing.viewCount / stats.maxViews
      : 0;
    const favoriteScore = stats.maxFavorites > 0
      ? listing.favoriteCount / stats.maxFavorites
      : 0;

    // Combine view and favorite scores (weighted average)
    return (viewScore * 0.6 + favoriteScore * 0.4);
  }

  /**
   * Calculate popularity statistics
   */
  private calculatePopularityStats(
    listings: ListingDetail[],
  ): { maxViews: number; maxFavorites: number } {
    let maxViews = 0;
    let maxFavorites = 0;

    for (const listing of listings) {
      if (listing.viewCount > maxViews) {
        maxViews = listing.viewCount;
      }
      if (listing.favoriteCount > maxFavorites) {
        maxFavorites = listing.favoriteCount;
      }
    }

    return { maxViews, maxFavorites };
  }

  /**
   * Calculate price affinity score
   */
  private calculatePriceAffinityScore(
    price: number,
    favorites: Favorite[],
  ): number {
    if (favorites.length === 0) {
      return 0.5; // Neutral score
    }

    // Calculate average price from favorites
    const totalPrice = favorites.reduce(
      (sum, fav) => sum + Number(fav.listing.price),
      0,
    );
    const avgPrice = totalPrice / favorites.length;

    // Calculate price difference percentage
    const priceDiff = Math.abs(price - avgPrice) / avgPrice;

    // Score decreases as price difference increases
    // Within ±30% gets full score, beyond that decreases
    if (priceDiff <= 0.3) {
      return 1.0 - priceDiff / 0.3 * 0.5; // 1.0 to 0.5
    } else {
      return Math.max(0, 0.5 - (priceDiff - 0.3) / 0.7 * 0.5); // 0.5 to 0
    }
  }

  /**
   * Calculate similarity score between two car details
   */
  private calculateSimilarityScore(
    car1: CarDetail,
    car2: CarDetail,
    price1: number,
    price2: number,
  ): number {
    let score = 0;
    let factors = 0;

    // Make match
    if (car1.make.toLowerCase() === car2.make.toLowerCase()) {
      score += 0.3;
      factors++;
    }

    // Model match
    if (car1.model.toLowerCase() === car2.model.toLowerCase()) {
      score += 0.25;
      factors++;
    }

    // Year similarity
    const yearDiff = Math.abs(car1.year - car2.year);
    if (yearDiff <= 5) {
      score += 0.2 * (1 - yearDiff / 5);
      factors++;
    }

    // Fuel type match
    if (car1.fuelType === car2.fuelType) {
      score += 0.1;
      factors++;
    }

    // Transmission match
    if (car1.transmission === car2.transmission) {
      score += 0.1;
      factors++;
    }

    // Body type match
    if (car1.bodyType === car2.bodyType) {
      score += 0.05;
      factors++;
    }

    // Price similarity (within ±20%)
    const priceDiff = Math.abs(price1 - price2) / Math.max(price1, price2);
    if (priceDiff <= 0.2) {
      score += 0.1 * (1 - priceDiff / 0.2);
      factors++;
    }

    return factors > 0 ? score : 0;
  }

  /**
   * Generate reason text for recommendation
   */
  private generateReason(
    scores: {
      contentBased: number;
      searchHistory: number;
      viewHistory: number;
      location: number;
      popularity: number;
      priceAffinity: number;
    },
    listing: ListingDetail,
    favorites: Favorite[],
    carDetail: CarDetail,
    searchHistory: UserSearchHistory[],
    viewHistory: UserViewHistory[],
  ): string {
    const reasons: string[] = [];

    // Priority 1: View history match (highest priority)
    if (scores.viewHistory > 0.7) {
      const listingViews = viewHistory.filter((v) => v.listingId === listing.id);
      const hasLongView = listingViews.some(
        (v) => v.action === ViewAction.LONG_VIEW || (v.viewDuration && v.viewDuration > 30),
      );
      const hasContactClick = listingViews.some((v) => v.action === ViewAction.CLICK_CONTACT);

      if (hasContactClick) {
        reasons.push('You showed interest in this car');
      } else if (hasLongView) {
        reasons.push('You viewed this car recently');
      } else {
        reasons.push('Based on your viewing history');
      }
    }

    // Priority 2: Search history match
    if (scores.searchHistory > 0.7) {
      // Find matching search queries
      const matchingSearches = searchHistory.filter((history) => {
        if (history.searchQuery) {
          const query = history.searchQuery.toLowerCase().trim();
          const make = carDetail.make.toLowerCase();
          return query === make || query.includes(make) || make.includes(query);
        }
        if (history.filters?.make) {
          const filterMake = history.filters.make.toLowerCase();
          const carMake = carDetail.make.toLowerCase();
          return filterMake === carMake || carMake.includes(filterMake) || filterMake.includes(carMake);
        }
        return false;
      });

      if (matchingSearches.length > 0) {
        const makes = [
          ...new Set(
            matchingSearches
              .map((h) => {
                if (h.searchQuery) {
                  return h.searchQuery.trim();
                }
                return h.filters?.make;
              })
              .filter(Boolean),
          ),
        ];
        if (makes.length > 0) {
          reasons.push(`Matches your search for ${makes.join(', ')}`);
        }
      }
    }

    // Priority 2: Favorites match
    if (favorites.length > 0 && scores.contentBased > 0.5) {
      // Check for make + model match (highest priority)
      const hasMakeModelMatch = favorites.some(
        (f) =>
          f.listing.carDetail.make.toLowerCase() === carDetail.make.toLowerCase() &&
          f.listing.carDetail.model.toLowerCase() === carDetail.model.toLowerCase(),
      );

      if (hasMakeModelMatch) {
        reasons.push(`Same ${carDetail.make} ${carDetail.model} as your favorites`);
      } else {
        // Check for make match only
        const hasMakeMatch = favorites.some(
          (f) =>
            f.listing.carDetail.make.toLowerCase() === carDetail.make.toLowerCase(),
        );

        if (hasMakeMatch) {
          reasons.push(`Same ${carDetail.make} brand as your favorites`);
        } else {
          // Check for body type match
          const hasBodyTypeMatch = favorites.some(
            (f) => f.listing.carDetail.bodyType === carDetail.bodyType,
          );

          if (hasBodyTypeMatch) {
            reasons.push(`Same ${carDetail.bodyType} body type as your favorites`);
          } else if (scores.contentBased > 0.3) {
            reasons.push('Similar to your favorites');
          }
        }
      }
    }

    if (scores.location > 0.6) {
      reasons.push(`Located in ${listing.city || listing.location || 'your area'}`);
    }

    return reasons.length > 0
      ? reasons.join(' • ')
      : 'Recommended for you';
  }

  /**
   * Generate similarity reason
   */
  private generateSimilarityReason(
    car1: CarDetail,
    car2: CarDetail,
  ): string {
    const matches: string[] = [];

    if (car1.make === car2.make && car1.model === car2.model) {
      matches.push('Same make and model');
    } else if (car1.make === car2.make) {
      matches.push(`Same ${car1.make} brand`);
    }

    if (car1.year === car2.year) {
      matches.push('Same year');
    } else if (Math.abs(car1.year - car2.year) <= 2) {
      matches.push('Similar year');
    }

    if (car1.fuelType === car2.fuelType) {
      matches.push(`Same ${car1.fuelType} fuel type`);
    }

    if (car1.bodyType === car2.bodyType) {
      matches.push(`Same ${car1.bodyType} body type`);
    }

    return matches.length > 0
      ? matches.join(' • ')
      : 'Similar vehicle';
  }

  /**
   * Get cached recommendations
   */
  private async getCachedRecommendations(
    userId: string,
    limit: number,
  ): Promise<RecommendationResult[]> {
    const cached = await this.recommendationRepository.find({
      where: { userId },
      relations: [
        'listing',
        'listing.carDetail',
        'listing.carDetail.images',
        'listing.seller',
      ],
      order: { score: 'DESC' },
      take: limit,
    });

    return cached
      .filter(
        (rec) =>
          rec.listing.status === ListingStatus.APPROVED &&
          rec.listing.isActive,
      )
      .map((rec) => ({
        listing: rec.listing,
        score: Number(rec.score),
        reason: rec.reason || 'Recommended for you',
      }));
  }

  /**
   * Cache recommendations
   */
  private async cacheRecommendations(
    userId: string,
    recommendations: RecommendationResult[],
  ): Promise<void> {
    if (recommendations.length === 0) {
      return;
    }

    // Use transaction to ensure atomicity
    await this.recommendationRepository.manager.transaction(
      async (transactionalEntityManager) => {
        // Delete old recommendations first (within transaction)
        await transactionalEntityManager.delete(UserRecommendation, { userId });

        // Insert new recommendations using raw query with ON CONFLICT UPDATE
        // This handles concurrent requests gracefully
        for (const rec of recommendations) {
          await transactionalEntityManager.query(
            `INSERT INTO user_recommendations ("userId", "listingId", score, reason)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT ("userId", "listingId")
             DO UPDATE SET score = EXCLUDED.score, reason = EXCLUDED.reason`,
            [userId, rec.listing.id, rec.score, rec.reason],
          );
        }
      },
    );
  }

  /**
   * Invalidate recommendations cache for a user
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.recommendationRepository.delete({ userId });
  }

  /**
   * Save search history (optional)
   */
  async saveSearchHistory(
    userId: string,
    searchQuery?: string,
    filters?: Record<string, any>,
  ): Promise<void> {
    try {
      this.logger.debug(
        `Attempting to save search history - userId: ${userId}, query: ${searchQuery || 'none'}, filters: ${JSON.stringify(filters || {})}`,
      );

      const historyData: Partial<UserSearchHistory> = {
        userId,
      };
      
      if (searchQuery !== undefined && searchQuery !== null && searchQuery.trim() !== '') {
        historyData.searchQuery = searchQuery.trim();
      }
      
      if (filters !== undefined && filters !== null && Object.keys(filters).length > 0) {
        historyData.filters = filters;
      }
      
      // Only save if there's at least a query or filters
      if (!historyData.searchQuery && !historyData.filters) {
        this.logger.debug('Skipping search history save - no query or filters');
        return;
      }

      const history = this.searchHistoryRepository.create(historyData);
      const saved = await this.searchHistoryRepository.save(history);
      this.logger.log(`Successfully saved search history with ID: ${saved.id}`);
    } catch (error) {
      this.logger.error('Failed to save search history:', error);
      throw error; // Re-throw to see the error in the calling code
    }
  }
}


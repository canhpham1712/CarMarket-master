import {
  Controller,
  Get,
  Query,
  ValidationPipe,
  UseGuards,
  Optional,
  Inject,
  Logger,
} from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchFiltersDto } from './dto/search-filters.dto';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { RecommendationsService } from '../recommendations/recommendations.service';

@Controller('search')
@UseGuards(OptionalJwtAuthGuard)
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(
    private readonly searchService: SearchService,
    @Optional() @Inject(RecommendationsService)
    private readonly recommendationsService?: RecommendationsService,
  ) {
    this.logger.log(
      `RecommendationsService injected: ${!!this.recommendationsService}`,
    );
  }

  @Get()
  async search(
    @Query(
      new ValidationPipe({
        transform: true,
        transformOptions: { enableImplicitConversion: true },
        whitelist: true,
      }),
    )
    filters: SearchFiltersDto,
    @CurrentUser() user?: User,
  ) {
    const result = await this.searchService.search(filters);

    // Save search history if user is authenticated
    this.logger.debug(`Search called - User: ${user?.id || 'not authenticated'}, Service: ${!!this.recommendationsService}`);
    
    if (user && this.recommendationsService) {
      // Extract search query and filters
      const searchQuery = filters.query;
      const searchFilters: Record<string, any> = {};
      
      // Only include non-empty filters
      if (filters.make) searchFilters.make = filters.make;
      if (filters.model) searchFilters.model = filters.model;
      if (filters.yearMin) searchFilters.yearMin = filters.yearMin;
      if (filters.yearMax) searchFilters.yearMax = filters.yearMax;
      if (filters.priceMin) searchFilters.priceMin = filters.priceMin;
      if (filters.priceMax) searchFilters.priceMax = filters.priceMax;
      if (filters.mileageMax) searchFilters.mileageMax = filters.mileageMax;
      if (filters.fuelType) searchFilters.fuelType = filters.fuelType;
      if (filters.transmission) searchFilters.transmission = filters.transmission;
      if (filters.bodyType) searchFilters.bodyType = filters.bodyType;
      if (filters.condition) searchFilters.condition = filters.condition;
      if (filters.location) searchFilters.location = filters.location;
      if (filters.city) searchFilters.city = filters.city;
      if (filters.state) searchFilters.state = filters.state;
      if (filters.country) searchFilters.country = filters.country;

      this.logger.log(
        `Saving search history for user ${user.id} - Query: ${searchQuery || 'none'}, Filters: ${JSON.stringify(searchFilters)}`,
      );

      // Save asynchronously (don't wait for it)
      this.recommendationsService
        .saveSearchHistory(
          user.id,
          searchQuery,
          Object.keys(searchFilters).length > 0 ? searchFilters : undefined,
        )
        .then(() => {
          this.logger.log(`Successfully saved search history for user ${user.id}`);
        })
        .catch((err) => {
          // Log but don't fail the request
          this.logger.error(`Failed to save search history for user ${user.id}:`, err);
        });
    } else {
      if (!user) {
        this.logger.debug('User not authenticated, skipping search history save');
      }
      if (!this.recommendationsService) {
        this.logger.warn('RecommendationsService not available, skipping search history save');
      }
    }

    return result;
  }
}

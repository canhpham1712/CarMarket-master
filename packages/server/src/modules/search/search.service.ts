import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import {
  ListingDetail,
  ListingStatus,
} from '../../entities/listing-detail.entity';

export interface SearchFilters {
  // General search query
  query?: string;
  // Specific filters
  make?: string;
  model?: string;
  yearMin?: number;
  yearMax?: number;
  priceMin?: number;
  priceMax?: number;
  mileageMax?: number;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  condition?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  // Pagination and sorting
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(ListingDetail)
    private readonly listingRepository: Repository<ListingDetail>,
  ) {}

  async search(filters: SearchFilters) {
    const {
      query,
      make,
      model,
      yearMin,
      yearMax,
      priceMin,
      priceMax,
      mileageMax,
      fuelType,
      transmission,
      bodyType,
      condition,
      location,
      city,
      state,
      country,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = filters;

    // Validate and sanitize pagination
    const sanitizedPage = Math.max(1, Number(page) || 1);
    const sanitizedLimit = Math.min(100, Math.max(1, Number(limit) || 10));

    const queryBuilder: SelectQueryBuilder<ListingDetail> =
      this.listingRepository
        .createQueryBuilder('listing')
        .leftJoinAndSelect('listing.carDetail', 'carDetail')
        .leftJoinAndSelect('carDetail.images', 'images')
        .leftJoinAndSelect('listing.seller', 'seller')
        .where('listing.status = :status', { status: ListingStatus.APPROVED })
        .andWhere('listing.isActive = :isActive', { isActive: true });

    // Apply general search query (searches across multiple fields)
    if (query && query.trim()) {
      const searchTerm = query.trim();
      queryBuilder.andWhere(
        '(LOWER(carDetail.make) LIKE LOWER(:query) OR ' +
          'LOWER(carDetail.model) LIKE LOWER(:query) OR ' +
          'LOWER(listing.title) LIKE LOWER(:query) OR ' +
          'LOWER(listing.description) LIKE LOWER(:query))',
        { query: `%${searchTerm}%` },
      );
    }

    // Apply specific filters (only if not using general query)
    if (make && make.trim()) {
      queryBuilder.andWhere('LOWER(carDetail.make) LIKE LOWER(:make)', {
        make: `%${make.trim()}%`,
      });
    }

    if (model && model.trim()) {
      queryBuilder.andWhere('LOWER(carDetail.model) LIKE LOWER(:model)', {
        model: `%${model.trim()}%`,
      });
    }

    // Numeric range filters with validation
    if (yearMin !== undefined && !isNaN(Number(yearMin))) {
      queryBuilder.andWhere('carDetail.year >= :yearMin', {
        yearMin: Number(yearMin),
      });
    }

    if (yearMax !== undefined && !isNaN(Number(yearMax))) {
      queryBuilder.andWhere('carDetail.year <= :yearMax', {
        yearMax: Number(yearMax),
      });
    }

    if (priceMin !== undefined && !isNaN(Number(priceMin))) {
      queryBuilder.andWhere('listing.price >= :priceMin', {
        priceMin: Number(priceMin),
      });
    }

    if (priceMax !== undefined && !isNaN(Number(priceMax))) {
      queryBuilder.andWhere('listing.price <= :priceMax', {
        priceMax: Number(priceMax),
      });
    }

    if (mileageMax !== undefined && !isNaN(Number(mileageMax))) {
      queryBuilder.andWhere('carDetail.mileage <= :mileageMax', {
        mileageMax: Number(mileageMax),
      });
    }

    // Categorical filters (exact match)
    if (fuelType && fuelType.trim()) {
      queryBuilder.andWhere('carDetail.fuelType = :fuelType', {
        fuelType: fuelType.trim(),
      });
    }

    if (transmission && transmission.trim()) {
      queryBuilder.andWhere('carDetail.transmission = :transmission', {
        transmission: transmission.trim(),
      });
    }

    if (bodyType && bodyType.trim()) {
      queryBuilder.andWhere('carDetail.bodyType = :bodyType', {
        bodyType: bodyType.trim(),
      });
    }

    if (condition && condition.trim()) {
      queryBuilder.andWhere('carDetail.condition = :condition', {
        condition: condition.trim(),
      });
    }

    // Location filters (hierarchical search)
    if (country && country.trim()) {
      queryBuilder.andWhere('LOWER(listing.country) LIKE LOWER(:country)', {
        country: `%${country.trim()}%`,
      });
    }

    if (state && state.trim()) {
      queryBuilder.andWhere('LOWER(listing.state) LIKE LOWER(:state)', {
        state: `%${state.trim()}%`,
      });
    }

    if (city && city.trim()) {
      queryBuilder.andWhere('LOWER(listing.city) LIKE LOWER(:city)', {
        city: `%${city.trim()}%`,
      });
    }

    // Fallback general location search (only if specific fields not provided)
    if (location && location.trim() && !city && !state && !country) {
      queryBuilder.andWhere(
        '(LOWER(listing.location) LIKE LOWER(:location) OR ' +
          'LOWER(listing.city) LIKE LOWER(:location) OR ' +
          'LOWER(listing.state) LIKE LOWER(:location) OR ' +
          'LOWER(listing.country) LIKE LOWER(:location))',
        { location: `%${location.trim()}%` },
      );
    }

    // Apply sorting with validation
    const validSortFields = [
      'createdAt',
      'price',
      'mileage',
      'year',
      'viewCount',
    ];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const validSortOrder: 'ASC' | 'DESC' =
      sortOrder === 'ASC' ? 'ASC' : 'DESC';

    if (sortField === 'mileage' || sortField === 'year') {
      queryBuilder.orderBy(`carDetail.${sortField}`, validSortOrder);
    } else {
      queryBuilder.orderBy(`listing.${sortField}`, validSortOrder);
    }

    // Always add secondary sort by ID for consistency
    queryBuilder.addOrderBy('listing.id', 'ASC');

    // Apply pagination
    const skip = (sanitizedPage - 1) * sanitizedLimit;
    queryBuilder.skip(skip).take(sanitizedLimit);

    // Execute query
    const [listings, total] = await queryBuilder.getManyAndCount();

    // Transform decimal fields to numbers for JSON serialization
    const transformedListings = listings.map((listing) => ({
      ...listing,
      latitude: listing.latitude != null ? Number(listing.latitude) : null,
      longitude: listing.longitude != null ? Number(listing.longitude) : null,
      price: Number(listing.price),
    }));

    return {
      listings: transformedListings,
      pagination: {
        page: sanitizedPage,
        limit: sanitizedLimit,
        total,
        totalPages: Math.ceil(total / sanitizedLimit),
      },
      filters: filters,
    };
  }
}

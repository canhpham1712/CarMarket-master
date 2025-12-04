import { Injectable, /*Logger*/ } from '@nestjs/common';
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
  // private readonly logger = new Logger(SearchService.name);

  constructor(
    @InjectRepository(ListingDetail)
    private readonly listingRepository: Repository<ListingDetail>,
  ) {}

  async getSuggestions(query: string): Promise<any[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.trim();
    // Tạo từ khóa chuẩn hóa: bỏ hết ký tự không phải chữ và số
    const normalizedTerm = searchTerm.replace(/[^a-zA-Z0-9]/g, '');

    // FUZZY SEARCH LOGIC CHO GỢI Ý:
    // Kết hợp ILIKE, SIMILARITY và Normalized Search (cho trường hợp crv -> cr-v)
    const listings = await this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.carDetail', 'carDetail')
      .leftJoinAndSelect('carDetail.images', 'images')
      .leftJoinAndSelect('listing.seller', 'seller')
      .leftJoinAndSelect('seller.receivedRatings', 'ratings')
      .where('listing.status = :status', { status: ListingStatus.APPROVED })
      .andWhere('listing.isActive = :isActive', { isActive: true })
      .andWhere(
        `(
          listing.title ILIKE :likeQuery OR
          carDetail.make ILIKE :likeQuery OR
          carDetail.model ILIKE :likeQuery OR
          SIMILARITY(listing.title, :query) > 0.3 OR
          SIMILARITY(carDetail.make, :query) > 0.3 OR
          SIMILARITY(carDetail.model, :query) > 0.3 OR
          -- Logic mới: So sánh chuỗi đã chuẩn hóa (bỏ ký tự đặc biệt)
          REGEXP_REPLACE(listing.title, '[^a-zA-Z0-9]', '', 'g') ILIKE :normalizedQuery OR
          REGEXP_REPLACE(carDetail.make, '[^a-zA-Z0-9]', '', 'g') ILIKE :normalizedQuery OR
          REGEXP_REPLACE(carDetail.model, '[^a-zA-Z0-9]', '', 'g') ILIKE :normalizedQuery
        )`,
        { 
          query: searchTerm, 
          likeQuery: `%${searchTerm}%`,
          normalizedQuery: `%${normalizedTerm}%` 
        },
      )
      // TÍNH ĐIỂM SẮP XẾP:
      .addSelect(`(
        CASE 
          WHEN listing.title ILIKE :likeQuery THEN 10 
          -- Ưu tiên cao cho match chuẩn hóa (ví dụ nhập crv khớp cr-v)
          WHEN REGEXP_REPLACE(listing.title, '[^a-zA-Z0-9]', '', 'g') ILIKE :normalizedQuery THEN 9.5
          WHEN carDetail.model ILIKE :likeQuery THEN 9
          WHEN REGEXP_REPLACE(carDetail.model, '[^a-zA-Z0-9]', '', 'g') ILIKE :normalizedQuery THEN 8.5
          WHEN carDetail.make ILIKE :likeQuery THEN 8
          ELSE 0 
        END + 
        GREATEST(
          SIMILARITY(listing.title, :query), 
          SIMILARITY(carDetail.model, :query),
          SIMILARITY(carDetail.make, :query)
        )
      )`, 'match_score')
      .orderBy('match_score', 'DESC')
      .addOrderBy('listing.viewCount', 'DESC')
      .take(5)
      .getMany();

    return listings.map(listing => {
      const ratings = listing.seller.receivedRatings || [];
      const avgRating = ratings.length > 0
        ? ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length
        : 0;

      const thumbnail = listing.carDetail.images?.find(img => img.isPrimary)?.url || 
                        listing.carDetail.images?.[0]?.url || null;

      return {
        id: listing.id,
        title: listing.title,
        subTitle: `${listing.carDetail.year} ${listing.carDetail.make} ${listing.carDetail.model}`,
        price: listing.price,
        thumbnail: thumbnail,
        sellerRating: parseFloat(avgRating.toFixed(1)),
        sellerReviewCount: ratings.length,
        condition: listing.carDetail.condition
      };
    });
  }

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

    const shouldUseRelevanceSort = query && query.trim() && 
      (sortBy === 'relevance' || sortBy === 'createdAt' || !filters.sortBy);

    // 1. Xử lý tìm kiếm chung (General Query)
    if (query && query.trim()) {
      const searchTerm = query.trim();
      const normalizedTerm = searchTerm.replace(/[^a-zA-Z0-9]/g, '');
      
      queryBuilder.andWhere(
        `(
          listing.title ILIKE :likeQuery OR
          carDetail.make ILIKE :likeQuery OR
          carDetail.model ILIKE :likeQuery OR
          SIMILARITY(listing.title, :query) > 0.3 OR
          SIMILARITY(carDetail.make, :query) > 0.3 OR 
          SIMILARITY(carDetail.model, :query) > 0.3 OR
          -- Logic mới: Normalized Search
          REGEXP_REPLACE(listing.title, '[^a-zA-Z0-9]', '', 'g') ILIKE :normalizedQuery OR
          REGEXP_REPLACE(carDetail.make, '[^a-zA-Z0-9]', '', 'g') ILIKE :normalizedQuery OR
          REGEXP_REPLACE(carDetail.model, '[^a-zA-Z0-9]', '', 'g') ILIKE :normalizedQuery
        )`,
        { 
          query: searchTerm, 
          likeQuery: `%${searchTerm}%`,
          normalizedQuery: `%${normalizedTerm}%` 
        },
      );

      if (shouldUseRelevanceSort) {
        queryBuilder.addSelect(`(
          CASE 
            WHEN listing.title ILIKE :likeQuery THEN 10 
            WHEN REGEXP_REPLACE(listing.title, '[^a-zA-Z0-9]', '', 'g') ILIKE :normalizedQuery THEN 9.5
            WHEN carDetail.model ILIKE :likeQuery THEN 9
            WHEN REGEXP_REPLACE(carDetail.model, '[^a-zA-Z0-9]', '', 'g') ILIKE :normalizedQuery THEN 8.5
            WHEN carDetail.make ILIKE :likeQuery THEN 8
            ELSE 0 
          END + 
          GREATEST(
            SIMILARITY(listing.title, :query), 
            SIMILARITY(carDetail.model, :query)
          )
        )`, 'relevance_score');
        
        queryBuilder.orderBy('relevance_score', 'DESC');
        queryBuilder.addOrderBy('listing.createdAt', 'DESC');
      }
    }

    // 2. Xử lý các bộ lọc cụ thể (Specific Filters)
    if (make && make.trim()) {
      queryBuilder.andWhere('LOWER(carDetail.make) = LOWER(:make)', {
        make: make.trim(),
      });
    }

    if (model && model.trim()) {
      queryBuilder.andWhere('LOWER(carDetail.model) = LOWER(:model)', {
        model: model.trim(),
      });
    }

    // Numeric Filters
    if (yearMin !== undefined && !isNaN(Number(yearMin))) {
      queryBuilder.andWhere('carDetail.year >= :yearMin', { yearMin: Number(yearMin) });
    }
    if (yearMax !== undefined && !isNaN(Number(yearMax))) {
      queryBuilder.andWhere('carDetail.year <= :yearMax', { yearMax: Number(yearMax) });
    }
    if (priceMin !== undefined && !isNaN(Number(priceMin))) {
      queryBuilder.andWhere('listing.price >= :priceMin', { priceMin: Number(priceMin) });
    }
    if (priceMax !== undefined && !isNaN(Number(priceMax))) {
      queryBuilder.andWhere('listing.price <= :priceMax', { priceMax: Number(priceMax) });
    }
    if (mileageMax !== undefined && !isNaN(Number(mileageMax))) {
      queryBuilder.andWhere('carDetail.mileage <= :mileageMax', { mileageMax: Number(mileageMax) });
    }

    // Categorical Filters
    if (fuelType && fuelType.trim()) {
      queryBuilder.andWhere('carDetail.fuelType = :fuelType', { fuelType: fuelType.trim() });
    }
    if (transmission && transmission.trim()) {
      queryBuilder.andWhere('carDetail.transmission = :transmission', { transmission: transmission.trim() });
    }
    if (bodyType && bodyType.trim()) {
      queryBuilder.andWhere('carDetail.bodyType = :bodyType', { bodyType: bodyType.trim() });
    }
    if (condition && condition.trim()) {
      queryBuilder.andWhere('carDetail.condition = :condition', { condition: condition.trim() });
    }

    // Location Filters
    if (country && country.trim()) {
      queryBuilder.andWhere('listing.country ILIKE :country', { country: `%${country.trim()}%` });
    }
    if (state && state.trim()) {
      queryBuilder.andWhere('listing.state ILIKE :state', { state: `%${state.trim()}%` });
    }
    if (city && city.trim()) {
      queryBuilder.andWhere('listing.city ILIKE :city', { city: `%${city.trim()}%` });
    }
    if (location && location.trim() && !city && !state && !country) {
      queryBuilder.andWhere(
        '(listing.location ILIKE :location OR listing.city ILIKE :location OR listing.state ILIKE :location)',
        { location: `%${location.trim()}%` },
      );
    }

    // 3. Sorting Logic
    if (!shouldUseRelevanceSort) {
       const validSortFields = [
        'createdAt',
        'price',
        'mileage',
        'year',
        'viewCount',
      ];
       const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
       const validSortOrder: 'ASC' | 'DESC' = sortOrder === 'ASC' ? 'ASC' : 'DESC';

       if (sortField === 'mileage' || sortField === 'year') {
         queryBuilder.orderBy(`carDetail.${sortField}`, validSortOrder);
       } else {
         queryBuilder.orderBy(`listing.${sortField}`, validSortOrder);
       }
       queryBuilder.addOrderBy('listing.id', 'ASC');
    }

    // 4. Pagination
    const skip = (sanitizedPage - 1) * sanitizedLimit;
    queryBuilder.skip(skip).take(sanitizedLimit);

    const [listings, total] = await queryBuilder.getManyAndCount();

    // 5. Transform Data
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
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Optional,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { ChatConversation } from '../../entities/chat-conversation.entity';
import { User } from '../../entities/user.entity';
import {
  ListingDetail,
  ListingStatus,
} from '../../entities/listing-detail.entity';
import { CarDetail } from '../../entities/car-detail.entity';
import { CarImage, ImageType } from '../../entities/car-image.entity';
import { CarVideo } from '../../entities/car-video.entity';
import { ListingPendingChanges } from '../../entities/listing-pending-changes.entity';
import {
  Transaction,
  TransactionStatus,
  PaymentMethod,
} from '../../entities/transaction.entity';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { MarkAsSoldDto } from './dto/mark-as-sold.dto';
import { hasActualChanges } from '../../utils/value-comparison.util';
import { LogsService } from '../logs/logs.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../entities/notification.entity';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { UserViewHistory, ViewAction } from '../../entities/user-view-history.entity';
import { PromotionStatus } from '../../entities/listing-promotion.entity';

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(ListingDetail)
    private readonly listingRepository: Repository<ListingDetail>,
    @InjectRepository(CarDetail)
    private readonly carDetailRepository: Repository<CarDetail>,
    @InjectRepository(CarImage)
    private readonly carImageRepository: Repository<CarImage>,
    @InjectRepository(CarVideo)
    private readonly carVideoRepository: Repository<CarVideo>,
    @InjectRepository(ListingPendingChanges)
    private readonly pendingChangesRepository: Repository<ListingPendingChanges>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ChatConversation)
    private readonly conversationRepository: Repository<ChatConversation>,
    @InjectRepository(UserViewHistory)
    private readonly viewHistoryRepository: Repository<UserViewHistory>,
    private readonly logsService: LogsService,
    private readonly notificationsService: NotificationsService,
    @Optional() @Inject(RecommendationsService)
    private readonly recommendationsService?: RecommendationsService,
  ) {}

  /**
   * Analyzes image changes to determine if they are reorder-only or substantive changes
   * @param existingImages Current images in database
   * @param newImages New images from request
   * @returns 'reorder-only' if only sortOrder/isPrimary changed, 'substantive' if images added/removed/replaced
   */
  private analyzeImageChanges(existingImages: CarImage[], newImages: any[]): 'reorder-only' | 'substantive' {
    // If different number of images, it's a substantive change
    if (existingImages.length !== newImages.length) {
      return 'substantive';
    }

    // Create maps for easier comparison
    const existingMap = new Map(existingImages.map(img => [img.filename, img]));
    const newMap = new Map(newImages.map(img => [img.filename, img]));

    // Check if all filenames exist in both sets
    for (const filename of existingMap.keys()) {
      if (!newMap.has(filename)) {
        return 'substantive'; // Image was removed
      }
    }

    for (const filename of newMap.keys()) {
      if (!existingMap.has(filename)) {
        return 'substantive'; // New image was added
      }
    }

    // All filenames match, check if only sortOrder/isPrimary changed
    for (const [filename, newImg] of newMap) {
      const existingImg = existingMap.get(filename);
      if (!existingImg) continue;

      // Check if any substantive properties changed (excluding sortOrder and isPrimary)
      if (
        existingImg.url !== newImg.url ||
        existingImg.originalName !== newImg.originalName ||
        existingImg.type !== newImg.type ||
        existingImg.alt !== newImg.alt ||
        existingImg.fileSize !== newImg.fileSize ||
        existingImg.mimeType !== newImg.mimeType
      ) {
        return 'substantive';
      }
    }

    // Only sortOrder/isPrimary changed
    return 'reorder-only';
  }

  /**
   * Analyzes video changes to determine if they are reorder-only or substantive changes
   * @param existingVideos Current videos in database
   * @param newVideos New videos from request
   * @returns 'reorder-only' if only sortOrder/isPrimary changed, 'substantive' if videos added/removed/replaced
   */
  private analyzeVideoChanges(existingVideos: CarVideo[], newVideos: any[]): 'reorder-only' | 'substantive' {
    if (existingVideos.length !== newVideos.length) {
      return 'substantive';
    }

    const existingMap = new Map(existingVideos.map(v => [v.filename, v]));
    const newMap = new Map(newVideos.map(v => [v.filename, v]));

    for (const filename of existingMap.keys()) {
      if (!newMap.has(filename)) {
        return 'substantive';
      }
    }

    for (const filename of newMap.keys()) {
      if (!existingMap.has(filename)) {
        return 'substantive';
      }
    }

    for (const [filename, newVid] of newMap) {
      const existingVid = existingMap.get(filename);
      if (!existingVid) continue;

      if (
        existingVid.url !== newVid.url ||
        existingVid.originalName !== newVid.originalName ||
        existingVid.alt !== newVid.alt ||
        existingVid.fileSize !== newVid.fileSize ||
        existingVid.mimeType !== newVid.mimeType ||
        existingVid.duration !== newVid.duration ||
        existingVid.thumbnailUrl !== newVid.thumbnailUrl
      ) {
        return 'substantive';
      }
    }

    return 'reorder-only';
  }

  /**
   * Applies image reordering changes directly to the database
   * @param carDetailId The car detail ID
   * @param newImages Array of images with new sortOrder and isPrimary values
   * @param userId User ID for logging
   */
  private async applyImageReordering(carDetailId: string, newImages: any[], _userId: string): Promise<void> {
    // Get existing images
    const existingImages = await this.carImageRepository.find({
      where: { carDetailId },
      order: { sortOrder: 'ASC' },
    });

    // Create a map for quick lookup
    const existingMap = new Map(existingImages.map(img => [img.filename, img]));

    // Update each image's sortOrder and isPrimary
    for (let i = 0; i < newImages.length; i++) {
      const newImage = newImages[i];
      const existingImage = existingMap.get(newImage.filename);
      
      if (existingImage) {
        await this.carImageRepository.update(existingImage.id, {
          sortOrder: i,
          isPrimary: i === 0, // First image is primary
        });
      }
    }
  }

  /**
   * Applies video reordering changes directly to the database
   */
  private async applyVideoReordering(carDetailId: string, newVideos: any[], _userId: string): Promise<void> {
    const existingVideos = await this.carVideoRepository.find({
      where: { carDetailId },
      order: { sortOrder: 'ASC' },
    });

    const existingMap = new Map(existingVideos.map(v => [v.filename, v]));

    for (let i = 0; i < newVideos.length; i++) {
      const newVideo = newVideos[i];
      const existingVideo = existingMap.get(newVideo.filename);
      if (existingVideo) {
        await this.carVideoRepository.update(existingVideo.id, {
          sortOrder: i,
          isPrimary: i === 0,
        });
      }
    }
  }

  async create(
    userId: string,
    createListingDto: CreateListingDto,
  ): Promise<ListingDetail> {
    const { carDetail, images, videos, ...listingData } = createListingDto;

    // Create car detail
    const newCarDetail = this.carDetailRepository.create(carDetail);
    const savedCarDetail = await this.carDetailRepository.save(newCarDetail);

    // Create listing
    const listing = this.listingRepository.create({
      ...listingData,
      sellerId: userId,
      carDetailId: savedCarDetail.id,
      status: ListingStatus.PENDING,
    });

    const savedListing = await this.listingRepository.save(listing);

    // Create car images if provided
    if (images && images.length > 0) {
      const carImages = images.map((image, index) =>
        this.carImageRepository.create({
          filename: image.filename,
          originalName: image.originalName,
          url: image.url,
          type: image.type ?? ImageType.EXTERIOR,
          sortOrder: index,
          isPrimary: index === 0,
          alt: image.alt ?? null,
          carDetailId: savedCarDetail.id,
          fileSize: image.fileSize ?? null,
          mimeType: image.mimeType ?? null,
        }),
      );
      await this.carImageRepository.save(carImages);
    }

    // Create car videos if provided
    if (videos && videos.length > 0) {
      const carVideos = videos.map((video, index) =>
        this.carVideoRepository.create({
          filename: video.filename,
          originalName: video.originalName,
          url: video.url,
          sortOrder: index,
          isPrimary: index === 0,
          alt: video.alt ?? null,
          carDetailId: savedCarDetail.id,
          fileSize: video.fileSize ?? null,
          mimeType: video.mimeType ?? null,
          duration: video.duration ?? null,
          thumbnailUrl: video.thumbnailUrl ?? null,
        }),
      );
      await this.carVideoRepository.save(carVideos);
    }

    // Log the listing creation
    await this.logsService.logListingAction(
      userId,
      savedListing.id,
      'created',
      {
        title: savedListing.title,
        price: savedListing.price,
        make: carDetail.make,
        model: carDetail.model,
        year: carDetail.year,
      },
    );

    return this.findOne(savedListing.id);
  }

  async findAll(page: number = 1, limit: number = 10) {
    // Get all active listings with promotions
    const now = new Date();
    const queryBuilder = this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.carDetail', 'carDetail')
      .leftJoinAndSelect('carDetail.images', 'images')
      .leftJoinAndSelect('carDetail.videos', 'videos')
      .leftJoinAndSelect('listing.seller', 'seller')
      .leftJoin(
        'listing_promotions',
        'promotion',
        'promotion.listingId = listing.id AND promotion.status = :promoStatus AND promotion.endDate > :now',
        { promoStatus: PromotionStatus.ACTIVE, now },
      )
      .addSelect('promotion.endDate', 'promotion_endDate')
      .where('listing.status IN (:...statuses)', {
        statuses: [ListingStatus.APPROVED, ListingStatus.SOLD],
      })
      .andWhere('listing.isActive = :isActive', { isActive: true })
      .orderBy('promotion.endDate', 'DESC', 'NULLS LAST') // Promoted listings first, sorted by endDate DESC
      .addOrderBy('listing.isFeatured', 'DESC') // Featured listings next
      .addOrderBy('listing.createdAt', 'DESC'); // Then by creation date

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    const listings = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

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
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find listings within a radius of a given location
   * Uses Haversine formula to calculate distance
   */
  async findNearby(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    page: number = 1,
    limit: number = 50,
  ) {
    // Validate inputs
    if (latitude < -90 || latitude > 90) {
      throw new BadRequestException('Invalid latitude. Must be between -90 and 90.');
    }
    if (longitude < -180 || longitude > 180) {
      throw new BadRequestException('Invalid longitude. Must be between -180 and 180.');
    }
    if (radiusKm < 0 || radiusKm > 1000) {
      throw new BadRequestException('Invalid radius. Must be between 0 and 1000 km.');
    }

    const sanitizedPage = Math.max(1, Number(page) || 1);
    const sanitizedLimit = Math.min(100, Math.max(1, Number(limit) || 50));

    // Haversine formula constants
    const earthRadiusKm = 6371;
    const radiusRad = radiusKm / earthRadiusKm;

    // Calculate bounding box for initial filtering (performance optimization)
    const latRad = (latitude * Math.PI) / 180;
    const deltaLat = radiusRad;
    const deltaLng = Math.asin(Math.sin(radiusRad) / Math.cos(latRad));

    const minLat = latitude - (deltaLat * 180) / Math.PI;
    const maxLat = latitude + (deltaLat * 180) / Math.PI;
    const minLng = longitude - (deltaLng * 180) / Math.PI;
    const maxLng = longitude + (deltaLng * 180) / Math.PI;

    // Query builder with bounding box filter
    const queryBuilder = this.listingRepository
      .createQueryBuilder('listing')
      .leftJoinAndSelect('listing.carDetail', 'carDetail')
      .leftJoinAndSelect('carDetail.images', 'images')
      .leftJoinAndSelect('listing.seller', 'seller')
      .where('listing.status = :status', { status: ListingStatus.APPROVED })
      .andWhere('listing.isActive = :isActive', { isActive: true })
      .andWhere('listing.latitude IS NOT NULL')
      .andWhere('listing.longitude IS NOT NULL')
      .andWhere('listing.latitude BETWEEN :minLat AND :maxLat', {
        minLat,
        maxLat,
      })
      .andWhere('listing.longitude BETWEEN :minLng AND :maxLng', {
        minLng,
        maxLng,
      });

    // Get all listings in bounding box
    const listings = await queryBuilder.getMany();

    // Calculate exact distance using Haversine formula and filter by radius
    type ListingWithDistance = {
      listing: ListingDetail;
      distance: number;
    };

    const listingsWithDistance = listings
      .map((listing): ListingWithDistance | null => {
        if (!listing.latitude || !listing.longitude) {
          return null;
        }

        const lat1Rad = (listing.latitude * Math.PI) / 180;
        const lat2Rad = latRad;
        const deltaLatRad = lat2Rad - lat1Rad;
        const deltaLngRad = ((listing.longitude - longitude) * Math.PI) / 180;

        const a =
          Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
          Math.cos(lat1Rad) *
            Math.cos(lat2Rad) *
            Math.sin(deltaLngRad / 2) *
            Math.sin(deltaLngRad / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = earthRadiusKm * c;

        return {
          listing,
          distance,
        };
      })
      .filter((item): item is ListingWithDistance => item !== null && item.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance);

    // Apply pagination
    const total = listingsWithDistance.length;
    const skip = (sanitizedPage - 1) * sanitizedLimit;
    const paginatedResults = listingsWithDistance.slice(
      skip,
      skip + sanitizedLimit,
    );

    // Transform decimal fields to numbers for JSON serialization
    const transformedListings = paginatedResults.map((item) => ({
      ...item.listing,
      latitude: item.listing.latitude != null ? Number(item.listing.latitude) : null,
      longitude: item.listing.longitude != null ? Number(item.listing.longitude) : null,
      price: Number(item.listing.price),
    }));

    return {
      listings: transformedListings,
      distances: paginatedResults.map((item) => ({
        listingId: item.listing.id,
        distance: Math.round(item.distance * 10) / 10, // Round to 1 decimal place
      })),
      pagination: {
        page: sanitizedPage,
        limit: sanitizedLimit,
        total,
        totalPages: Math.ceil(total / sanitizedLimit),
      },
      center: {
        latitude,
        longitude,
      },
      radius: radiusKm,
    };
  }

  async findOne(id: string, userId?: string): Promise<ListingDetail> {
    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: ['carDetail', 'carDetail.images', 'carDetail.videos', 'seller'],
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Load videos separately if not loaded (fallback)
    if (!listing.carDetail.videos || listing.carDetail.videos.length === 0) {
      const videos = await this.carVideoRepository.find({
        where: { carDetailId: listing.carDetailId },
        order: { sortOrder: 'ASC' },
      });
      listing.carDetail.videos = videos;
    } else {
      // Ensure videos are sorted by sortOrder
      listing.carDetail.videos.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    // Load images separately if not loaded (fallback)
    if (!listing.carDetail.images || listing.carDetail.images.length === 0) {
      const images = await this.carImageRepository.find({
        where: { carDetailId: listing.carDetailId },
        order: { sortOrder: 'ASC' },
      });
      listing.carDetail.images = images;
    } else {
      // Ensure images are sorted by sortOrder
      listing.carDetail.images.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    // Increment view count
    await this.listingRepository.update(id, {
      viewCount: listing.viewCount + 1,
    });

    // Track view history if user is authenticated
    if (userId) {
      this.trackViewHistory(userId, id, ViewAction.VIEW).catch((err) => {
        // Log but don't fail the request
        console.error('Failed to track view history:', err);
      });
    }

    // Transform decimal fields to numbers for JSON serialization
    const transformedListing = {
      ...listing,
      latitude: listing.latitude != null ? Number(listing.latitude) : null,
      longitude: listing.longitude != null ? Number(listing.longitude) : null,
      price: Number(listing.price),
    } as ListingDetail;

    return transformedListing;
  }

  async update(
    id: string,
    userId: string,
    updateListingDto: UpdateListingDto,
  ): Promise<ListingDetail> {
    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: ['carDetail', 'carDetail.images', 'carDetail.videos', 'seller'],
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Ensure videos are loaded
    if (!listing.carDetail.videos || listing.carDetail.videos.length === 0) {
      const videos = await this.carVideoRepository.find({
        where: { carDetailId: listing.carDetailId },
        order: { sortOrder: 'ASC' },
      });
      listing.carDetail.videos = videos;
    } else {
      listing.carDetail.videos.sort((a, b) => a.sortOrder - b.sortOrder);
    }

    if (listing.sellerId !== userId) {
      throw new ForbiddenException('You can only update your own listings');
    }

    const { carDetail, images, videos, ...listingData } = updateListingDto;

    // Store original values for comparison
    const originalValues = {
      ...listing,
      carDetail: listing.carDetail,
    };

    // Prepare changes object
    const changes: Record<string, any> = {};
    const carDetailChanges: Record<string, any> = {};

    // Check for listing changes
    (Object.entries(listingData) as [keyof UpdateListingDto, unknown][]) .forEach(([key, value]) => {
      const allowedKeys: Array<keyof UpdateListingDto> = [
        'title', 'description', 'price', 'priceType', 'location', 'city', 'state', 'country', 
        'latitude', 'longitude', 'carDetail', 'images'
      ];
      if (!allowedKeys.includes(key)) return;
      if (value !== undefined && hasActualChanges((originalValues as any)[key], value)) {
        (changes as any)[key] = value;
      }
    });

    // Check for car detail changes
    if (carDetail) {
      const allowedCarKeys = [
        'make','model','year','bodyType','fuelType','transmission','engineSize','enginePower','mileage','color',
        'numberOfDoors','numberOfSeats','condition','vin','registrationNumber','previousOwners','description','features'
      ] as const;
      (Object.entries(carDetail) as [typeof allowedCarKeys[number], unknown][]) .forEach(([key, value]) => {
        if (!allowedCarKeys.includes(key)) return;
        if (value !== undefined && hasActualChanges((originalValues.carDetail as any)[key], value)) {
          (carDetailChanges as any)[key] = value;
        }
      });
    }

    // Handle image changes
    let imageChangeType: 'none' | 'reorder-only' | 'substantive' = 'none';
    if (images && images.length > 0) {
      imageChangeType = this.analyzeImageChanges(listing.carDetail.images, images);
      
      if (imageChangeType === 'reorder-only') {
        // Apply image reordering immediately without admin review
        await this.applyImageReordering(listing.carDetailId, images, userId);
        
        // Log the reordering action
        await this.logsService.logListingAction(
          userId,
          id,
          'image_reordered',
          {
            title: listing.title,
            imageCount: images.length,
            changeType: 'reorder_only',
          },
        );
      }
    }

    // Handle video changes
    let videoChangeType: 'none' | 'reorder-only' | 'substantive' = 'none';
    if (videos && videos.length > 0) {
      videoChangeType = this.analyzeVideoChanges(listing.carDetail.videos || [], videos);

      if (videoChangeType === 'reorder-only') {
        await this.applyVideoReordering(listing.carDetailId, videos, userId);

        await this.logsService.logListingAction(
          userId,
          id,
          'video_reordered',
          {
            title: listing.title,
            videoCount: videos.length,
            changeType: 'reorder_only',
          },
        );
      }
    }

    // Determine if we need to create pending changes
    const hasSubstantiveChanges = 
      Object.keys(changes).length > 0 ||
      Object.keys(carDetailChanges).length > 0 ||
      imageChangeType === 'substantive' ||
      videoChangeType === 'substantive';

    if (hasSubstantiveChanges) {
      const pendingChange = this.pendingChangesRepository.create({
        listingId: id,
        changedByUserId: userId,
        changes: {
          listing: changes,
          carDetail: carDetailChanges,
          images: imageChangeType === 'substantive' ? images : [],
          videos: videoChangeType === 'substantive' ? videos : [],
        },
        originalValues: {
          listing: originalValues,
          carDetail: originalValues.carDetail,
        },
      });

      await this.pendingChangesRepository.save(pendingChange);

      // Only update status to pending if there are actual changes
      if (listing.status !== ListingStatus.PENDING) {
        await this.listingRepository.update(id, {
          status: ListingStatus.PENDING,
        });
      }
    }

    const updatedListing = await this.findOne(id);
    
    // Add metadata about the change type for frontend
    return {
      ...updatedListing,
      _metadata: {
        imageChangeType: imageChangeType,
        videoChangeType: videoChangeType,
        hasSubstantiveChanges: hasSubstantiveChanges,
      }
    } as any;
  }

  async remove(id: string, userId: string): Promise<{ message: string }> {
    const listing = await this.listingRepository.findOne({
      where: { id },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerId !== userId) {
      throw new ForbiddenException('You can only delete your own listings');
    }

    await this.listingRepository.remove(listing);

    return { message: 'Listing deleted successfully' };
  }

  async getPendingChanges(listingId: string): Promise<ListingPendingChanges[]> {
    return this.pendingChangesRepository.find({
      where: { listingId, isApplied: false },
      relations: ['changedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async applyPendingChanges(
    listingId: string,
    pendingChangeId: string,
    appliedByUserId: string,
  ): Promise<ListingDetail> {
    const pendingChange = await this.pendingChangesRepository.findOne({
      where: { id: pendingChangeId, listingId, isApplied: false },
    });

    if (!pendingChange) {
      throw new NotFoundException('Pending change not found');
    }

    const { changes } = pendingChange;

    // Apply listing changes (exclude images as they're handled separately)
    if (changes.listing && Object.keys(changes.listing).length > 0) {
      const { images, ...listingChanges } = changes.listing;
      if (Object.keys(listingChanges).length > 0) {
        await this.listingRepository.update(listingId, listingChanges);
      }
    }

    // Apply car detail changes (exclude images as they're handled separately)
    if (changes.carDetail && Object.keys(changes.carDetail).length > 0) {
      const listing = await this.listingRepository.findOne({
        where: { id: listingId },
        relations: ['carDetail'],
      });

      if (listing) {
        const { images, ...carDetailChanges } = changes.carDetail;
        if (Object.keys(carDetailChanges).length > 0) {
          await this.carDetailRepository.update(
            listing.carDetailId,
            carDetailChanges,
          );
        }
      }
    }

    // Apply image changes if present
    if (changes.images && Array.isArray(changes.images)) {
      const images = changes.images;
      if (images.length > 0) {
        const listing = await this.listingRepository.findOne({
          where: { id: listingId },
        });

        if (listing) {
          // Delete existing images first to avoid conflicts
          await this.carImageRepository.delete({
            carDetailId: listing.carDetailId,
          });

          // Create and save new images
          const carImages = images.map((image, index) =>
            this.carImageRepository.create({
              filename: image.filename,
              originalName: image.originalName,
              url: image.url,
              type: (image.type as ImageType) ?? ImageType.EXTERIOR,
              sortOrder: index,
              isPrimary: index === 0,
              alt: image.alt ?? null,
              carDetailId: listing.carDetailId,
              fileSize: image.fileSize ?? null,
              mimeType: image.mimeType ?? null,
            }),
          );
          await this.carImageRepository.save(carImages);
        }
      }
    }

    // Apply video changes if present
    if (changes.videos && Array.isArray(changes.videos)) {
      const videos = changes.videos;
      if (videos.length > 0) {
        const listing = await this.listingRepository.findOne({
          where: { id: listingId },
        });

        if (listing) {
          await this.carVideoRepository.delete({ carDetailId: listing.carDetailId });

          const carVideos = videos.map((video, index) =>
            this.carVideoRepository.create({
              filename: video.filename,
              originalName: video.originalName,
              url: video.url,
              sortOrder: index,
              isPrimary: index === 0,
              alt: video.alt ?? null,
              carDetailId: listing.carDetailId,
              fileSize: video.fileSize ?? null,
              mimeType: video.mimeType ?? null,
              duration: video.duration ?? null,
              thumbnailUrl: video.thumbnailUrl ?? null,
            }),
          );
          await this.carVideoRepository.save(carVideos);
        }
      }
    }

    // Mark pending change as applied
    await this.pendingChangesRepository.update(pendingChangeId, {
      isApplied: true,
      appliedAt: new Date(),
      appliedByUserId,
    });

    return this.findOne(listingId);
  }

  async rejectPendingChanges(
    pendingChangeId: string,
    rejectedByUserId: string,
    _rejectionReason?: string,
  ): Promise<void> {
    const pendingChange = await this.pendingChangesRepository.findOne({
      where: { id: pendingChangeId, isApplied: false },
    });

    if (!pendingChange) {
      throw new NotFoundException('Pending change not found');
    }

    // Mark as applied but with rejection (we can add a rejection field later)
    await this.pendingChangesRepository.update(pendingChangeId, {
      isApplied: true,
      appliedAt: new Date(),
      appliedByUserId: rejectedByUserId,
    });
  }

  async updateStatus(
    id: string,
    userId: string,
    status: string,
  ): Promise<ListingDetail> {
    const listing = await this.listingRepository.findOne({
      where: { id },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerId !== userId) {
      throw new ForbiddenException('You can only update your own listings');
    }

    // Validate status
    if (!Object.values(ListingStatus).includes(status as ListingStatus)) {
      throw new BadRequestException('Invalid status');
    }

    await this.listingRepository.update(id, {
      status: status as ListingStatus,
    });

    // If marking as sold, create a transaction record
    if (status === ListingStatus.SOLD) {
      try {
        const transactionNumber = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        const transaction = this.transactionRepository.create({
          transactionNumber,
          amount: listing.price,
          platformFee: 0, // No platform fee for offline transactions
          totalAmount: listing.price,
          status: TransactionStatus.COMPLETED, // Mark as completed since it's an offline sale
          paymentMethod: PaymentMethod.CASH, // Default to cash for offline transactions
          notes: 'Offline sale - marked as sold by seller',
          completedAt: new Date(),
          sellerId: listing.sellerId,
          listingId: listing.id,
        });

        await this.transactionRepository.save(transaction);
      } catch (error) {
        console.error('Error creating transaction:', error);
        throw new Error('Failed to create transaction record');
      }
    }

    return this.findOne(id);
  }

  async markAsSold(
    listingId: string,
    sellerId: string,
    markAsSoldDto: MarkAsSoldDto,
  ): Promise<{ listing: ListingDetail; transaction: Transaction }> {
    // Find listing
    const listing = await this.listingRepository.findOne({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Verify ownership
    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException('You can only mark your own listings as sold');
    }

    // Check if already sold
    if (listing.soldAt) {
      throw new BadRequestException('This listing has already been marked as sold');
    }

    // Verify buyer exists
    const buyer = await this.userRepository.findOne({
      where: { id: markAsSoldDto.buyerId },
    });

    if (!buyer) {
      throw new NotFoundException('Buyer not found');
    }

    // Prevent self-sale
    if (markAsSoldDto.buyerId === sellerId) {
      throw new BadRequestException('You cannot sell to yourself');
    }

    // Generate transaction number
    const year = new Date().getFullYear();
    const allTransactions = await this.transactionRepository.find();
    const matchingTransactions = allTransactions.filter((t) =>
      t.transactionNumber.startsWith(`TXN-${year}-`),
    );
    const count = matchingTransactions.length;
    const transactionNumber = `TXN-${year}-${String(count + 1).padStart(3, '0')}`;

    // Calculate platform fee (e.g., 5% of sale amount)
    const platformFee = Number((markAsSoldDto.amount * 0.05).toFixed(2));
    const totalAmount = markAsSoldDto.amount + platformFee;

    // Create transaction
    const transaction = this.transactionRepository.create({
      transactionNumber,
      sellerId,
      buyerId: markAsSoldDto.buyerId,
      listingId,
      amount: markAsSoldDto.amount,
      platformFee,
      totalAmount,
      paymentMethod: markAsSoldDto.paymentMethod,
      paymentReference: markAsSoldDto.paymentReference || null,
      notes: markAsSoldDto.notes || null,
      status: TransactionStatus.COMPLETED,
      completedAt: new Date(),
    } as Transaction);

    const savedTransaction = await this.transactionRepository.save(transaction);

    // Mark listing as sold
    await this.listingRepository.update(listingId, {
      soldAt: new Date(),
      isActive: false,
      status: ListingStatus.SOLD,
    });

    // Reload listing with relations
    const updatedListing = await this.findOne(listingId);

    // Create notification for seller
    try {
      await this.notificationsService.createNotification(
        sellerId,
        NotificationType.LISTING_SOLD,
        'Listing Sold',
        `Your listing "${updatedListing.title}" has been marked as sold.`,
        listingId,
        {
          listingTitle: updatedListing.title,
          buyerId: markAsSoldDto.buyerId,
          transactionNumber: transactionNumber,
          amount: markAsSoldDto.amount,
          soldAt: new Date().toISOString(),
        },
      );
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
    }

    // Create notification for buyer
    try {
      await this.notificationsService.createNotification(
        markAsSoldDto.buyerId,
        NotificationType.LISTING_SOLD,
        'Purchase Confirmed',
        `You have successfully purchased "${updatedListing.title}".`,
        listingId,
        {
          listingTitle: updatedListing.title,
          sellerId: sellerId,
          transactionNumber: transactionNumber,
          amount: markAsSoldDto.amount,
          purchasedAt: new Date().toISOString(),
        },
      );
    } catch (notificationError) {
      console.error('Error creating buyer notification:', notificationError);
    }

    return {
      listing: updatedListing,
      transaction: savedTransaction,
    };
  }

  async getListingBuyers(listingId: string, sellerId: string): Promise<User[]> {
    // Verify listing exists and belongs to seller
    const listing = await this.listingRepository.findOne({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerId !== sellerId) {
      throw new ForbiddenException('You can only view buyers for your own listings');
    }

    // Get all conversations for this listing
    const conversations = await this.conversationRepository.find({
      where: {
        listingId,
        sellerId,
      },
      relations: ['buyer'],
    });

    // Extract unique buyers
    const buyerMap = new Map<string, User>();
    conversations.forEach((conv) => {
      if (conv.buyer && !buyerMap.has(conv.buyerId)) {
        buyerMap.set(conv.buyerId, conv.buyer);
      }
    });

    return Array.from(buyerMap.values());
  }

  /**
   * Track view history for a user
   */
  private async trackViewHistory(
    userId: string,
    listingId: string,
    action: ViewAction,
    viewDuration?: number,
  ): Promise<void> {
    try {
      // Check if view was already tracked in the last minute (avoid duplicates)
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const recentView = await this.viewHistoryRepository.findOne({
        where: {
          userId,
          listingId,
          action,
          viewedAt: MoreThan(oneMinuteAgo),
        },
        order: { viewedAt: 'DESC' },
      });

      if (recentView) {
        // Update existing view with new duration if provided
        if (viewDuration !== undefined) {
          recentView.viewDuration = viewDuration;
          await this.viewHistoryRepository.save(recentView);
        }
        return;
      }

      // Create new view history entry
      const viewHistory = this.viewHistoryRepository.create({
        userId,
        listingId,
        action,
        viewDuration: viewDuration || null,
        viewedAt: new Date(),
      });

      await this.viewHistoryRepository.save(viewHistory);

      // Invalidate recommendations cache when user views a listing
      if (this.recommendationsService) {
        this.recommendationsService.invalidateUserCache(userId).catch((err) => {
          console.error('Failed to invalidate recommendations cache:', err);
        });
      }
    } catch (error) {
      // Log but don't fail the request
      console.error('Failed to track view history:', error);
    }
  }

  /**
   * Track user action (contact seller, favorite, etc.)
   */
  async trackUserAction(
    userId: string,
    listingId: string,
    action: ViewAction,
  ): Promise<void> {
    await this.trackViewHistory(userId, listingId, action);
  }
}

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { hasActualChanges } from '../../utils/value-comparison.util';
import { LogsService } from '../logs/logs.service';

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
    private readonly logsService: LogsService,
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
    // Get all active listings (both approved and sold) with proper ordering
    const [listings, total] = await this.listingRepository.findAndCount({
      where: [
        { status: ListingStatus.APPROVED, isActive: true },
        { status: ListingStatus.SOLD, isActive: true },
      ],
      relations: ['carDetail', 'carDetail.images', 'carDetail.videos', 'seller'],
      order: {
        status: 'ASC', // Approved first, then sold
        createdAt: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      listings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<ListingDetail> {
    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: ['carDetail', 'carDetail.images', 'carDetail.videos', 'seller'],
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    // Increment view count
    await this.listingRepository.update(id, {
      viewCount: listing.viewCount + 1,
    });

    return listing;
  }

  async update(
    id: string,
    userId: string,
    updateListingDto: UpdateListingDto,
  ): Promise<ListingDetail> {
    const listing = await this.listingRepository.findOne({
      where: { id },
      relations: ['carDetail', 'carDetail.images', 'carDetail.videos'],
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
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
        'title', 'description', 'price', 'priceType', 'location', 'city', 'state', 'country', 'carDetail', 'images'
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
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ListingPromotion, PromotionStatus, PaymentStatus } from '../../entities/listing-promotion.entity';
import { PromotionPricing } from '../../entities/promotion-pricing.entity';
import { ListingDetail, ListingStatus } from '../../entities/listing-detail.entity';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(ListingPromotion)
    private readonly promotionRepository: Repository<ListingPromotion>,
    @InjectRepository(PromotionPricing)
    private readonly pricingRepository: Repository<PromotionPricing>,
    @InjectRepository(ListingDetail)
    private readonly listingRepository: Repository<ListingDetail>,
  ) {}

  /**
   * Get pricing for all promotion packages
   */
  async getPricing() {
    const pricing = await this.pricingRepository.find({
      where: { isActive: true },
      order: { durationDays: 'ASC' },
    });

    return pricing.map((p) => ({
      packageType: p.packageType,
      price: Number(p.price),
      durationDays: p.durationDays,
      pricePerDay: Number(p.pricePerDay),
    }));
  }

  /**
   * Create a promotion request
   */
  async createPromotionRequest(
    listingId: string,
    packageType: string,
    userId: string,
  ) {
    // Verify listing exists and belongs to user
    const listing = await this.listingRepository.findOne({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerId !== userId) {
      throw new ForbiddenException('You can only promote your own listings');
    }

    if (listing.status !== ListingStatus.APPROVED) {
      throw new BadRequestException(
        'Only approved listings can be promoted',
      );
    }

    // Get pricing for the package
    const pricing = await this.pricingRepository.findOne({
      where: { packageType: packageType as any, isActive: true },
    });

    if (!pricing) {
      throw new NotFoundException('Promotion package not found');
    }

    // Check if there's already an active promotion
    const now = new Date();
    const activePromotion = await this.promotionRepository.findOne({
      where: {
        listingId,
        status: PromotionStatus.ACTIVE,
      },
    });

    if (activePromotion && activePromotion.endDate > now) {
      throw new BadRequestException(
        'This listing already has an active promotion',
      );
    }

    // Calculate end date
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + pricing.durationDays);

    // Create promotion with pending status
    const promotion = this.promotionRepository.create({
      listingId,
      sellerId: userId,
      packageType: packageType as any,
      startDate: null, // Will be set when activated
      endDate,
      amount: pricing.price,
      status: PromotionStatus.PENDING,
      paymentStatus: PaymentStatus.PENDING,
    });

    const savedPromotion = await this.promotionRepository.save(promotion);

    return {
      promotionId: savedPromotion.id,
      amount: Number(savedPromotion.amount),
      packageType: savedPromotion.packageType,
      durationDays: pricing.durationDays,
      endDate: savedPromotion.endDate,
      paymentUrl: `/promotions/${savedPromotion.id}/pay`,
    };
  }

  /**
   * Activate a promotion after payment is confirmed
   */
  async activatePromotion(promotionId: string) {
    const promotion = await this.promotionRepository.findOne({
      where: { id: promotionId },
      relations: ['listing'],
    });

    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    if (promotion.status === PromotionStatus.ACTIVE) {
      return promotion; // Already active
    }

    if (promotion.status === PromotionStatus.EXPIRED) {
      throw new BadRequestException('Promotion has expired');
    }

    // Set start date and activate
    promotion.startDate = new Date();
    promotion.status = PromotionStatus.ACTIVE;
    promotion.paymentStatus = PaymentStatus.COMPLETED;

    return await this.promotionRepository.save(promotion);
  }

  /**
   * Handle payment callback from payment gateway
   */
  async handlePaymentCallback(
    promotionId: string,
    paymentData: {
      transactionId: string;
      status: 'success' | 'failed';
      paymentMethod: string;
    },
  ) {
    const promotion = await this.promotionRepository.findOne({
      where: { id: promotionId },
    });

    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    if (paymentData.status === 'success') {
      promotion.paymentTransactionId = paymentData.transactionId;
      promotion.paymentMethod = paymentData.paymentMethod as any;
      promotion.paymentStatus = PaymentStatus.COMPLETED;
      promotion.status = PromotionStatus.ACTIVE;
      promotion.startDate = new Date();
    } else {
      promotion.paymentStatus = PaymentStatus.FAILED;
      promotion.status = PromotionStatus.CANCELLED;
    }

    return await this.promotionRepository.save(promotion);
  }

  /**
   * Get active promotions for a listing
   */
  async getActivePromotions(listingId?: string) {
    const query = this.promotionRepository
      .createQueryBuilder('promotion')
      .where('promotion.status = :status', { status: PromotionStatus.ACTIVE })
      .andWhere('promotion.endDate > :now', { now: new Date() });

    if (listingId) {
      query.andWhere('promotion.listingId = :listingId', { listingId });
    }

    return await query.getMany();
  }

  /**
   * Check and expire promotions that have passed their end date
   */
  async checkExpiredPromotions() {
    const now = new Date();
    const result = await this.promotionRepository.update(
      {
        status: PromotionStatus.ACTIVE,
        endDate: LessThan(now),
      },
      {
        status: PromotionStatus.EXPIRED,
      },
    );

    return result.affected || 0;
  }

  /**
   * Get promotions for a specific user
   */
  async getMyPromotions(userId: string) {
    return await this.promotionRepository.find({
      where: { sellerId: userId },
      relations: ['listing'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get promotion details by ID
   */
  async getPromotionDetails(promotionId: string, userId?: string) {
    const promotion = await this.promotionRepository.findOne({
      where: { id: promotionId },
      relations: ['listing', 'seller'],
    });

    if (!promotion) {
      throw new NotFoundException('Promotion not found');
    }

    // If userId is provided, verify ownership
    if (userId && promotion.sellerId !== userId) {
      throw new ForbiddenException('You can only view your own promotions');
    }

    return promotion;
  }
}


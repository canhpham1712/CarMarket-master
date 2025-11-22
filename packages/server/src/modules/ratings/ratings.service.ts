import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { SellerRating } from '../../entities/seller-rating.entity';
import { Transaction, TransactionStatus } from '../../entities/transaction.entity';
import { User } from '../../entities/user.entity';
import { CreateRatingDto } from './dto/create-rating.dto';
import { UpdateRatingDto } from './dto/update-rating.dto';
import { RatingQueryDto } from './dto/rating-query.dto';

@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(SellerRating)
    private readonly ratingRepository: Repository<SellerRating>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createRating(buyerId: string, createDto: CreateRatingDto): Promise<SellerRating> {
    // Validate seller exists
    const seller = await this.userRepository.findOne({
      where: { id: createDto.sellerId },
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    // Prevent self-rating
    if (buyerId === seller.id) {
      throw new BadRequestException('You cannot rate yourself');
    }

    // If transactionId is provided, validate it
    let transaction: Transaction | null = null;
    if (createDto.transactionId) {
      transaction = await this.transactionRepository.findOne({
        where: { id: createDto.transactionId },
        relations: ['seller', 'buyer'],
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      // Verify transaction belongs to buyer and seller
      if (transaction.buyerId !== buyerId) {
        throw new ForbiddenException('You can only rate sellers for your own transactions');
      }

      if (transaction.sellerId !== seller.id) {
        throw new BadRequestException('Transaction does not belong to this seller');
      }

      // Only allow rating for completed transactions
      if (transaction.status !== TransactionStatus.COMPLETED) {
        throw new BadRequestException('You can only rate sellers for completed transactions');
      }

      // Check if rating already exists for this transaction
      const existingRating = await this.ratingRepository.findOne({
        where: {
          buyerId,
          sellerId: seller.id,
          transactionId: createDto.transactionId,
        },
      });

      if (existingRating) {
        throw new BadRequestException(
          'You have already rated this seller for this transaction. You can update your existing rating instead.',
        );
      }
    } else {
      // If no transactionId, check if buyer has any completed transaction with seller
      const completedTransaction = await this.transactionRepository.findOne({
        where: {
          buyerId,
          sellerId: seller.id,
          status: TransactionStatus.COMPLETED,
        },
      });

      if (!completedTransaction) {
        throw new BadRequestException(
          'You can only rate sellers after completing a transaction with them',
        );
      }

      // Check if rating already exists (without transactionId)
      const existingRating = await this.ratingRepository.findOne({
        where: {
          buyerId,
          sellerId: seller.id,
          transactionId: IsNull(),
        },
      });

      if (existingRating) {
        throw new BadRequestException(
          'You have already rated this seller. You can update your existing rating instead.',
        );
      }
    }

    // Create rating
    const rating = this.ratingRepository.create({
      buyerId,
      sellerId: seller.id,
      transactionId: createDto.transactionId || null,
      rating: createDto.rating,
      comment: createDto.comment || null,
    });

    const savedRating = await this.ratingRepository.save(rating);

    // Load relations
    const ratingWithRelations = await this.ratingRepository.findOne({
      where: { id: savedRating.id },
      relations: ['seller', 'buyer', 'transaction'],
    });

    if (!ratingWithRelations) {
      throw new NotFoundException('Rating not found after creation');
    }

    return ratingWithRelations;
  }

  async getSellerRatings(sellerId: string, query: RatingQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [ratings, total] = await this.ratingRepository.findAndCount({
      where: { sellerId },
      relations: ['buyer', 'transaction'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      ratings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSellerRatingStats(sellerId: string) {
    const [ratings, count] = await this.ratingRepository.findAndCount({
      where: { sellerId },
    });

    if (count === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        ratingDistribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
      };
    }

    const sum = ratings.reduce((acc, rating) => acc + rating.rating, 0);
    const averageRating = Number((sum / count).toFixed(2));

    const ratingDistribution = {
      1: ratings.filter((r) => r.rating === 1).length,
      2: ratings.filter((r) => r.rating === 2).length,
      3: ratings.filter((r) => r.rating === 3).length,
      4: ratings.filter((r) => r.rating === 4).length,
      5: ratings.filter((r) => r.rating === 5).length,
    };

    return {
      averageRating,
      totalRatings: count,
      ratingDistribution,
    };
  }

  async updateRating(ratingId: string, buyerId: string, updateDto: UpdateRatingDto) {
    const rating = await this.ratingRepository.findOne({
      where: { id: ratingId },
      relations: ['buyer'],
    });

    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    // Verify ownership
    if (rating.buyerId !== buyerId) {
      throw new ForbiddenException('You can only update your own ratings');
    }

    // Update fields
    if (updateDto.rating !== undefined) {
      rating.rating = updateDto.rating;
    }

    if (updateDto.comment !== undefined) {
      rating.comment = updateDto.comment || null;
    }

    const updatedRating = await this.ratingRepository.save(rating);

    // Load relations
    const ratingWithRelations = await this.ratingRepository.findOne({
      where: { id: updatedRating.id },
      relations: ['seller', 'buyer', 'transaction'],
    });

    if (!ratingWithRelations) {
      throw new NotFoundException('Rating not found after update');
    }

    return ratingWithRelations;
  }

  async deleteRating(ratingId: string, buyerId: string) {
    const rating = await this.ratingRepository.findOne({
      where: { id: ratingId },
    });

    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    // Verify ownership
    if (rating.buyerId !== buyerId) {
      throw new ForbiddenException('You can only delete your own ratings');
    }

    await this.ratingRepository.remove(rating);

    return { message: 'Rating deleted successfully' };
  }

  async getRatingById(ratingId: string): Promise<SellerRating> {
    const rating = await this.ratingRepository.findOne({
      where: { id: ratingId },
      relations: ['seller', 'buyer', 'transaction'],
    });

    if (!rating) {
      throw new NotFoundException('Rating not found');
    }

    return rating;
  }
}


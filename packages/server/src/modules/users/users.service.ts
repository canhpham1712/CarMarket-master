import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';
import { ListingDetail, ListingStatus } from '../../entities/listing-detail.entity';
import { SellerRating } from '../../entities/seller-rating.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SellerVerificationService } from '../seller-verification/seller-verification.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ListingDetail)
    private readonly listingRepository: Repository<ListingDetail>,
    @InjectRepository(SellerRating)
    private readonly ratingRepository: Repository<SellerRating>,
    @Inject(forwardRef(() => SellerVerificationService))
    private readonly sellerVerificationService: SellerVerificationService,
  ) {}

  async getProfile(userId: string): Promise<User & { ratingStats?: any }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'phoneNumber',
        'profileImage',
        'bio',
        'location',
        'dateOfBirth',
        'role',
        'isActive',
        'isEmailVerified',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Calculate rating statistics
    const ratingStats = await this.getRatingStats(userId);

    return {
      ...user,
      ratingStats,
    } as User & { ratingStats: any };
  }

  async getRatingStats(userId: string) {
    const [ratings, count] = await this.ratingRepository.findAndCount({
      where: { sellerId: userId },
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

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being changed and if it's already taken
    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      const existingUser = await this.userRepository.findOne({
        where: { email: updateProfileDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email is already in use');
      }
    }

    // Check if phone number is being changed
    const oldPhoneNumber = user.phoneNumber;
    const newPhoneNumber = updateProfileDto.phoneNumber;
    const phoneNumberChanged = newPhoneNumber && 
      newPhoneNumber.trim() !== (oldPhoneNumber || '').trim();

    // Update user fields
    Object.assign(user, updateProfileDto);

    const updatedUser = await this.userRepository.save(user);

    // If phone number changed and user has verification, invalidate phone verification
    if (phoneNumberChanged && newPhoneNumber) {
      try {
        await this.sellerVerificationService.invalidatePhoneVerification(userId, newPhoneNumber.trim());
      } catch (error) {
        // Log error but don't fail profile update
        console.error('Error invalidating phone verification:', error);
      }
    }

    // Remove password from response
    delete updatedUser.password;

    return updatedUser;
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'password'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    if (!user.password) {
      throw new BadRequestException('User password not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await this.userRepository.update(userId, {
      password: hashedNewPassword,
    });

    return { message: 'Password changed successfully' };
  }

  async getUserListings(
    userId: string,
    page: number = 1,
    limit: number = 10,
    publicView: boolean = false,
  ) {
    // Build where condition
    const whereCondition: any = { sellerId: userId };

    // For public view (when someone else views seller's profile), exclude rejected listings
    // But still show approved and sold listings
    if (publicView) {
      whereCondition.status = In([ListingStatus.APPROVED, ListingStatus.SOLD]);
    }

    const [listings, total] = await this.listingRepository.findAndCount({
      where: whereCondition,
      relations: ['carDetail', 'carDetail.images', 'seller'],
      order: { createdAt: 'DESC' },
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

  async deactivateAccount(userId: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.update(userId, {
      isActive: false,
    });

    return { message: 'Account deactivated successfully' };
  }

  async reactivateAccount(userId: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.update(userId, {
      isActive: true,
    });

    return { message: 'Account reactivated successfully' };
  }
}

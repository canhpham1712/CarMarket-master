import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { PhoneVerificationOtp } from '../../../entities/phone-verification-otp.entity';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly otpLength: number;
  private readonly otpExpiryMinutes: number;
  private readonly maxAttempts: number;

  constructor(
    @InjectRepository(PhoneVerificationOtp)
    private readonly otpRepository: Repository<PhoneVerificationOtp>,
    private readonly configService: ConfigService,
  ) {
    this.otpLength = parseInt(this.configService.get<string>('OTP_LENGTH', '6'));
    this.otpExpiryMinutes = parseInt(this.configService.get<string>('OTP_EXPIRY_MINUTES', '1')); // Changed to 1 minute
    this.maxAttempts = parseInt(this.configService.get<string>('OTP_MAX_ATTEMPTS', '3'));
  }

  /**
   * Generate a random OTP code
   */
  generateOtp(): string {
    const min = Math.pow(10, this.otpLength - 1);
    const max = Math.pow(10, this.otpLength) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  /**
   * Hash OTP code using bcrypt
   */
  async hashOtp(otp: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(otp, saltRounds);
  }

  /**
   * Verify OTP code
   */
  async verifyOtp(plainOtp: string, hashedOtp: string): Promise<boolean> {
    return bcrypt.compare(plainOtp, hashedOtp);
  }

  /**
   * Create and save OTP for a user
   */
  async createOtp(userId: string, phoneNumber: string): Promise<{ otp: string; expiresAt: Date }> {
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = phoneNumber.replace(/\s+/g, '').trim();
    
    // Delete any existing OTP for this user and phone number (check both formats)
    await this.otpRepository.delete({
      userId,
      phoneNumber: normalizedPhone,
    });
    
    // Also delete with original format if different
    if (normalizedPhone !== phoneNumber) {
      await this.otpRepository.delete({
        userId,
        phoneNumber: phoneNumber,
      });
    }

    // Generate new OTP
    const plainOtp = this.generateOtp();
    const hashedOtp = await this.hashOtp(plainOtp);

    // Calculate expiration time
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.otpExpiryMinutes);
    
    this.logger.debug(`Created OTP for userId: ${userId}, phone: ${normalizedPhone}, OTP: ${plainOtp}, expiresAt: ${expiresAt.toISOString()}`);

    // Save to database (use normalized phone number)
    const otpRecord = this.otpRepository.create({
      userId,
      phoneNumber: normalizedPhone,
      otpCode: hashedOtp,
      expiresAt,
      attempts: 0,
      maxAttempts: this.maxAttempts,
    });

    await this.otpRepository.save(otpRecord);

    return {
      otp: plainOtp, // Return plain OTP for sending via SMS
      expiresAt,
    };
  }

  /**
   * Verify OTP code for a user
   */
  async verifyOtpCode(
    userId: string,
    phoneNumber: string,
    otpCode: string,
  ): Promise<{ success: boolean; message: string }> {
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = phoneNumber.replace(/\s+/g, '').trim();
    
    this.logger.debug(`Verifying OTP for userId: ${userId}, phone: ${normalizedPhone}, otpCode: ${otpCode}`);
    
    // Find active OTP record - try normalized phone first
    let otpRecord = await this.otpRepository.findOne({
      where: {
        userId,
        phoneNumber: normalizedPhone,
        expiresAt: MoreThan(new Date()), // Not expired
      },
    });

    // If not found with normalized, try original format
    if (!otpRecord) {
      otpRecord = await this.otpRepository.findOne({
        where: {
          userId,
          phoneNumber: phoneNumber,
          expiresAt: MoreThan(new Date()),
        },
      });
    }

    if (!otpRecord) {
      this.logger.warn(`OTP not found for userId: ${userId}, phone: ${normalizedPhone}`);
      
      // Try to find any OTP for this user to provide better error message
      const anyOtp = await this.otpRepository.findOne({
        where: { userId, phoneNumber: normalizedPhone },
      });
      
      if (!anyOtp) {
        // Try with original phone format
        const anyOtpOriginal = await this.otpRepository.findOne({
          where: { userId, phoneNumber: phoneNumber },
        });
        
        if (anyOtpOriginal) {
          if (anyOtpOriginal.isExpired) {
            throw new BadRequestException('OTP has expired. Please request a new OTP.');
          }
          if (anyOtpOriginal.isVerified) {
            throw new BadRequestException('This OTP has already been used. Please request a new OTP.');
          }
        }
      } else {
        if (anyOtp.isExpired) {
          throw new BadRequestException('OTP has expired. Please request a new OTP.');
        }
        if (anyOtp.isVerified) {
          throw new BadRequestException('This OTP has already been used. Please request a new OTP.');
        }
      }
      
      throw new NotFoundException('OTP not found or expired. Please request a new OTP.');
    }
    
    this.logger.debug(`Found OTP record: id=${otpRecord.id}, attempts=${otpRecord.attempts}, verified=${otpRecord.isVerified}`);

    // Check if already verified
    if (otpRecord.isVerified) {
      throw new BadRequestException('Phone number is already verified.');
    }

    // Check if exceeded max attempts
    if (otpRecord.isExceededMaxAttempts) {
      throw new BadRequestException(
        'Maximum verification attempts exceeded. Please request a new OTP.',
      );
    }

    // Verify OTP code (trim and normalize)
    const normalizedOtp = otpCode.trim();
    this.logger.debug(`Comparing OTP: input="${normalizedOtp}", hashed="${otpRecord.otpCode.substring(0, 20)}..."`);
    const isValid = await this.verifyOtp(normalizedOtp, otpRecord.otpCode);
    this.logger.debug(`OTP verification result: ${isValid}`);

    // Increment attempts
    otpRecord.attempts += 1;
    await this.otpRepository.save(otpRecord);

    if (!isValid) {
      const remainingAttempts = otpRecord.maxAttempts - otpRecord.attempts;
      if (remainingAttempts <= 0) {
        throw new BadRequestException(
          'Invalid OTP code. Maximum attempts exceeded. Please request a new OTP.',
        );
      }
      throw new BadRequestException(
        `Invalid OTP code. ${remainingAttempts} attempt(s) remaining.`,
      );
    }

    // Mark as verified
    otpRecord.verifiedAt = new Date();
    await this.otpRepository.save(otpRecord);

    return {
      success: true,
      message: 'Phone number verified successfully.',
    };
  }

  /**
   * Get active OTP for a user (for checking status)
   */
  async getActiveOtp(userId: string, phoneNumber: string): Promise<PhoneVerificationOtp | null> {
    return this.otpRepository.findOne({
      where: {
        userId,
        phoneNumber,
        expiresAt: MoreThan(new Date()),
        verifiedAt: IsNull(),
      },
    });
  }

  /**
   * Delete expired OTPs (cleanup job)
   */
  async deleteExpiredOtps(): Promise<number> {
    const result = await this.otpRepository.delete({
      expiresAt: MoreThan(new Date()),
    });
    return result.affected || 0;
  }

  /**
   * Delete OTP for a user (after successful verification)
   */
  async deleteOtp(userId: string, phoneNumber: string): Promise<void> {
    await this.otpRepository.delete({
      userId,
      phoneNumber,
    });
  }
}


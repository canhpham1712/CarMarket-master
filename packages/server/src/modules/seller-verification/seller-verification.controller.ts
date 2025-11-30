import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  Inject,
  Logger,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { SellerVerificationService } from './seller-verification.service';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { VerifyPhoneDto, RequestPhoneVerificationDto } from './dto/verify-phone.dto';
import { OtpService } from './services/otp.service';
import type { SmsService } from './services/sms.service';

@Controller('seller-verification')
export class SellerVerificationController {
  private readonly logger = new Logger(SellerVerificationController.name);

  constructor(
    private readonly verificationService: SellerVerificationService,
    private readonly otpService: OtpService,
    @Inject('SMS_SERVICE')
    private readonly smsService: SmsService,
  ) {}

  /**
   * Get current user's verification status
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getMyVerificationStatus(@CurrentUser() user: User) {
    const status = await this.verificationService.getVerificationStatus(user.id);
    // Explicitly return null if no verification exists (instead of undefined)
    return status || null;
  }

  /**
   * Submit verification request
   */
  @Post('submit')
  @UseGuards(JwtAuthGuard)
  async submitVerification(
    @CurrentUser() user: User,
    @Body() submitDto: SubmitVerificationDto,
  ) {
    this.logger.debug(`Submit verification request from user ${user.id}`, submitDto);
    try {
      const result = await this.verificationService.submitVerification(user.id, submitDto);
      this.logger.debug(`Verification submitted successfully for user ${user.id}`);
      return result;
    } catch (error: any) {
      this.logger.error(`Error submitting verification for user ${user.id}:`, error);
      throw error;
    }
  }

  /**
   * Admin: Get all pending verifications
   */
  @Get('admin/pending')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('admin:dashboard')
  async getPendingVerifications(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.verificationService.getPendingVerifications(page, limit);
  }

  /**
   * Admin: Get verification by ID
   */
  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('admin:dashboard')
  async getVerificationById(@Param('id') id: string) {
    return this.verificationService.getVerificationById(id);
  }

  /**
   * Admin: Review and approve/reject verification
   */
  @Put('admin/:id/review')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('admin:dashboard')
  async reviewVerification(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() reviewDto: ReviewVerificationDto,
  ) {
    return this.verificationService.reviewVerification(
      id,
      user.id,
      reviewDto,
    );
  }

  /**
   * Request OTP for phone verification
   */
  @Post('request-phone-verification')
  @UseGuards(JwtAuthGuard)
  async requestPhoneVerification(
    @CurrentUser() user: User,
    @Body() requestDto: RequestPhoneVerificationDto,
  ) {
    // Create OTP
    const { otp, expiresAt } = await this.otpService.createOtp(
      user.id,
      requestDto.phoneNumber,
    );

    // Send OTP via SMS (mock service logs to console)
    await this.smsService.sendOtp(requestDto.phoneNumber, otp);

    return {
      success: true,
      message: 'OTP has been sent to your phone number',
      expiresAt,
    };
  }

  /**
   * Verify phone number with OTP code
   */
  @Post('verify-phone')
  @UseGuards(JwtAuthGuard)
  async verifyPhone(
    @CurrentUser() user: User,
    @Body() verifyDto: VerifyPhoneDto,
  ) {
    try {
      // Verify OTP code
      const result = await this.otpService.verifyOtpCode(
        user.id,
        verifyDto.phoneNumber,
        verifyDto.otpCode,
      );

      if (result.success) {
        this.logger.debug(`OTP verified successfully for userId: ${user.id}`);
        
        // Mark phone as verified in seller verification
        try {
          await this.verificationService.verifyPhoneNumber(
            user.id,
            verifyDto.phoneNumber,
          );
          this.logger.debug(`Phone number marked as verified for userId: ${user.id}`);
        } catch (error: any) {
          // Log error but don't fail - OTP is already verified
          this.logger.warn(`Error updating verification record for userId: ${user.id}`, error.message);
        }

        // Delete OTP after successful verification
        try {
          await this.otpService.deleteOtp(user.id, verifyDto.phoneNumber);
          this.logger.debug(`OTP deleted for userId: ${user.id}`);
        } catch (error: any) {
          // Log error but don't fail - OTP is already verified
          this.logger.warn(`Error deleting OTP for userId: ${user.id}`, error.message);
        }
      }

      const response = {
        success: true,
        message: result.message,
        isPhoneVerified: true,
      };
      
      this.logger.debug(`Returning verify phone response:`, response);
      return response;
    } catch (error: any) {
      this.logger.error(`Error in verifyPhone endpoint:`, error.message, error.stack);
      // Re-throw to let NestJS handle it properly
      throw error;
    }
  }

  /**
   * Check if user is verified seller
   */
  @Get('check/:userId')
  async checkIfVerified(@Param('userId') userId: string) {
    const isVerified = await this.verificationService.isVerifiedSeller(userId);
    const level = await this.verificationService.getVerificationLevel(userId);
    return {
      isVerified,
      level,
    };
  }

  /**
   * Upload verification documents
   */
  @Post('upload-documents')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FilesInterceptor('documents', 10, {
      storage: diskStorage({
        destination: './uploads/verification-documents',
        filename: (_req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|pdf)$/i)) {
          return cb(new Error('Only image files (JPG, PNG, GIF) and PDF files are allowed!'), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
        files: 10, // Maximum 10 files
      },
    }),
  )
  async uploadDocuments(
    @CurrentUser() _user: User,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<{
    documents: Array<{
      filename: string;
      url: string;
      originalName: string;
      fileSize: number;
      mimeType: string;
    }>;
  }> {
    if (!files || files.length === 0) {
      throw new Error('No files uploaded');
    }

    const documents = files.map((file) => ({
      filename: file.filename,
      originalName: file.originalname,
      url: `/uploads/verification-documents/${file.filename}`,
      fileSize: file.size,
      mimeType: file.mimetype,
    }));

    return { documents };
  }
}


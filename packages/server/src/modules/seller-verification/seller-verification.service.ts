import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { SellerVerification, SellerVerificationStatus, VerificationLevel } from '../../entities/seller-verification.entity';
import { SellerVerificationDocument, VerificationDocumentType } from '../../entities/seller-verification-document.entity';
import { User } from '../../entities/user.entity';
import { SubmitVerificationDto } from './dto/submit-verification.dto';
import { ReviewVerificationDto } from './dto/review-verification.dto';

@Injectable()
export class SellerVerificationService {
  constructor(
    @InjectRepository(SellerVerification)
    private readonly verificationRepository: Repository<SellerVerification>,
    @InjectRepository(SellerVerificationDocument)
    private readonly documentRepository: Repository<SellerVerificationDocument>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Get verification status for a user
   * Returns verification with user data merged (hybrid approach)
   * Also checks if phone verification deadline has passed and revokes if needed
   */
  async getVerificationStatus(userId: string): Promise<SellerVerification | null> {
    // Check and revoke expired verifications first
    await this.checkAndRevokeExpiredPhoneVerifications();

    const verification = await this.verificationRepository.findOne({
      where: { userId },
      relations: ['documents', 'reviewer', 'user'],
      order: { createdAt: 'DESC' },
    });

    if (!verification) {
      return null;
    }

    // Get user data to merge
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (user) {
      // Merge user data into verification (user data takes priority)
      // This ensures we always show the latest profile information
      verification.phoneNumber = user.phoneNumber || verification.phoneNumber;
      verification.fullName = user.fullName || verification.fullName;
      verification.dateOfBirth = user.dateOfBirth || verification.dateOfBirth;
      // Address can come from user.location or verification.address
      if (user.location && !verification.address) {
        verification.address = user.location;
      }
    }

    return verification;
  }

  /**
   * Submit verification request
   * Validates user profile completeness and merges with user data
   */
  async submitVerification(
    userId: string,
    submitDto: SubmitVerificationDto,
  ): Promise<SellerVerification> {
    // First, get user data to validate and merge
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate profile completeness (Hybrid approach: prefer user data, but allow override)
    const missingFields: string[] = [];
    if (!user.phoneNumber && !submitDto.phoneNumber) {
      missingFields.push('phone number');
    }
    if (!user.firstName || !user.lastName) {
      missingFields.push('full name (first name and last name)');
    }
    if (!user.dateOfBirth && !submitDto.dateOfBirth) {
      missingFields.push('date of birth');
    }

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Please complete your profile first. Missing: ${missingFields.join(', ')}. ` +
        'You can update your profile in the Profile page.',
      );
    }

    // Check if user already has a verification
    const existingVerification = await this.verificationRepository.findOne({
      where: { userId },
    });

    if (existingVerification) {
      // Allow upgrade if user is approved at a lower level and submitting a higher level
      const levelOrder = {
        [VerificationLevel.BASIC]: 1,
        [VerificationLevel.STANDARD]: 2,
        [VerificationLevel.PREMIUM]: 3,
      };
      
      const currentLevelOrder = levelOrder[existingVerification.verificationLevel] || 0;
      const submittedLevelOrder = levelOrder[submitDto.verificationLevel || VerificationLevel.BASIC] || 0;
      const isUpgrade = submittedLevelOrder > currentLevelOrder;
      
      // Special case: If user needs to re-verify phone number (phone changed but not verified)
      const needsPhoneReVerification = 
        existingVerification.status === SellerVerificationStatus.APPROVED &&
        !existingVerification.isPhoneVerified &&
        existingVerification.phoneVerificationDeadline &&
        submitDto.verificationLevel === VerificationLevel.BASIC;
      
      if (existingVerification.status === SellerVerificationStatus.APPROVED) {
        // Allow if upgrading to a higher level
        if (isUpgrade) {
          // If upgrading, allow resubmission
        } else if (needsPhoneReVerification) {
          // Allow resubmission at basic level if phone needs to be re-verified
        } else {
          throw new ConflictException('User is already verified at this or a higher level');
        }
      } else if (
        existingVerification.status === SellerVerificationStatus.PENDING ||
        existingVerification.status === SellerVerificationStatus.IN_REVIEW
      ) {
        // Allow upgrade even if pending, but only to higher level
        if (!isUpgrade) {
          throw new ConflictException('Verification request is already pending review');
        }
        // If upgrading, allow resubmission with new level
      }
    }

    // Determine verification level based on submitted data
    let verificationLevel = VerificationLevel.BASIC;
    if (submitDto.documents && submitDto.documents.length > 0) {
      const hasIdentityDoc = submitDto.documents.some(
        (doc) =>
          doc.documentType === VerificationDocumentType.IDENTITY_CARD ||
          doc.documentType === VerificationDocumentType.PASSPORT,
      );
      const hasBankDoc = submitDto.documents.some(
        (doc) => doc.documentType === VerificationDocumentType.BANK_STATEMENT,
      );
      const hasAddressDoc = submitDto.documents.some(
        (doc) => doc.documentType === VerificationDocumentType.ADDRESS_PROOF,
      );

      if (hasIdentityDoc && hasBankDoc && hasAddressDoc) {
        verificationLevel = VerificationLevel.PREMIUM;
      } else if (hasIdentityDoc) {
        verificationLevel = VerificationLevel.STANDARD;
      }
    }

    // Use provided level or calculated level
    // If upgrading, use the submitted level; otherwise use calculated level
    let finalLevel = submitDto.verificationLevel || verificationLevel;
    
    // If user is upgrading, ensure we use the higher level
    if (existingVerification && existingVerification.status === SellerVerificationStatus.APPROVED) {
      const levelOrder = {
        [VerificationLevel.BASIC]: 1,
        [VerificationLevel.STANDARD]: 2,
        [VerificationLevel.PREMIUM]: 3,
      };
      const currentLevelOrder = levelOrder[existingVerification.verificationLevel] || 0;
      const submittedLevelOrder = levelOrder[finalLevel] || 0;
      
      // Only allow if upgrading to higher level
      if (submittedLevelOrder <= currentLevelOrder) {
        throw new ConflictException(
          `You are already verified at ${existingVerification.verificationLevel} level. Please select a higher level to upgrade.`
        );
      }
    }

    // Helper to convert undefined to null for nullable fields
    const toNull = <T>(value: T | undefined): T | null => value ?? null;

    // Hybrid approach: Use user data as primary source, allow override from submitDto
    // This creates a snapshot but prioritizes user profile data
    const phoneNumber = submitDto.phoneNumber || user.phoneNumber || null;
    const fullName = submitDto.fullName || user.fullName || null;
    const dateOfBirth = submitDto.dateOfBirth
      ? new Date(submitDto.dateOfBirth)
      : user.dateOfBirth || null;
    const address = submitDto.address || user.location || null;

    // Create or update verification (snapshot approach - stores data for admin review)
    // When upgrading, reset status to PENDING for admin review
    const verification = existingVerification
      ? this.verificationRepository.merge(existingVerification, {
          status: SellerVerificationStatus.PENDING, // Reset to pending when upgrading
          verificationLevel: finalLevel,
          // Store snapshot but user data takes priority when displaying
          phoneNumber,
          fullName,
          idNumber: toNull(submitDto.idNumber), // Verification-specific, not in user table
          dateOfBirth,
          address,
          city: submitDto.city || null,
          state: toNull(submitDto.state),
          country: submitDto.country || 'Vietnam',
          // Bank info is verification-specific
          bankName: toNull(submitDto.bankName),
          bankAccountNumber: toNull(submitDto.bankAccountNumber),
          accountHolderName: toNull(submitDto.accountHolderName),
          submittedAt: new Date(),
          rejectionReason: null,
          adminNotes: null,
        })
      : this.verificationRepository.create({
          userId,
          status: SellerVerificationStatus.PENDING,
          verificationLevel: finalLevel,
          phoneNumber,
          fullName,
          idNumber: toNull(submitDto.idNumber),
          dateOfBirth,
          address,
          city: submitDto.city || null,
          state: toNull(submitDto.state),
          country: submitDto.country || 'Vietnam',
          bankName: toNull(submitDto.bankName),
          bankAccountNumber: toNull(submitDto.bankAccountNumber),
          accountHolderName: toNull(submitDto.accountHolderName),
        });

    const savedVerification = await this.verificationRepository.save(verification);

    // Save documents
    if (submitDto.documents && submitDto.documents.length > 0) {
      // Delete old documents if updating
      if (existingVerification) {
        await this.documentRepository.delete({ verificationId: savedVerification.id });
      }

      const documents = submitDto.documents.map((doc) =>
        this.documentRepository.create({
          verificationId: savedVerification.id,
          documentType: doc.documentType,
          documentNumber: toNull(doc.documentNumber),
          fileName: doc.fileName,
          fileUrl: doc.fileUrl,
          fileSize: toNull(doc.fileSize),
          mimeType: toNull(doc.mimeType),
        }),
      );

      await this.documentRepository.save(documents);
    }

    return this.verificationRepository.findOne({
      where: { id: savedVerification.id },
      relations: ['documents'],
    }) as Promise<SellerVerification>;
  }

  /**
   * Admin: Review and approve/reject verification
   */
  async reviewVerification(
    verificationId: string,
    adminId: string,
    reviewDto: ReviewVerificationDto,
  ): Promise<SellerVerification> {
    const verification = await this.verificationRepository.findOne({
      where: { id: verificationId },
      relations: ['documents', 'user'],
    });

    if (!verification) {
      throw new NotFoundException('Verification request not found');
    }

    if (verification.status === SellerVerificationStatus.APPROVED) {
      throw new BadRequestException('Verification is already approved');
    }

    if (reviewDto.status === SellerVerificationStatus.APPROVED) {
      verification.status = SellerVerificationStatus.APPROVED;
      verification.approvedAt = new Date();
      verification.reviewedBy = adminId;
      verification.reviewedAt = new Date();
      verification.rejectionReason = null;
      verification.adminNotes = reviewDto.adminNotes || null;

      // Mark phone as verified if not already
      if (!verification.isPhoneVerified) {
        verification.isPhoneVerified = true;
        verification.phoneVerifiedAt = new Date();
      }

      // Mark bank as verified if provided
      if (verification.bankAccountNumber) {
        verification.isBankVerified = true;
        verification.bankVerifiedAt = new Date();
      }

      // Mark all documents as verified
      if (verification.documents && verification.documents.length > 0) {
        await Promise.all(
          verification.documents.map((doc) =>
            this.documentRepository.update(doc.id, {
              isVerified: true,
              verifiedBy: adminId,
              verifiedAt: new Date(),
            }),
          ),
        );
      }
    } else if (reviewDto.status === SellerVerificationStatus.REJECTED) {
      if (!reviewDto.rejectionReason) {
        throw new BadRequestException('Rejection reason is required');
      }
      verification.status = SellerVerificationStatus.REJECTED;
      verification.reviewedBy = adminId;
      verification.reviewedAt = new Date();
      verification.rejectionReason = reviewDto.rejectionReason;
      verification.adminNotes = reviewDto.adminNotes || null;
    } else if (reviewDto.status === SellerVerificationStatus.IN_REVIEW) {
      verification.status = SellerVerificationStatus.IN_REVIEW;
      verification.reviewedBy = adminId;
      verification.reviewedAt = new Date();
      verification.adminNotes = reviewDto.adminNotes || null;
    }

    return this.verificationRepository.save(verification);
  }

  /**
   * Admin: Get all pending verifications
   * Returns verifications with merged user data
   */
  async getPendingVerifications(page: number = 1, limit: number = 10) {
    const [verifications, total] = await this.verificationRepository.findAndCount({
      where: [
        { status: SellerVerificationStatus.PENDING },
        { status: SellerVerificationStatus.IN_REVIEW },
      ],
      relations: ['user', 'documents', 'reviewer'],
      order: { submittedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    // Merge user data for each verification (user data takes priority)
    const verificationsWithUserData = verifications.map((verification) => {
      if (verification.user) {
        verification.phoneNumber = verification.user.phoneNumber || verification.phoneNumber;
        verification.fullName = verification.user.fullName || verification.fullName;
        verification.dateOfBirth = verification.user.dateOfBirth || verification.dateOfBirth;
        if (verification.user.location && !verification.address) {
          verification.address = verification.user.location;
        }
      }
      return verification;
    });

    return {
      verifications: verificationsWithUserData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin: Get verification by ID
   * Returns verification with merged user data (user data takes priority)
   */
  async getVerificationById(verificationId: string): Promise<SellerVerification> {
    const verification = await this.verificationRepository.findOne({
      where: { id: verificationId },
      relations: ['user', 'documents', 'reviewer'],
    });

    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    // Merge user data (user data takes priority for display)
    if (verification.user) {
      verification.phoneNumber = verification.user.phoneNumber || verification.phoneNumber;
      verification.fullName = verification.user.fullName || verification.fullName;
      verification.dateOfBirth = verification.user.dateOfBirth || verification.dateOfBirth;
      if (verification.user.location && !verification.address) {
        verification.address = verification.user.location;
      }
    }

    return verification;
  }

  /**
   * Verify phone number (automatically after OTP verification)
   * Phone verification is automatic and does NOT require admin review.
   * Creates verification record if it doesn't exist.
   * Note: The overall seller verification status may still be PENDING (requiring admin review),
   * but phone verification itself is automatically approved.
   */
  async verifyPhoneNumber(userId: string, phoneNumber: string): Promise<void> {
    let verification = await this.verificationRepository.findOne({
      where: { userId },
    });

    if (!verification) {
      // Create new verification record if it doesn't exist
      // Phone verification is automatically approved (no admin review needed)
      verification = this.verificationRepository.create({
        userId,
        status: SellerVerificationStatus.PENDING, // Overall verification still pending admin review
        verificationLevel: VerificationLevel.BASIC,
        phoneNumber,
        isPhoneVerified: true, // Phone verification is automatic, no admin review
        phoneVerifiedAt: new Date(),
        phoneVerificationDeadline: null, // Clear deadline when verified
      });
    } else {
      // Update existing verification
      // Phone verification is automatically approved (no admin review needed)
      verification.isPhoneVerified = true;
      verification.phoneVerifiedAt = new Date();
      verification.phoneNumber = phoneNumber;
      verification.phoneVerificationDeadline = null; // Clear deadline when verified
    }

    await this.verificationRepository.save(verification);
  }

  /**
   * Invalidate phone verification when phone number is changed
   * Sets a 2-day deadline for re-verification
   */
  async invalidatePhoneVerification(userId: string, newPhoneNumber: string): Promise<void> {
    const verification = await this.verificationRepository.findOne({
      where: { userId },
    });

    if (verification && verification.isPhoneVerified) {
      // Set deadline to 2 days from now
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 2);
      
      verification.isPhoneVerified = false;
      verification.phoneVerifiedAt = null;
      verification.phoneVerificationDeadline = deadline;
      verification.phoneNumber = newPhoneNumber; // Update phone number in verification record
      
      await this.verificationRepository.save(verification);
    }
  }

  /**
   * Check and revoke verification if phone verification deadline has passed
   * This should be called periodically (e.g., via cron job or on verification status check)
   */
  async checkAndRevokeExpiredPhoneVerifications(): Promise<void> {
    const now = new Date();
    const expiredVerifications = await this.verificationRepository.find({
      where: {
        phoneVerificationDeadline: Not(IsNull()),
        isPhoneVerified: false,
      },
    });

    for (const verification of expiredVerifications) {
      if (verification.phoneVerificationDeadline && verification.phoneVerificationDeadline < now) {
        // Revoke verification - set status to EXPIRED
        verification.status = SellerVerificationStatus.EXPIRED;
        verification.phoneVerificationDeadline = null;
        await this.verificationRepository.save(verification);
      }
    }
  }

  /**
   * Check if user is verified seller
   */
  async isVerifiedSeller(userId: string): Promise<boolean> {
    const verification = await this.verificationRepository.findOne({
      where: {
        userId,
        status: SellerVerificationStatus.APPROVED,
      },
    });

    if (!verification) return false;

    // Check if expired
    if (verification.expiresAt && new Date() > verification.expiresAt) {
      return false;
    }

    return true;
  }

  /**
   * Get verification level for user
   */
  async getVerificationLevel(userId: string): Promise<VerificationLevel | null> {
    const verification = await this.verificationRepository.findOne({
      where: {
        userId,
        status: SellerVerificationStatus.APPROVED,
      },
    });

    return verification?.verificationLevel || null;
  }
}


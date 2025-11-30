import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SellerVerificationStatus } from '../../../entities/seller-verification.entity';

export class ReviewVerificationDto {
  @IsEnum(SellerVerificationStatus)
  status!: SellerVerificationStatus;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}


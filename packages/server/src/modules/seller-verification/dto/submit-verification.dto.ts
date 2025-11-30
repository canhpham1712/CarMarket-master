import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsDateString,
  ValidateNested,
  IsArray,
  IsPhoneNumber,
} from 'class-validator';
import { VerificationLevel } from '../../../entities/seller-verification.entity';
import { VerificationDocumentType } from '../../../entities/seller-verification-document.entity';

export class VerificationDocumentDto {
  @IsEnum(VerificationDocumentType)
  documentType!: VerificationDocumentType;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  fileUrl!: string;

  @IsOptional()
  @Type(() => Number)
  fileSize?: number;

  @IsOptional()
  @IsString()
  mimeType?: string;
}

export class SubmitVerificationDto {
  // Contact Information (optional - will use from user profile if not provided)
  @IsOptional()
  @IsString()
  @IsPhoneNumber('VN', { message: 'Invalid Vietnamese phone number' })
  phoneNumber?: string;

  // Identity Information (optional - will use from user profile if not provided)
  @IsOptional()
  @IsString()
  fullName?: string;

  // Verification-specific: ID Number (CMND/CCCD/Passport) - NOT in user table
  @IsOptional()
  @IsString()
  idNumber?: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  // Address Information (optional - can use user.location or provide detailed address)
  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  // Bank Account (optional for premium verification)
  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  accountHolderName?: string;

  // Documents
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VerificationDocumentDto)
  documents!: VerificationDocumentDto[];

  // Verification Level
  @IsOptional()
  @IsEnum(VerificationLevel)
  verificationLevel?: VerificationLevel;
}


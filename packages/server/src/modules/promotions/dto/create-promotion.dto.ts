import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { PromotionPackageType } from '../../../entities/listing-promotion.entity';

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty()
  listingId!: string;

  @IsEnum(PromotionPackageType)
  @IsNotEmpty()
  packageType!: PromotionPackageType;
}


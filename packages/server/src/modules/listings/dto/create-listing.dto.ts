import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsArray,
  Min,
  Max,
} from 'class-validator';
import {
  FuelType,
  TransmissionType,
  BodyType,
  CarCondition,
} from '../../../entities/car-detail.entity';
import { PriceType } from '../../../entities/listing-detail.entity';
import { ImageType } from '../../../entities/car-image.entity';

export class CreateCarDetailDto {
  @IsString()
  @IsNotEmpty()
  make!: string;

  @IsString()
  @IsNotEmpty()
  model!: string;

  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year!: number;

  @IsEnum(BodyType)
  bodyType!: BodyType;

  @IsEnum(FuelType)
  fuelType!: FuelType;

  @IsEnum(TransmissionType)
  transmission!: TransmissionType;

  @IsNumber()
  @Min(0)
  engineSize!: number;

  @IsNumber()
  @Min(0)
  enginePower!: number;

  @IsNumber()
  @Min(0)
  mileage!: number;

  @IsString()
  @IsNotEmpty()
  color!: string;

  @IsOptional()
  @IsNumber()
  numberOfDoors?: number;

  @IsOptional()
  @IsNumber()
  numberOfSeats?: number;

  @IsEnum(CarCondition)
  condition!: CarCondition;

  @IsOptional()
  @IsString()
  vin?: string;

  @IsOptional()
  @IsString()
  registrationNumber?: string;

  @IsOptional()
  @IsNumber()
  previousOwners?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];
}

export class CreateCarImageDto {
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @IsString()
  @IsNotEmpty()
  originalName!: string;

  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsOptional()
  @IsEnum(ImageType)
  type?: ImageType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fileSize?: number;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  alt?: string;
}

export class CreateCarVideoDto {
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @IsString()
  @IsNotEmpty()
  originalName!: string;

  @IsString()
  @IsNotEmpty()
  url!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  fileSize?: number;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  @IsString()
  alt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  duration?: number;

  @IsOptional()
  @IsString()
  thumbnailUrl?: string;
}

export class CreateListingDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsEnum(PriceType)
  priceType?: PriceType;

  @IsString()
  @IsNotEmpty()
  location!: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ValidateNested()
  @Type(() => CreateCarDetailDto)
  carDetail!: CreateCarDetailDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCarImageDto)
  images?: CreateCarImageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCarVideoDto)
  videos?: CreateCarVideoDto[];
}

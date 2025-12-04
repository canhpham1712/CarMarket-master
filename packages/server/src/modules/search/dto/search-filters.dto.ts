import { IsOptional, IsString, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class SearchFiltersDto {
  // General search query
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  query?: string;

  // Specific filters
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  make?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  model?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  yearMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  yearMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  mileageMax?: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  fuelType?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  transmission?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  bodyType?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  condition?: string;

  // Location filters
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  location?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  city?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  state?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  country?: string;

  // Pagination
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(500)
  limit?: number;

  // Sorting
  @IsOptional()
  @IsString()
  @IsEnum(['createdAt', 'price', 'mileage', 'year', 'viewCount'], {
    message: 'sortBy must be one of: createdAt, price, mileage, year, viewCount',
  })
  sortBy?: string;

  @IsOptional()
  @IsEnum(['ASC', 'DESC'], {
    message: 'sortOrder must be either ASC or DESC',
  })
  sortOrder?: 'ASC' | 'DESC';
}


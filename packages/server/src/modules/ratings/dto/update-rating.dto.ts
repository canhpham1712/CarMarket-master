import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRatingDto {
  @ApiPropertyOptional({
    description: 'Rating from 1 to 5 stars',
    minimum: 1,
    maximum: 5,
    example: 4,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    description: 'Optional comment about the seller',
    example: 'Updated: Great seller!',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  comment?: string;
}


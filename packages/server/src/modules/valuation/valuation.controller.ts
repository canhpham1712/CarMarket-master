import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ValuationService } from './valuation.service';

class ValuationRequestDto {
  @IsString()
  brand!: string;

  @IsString()
  model!: string;

  @IsNumber()
  @Min(1990)
  @Max(2030)
  year!: number;

  @IsNumber()
  @Min(0)
  mileage_km!: number;

  @IsOptional()
  @IsString()
  version?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

@Controller('valuation')
export class ValuationController {
  constructor(private readonly valuationService: ValuationService) {}

  @Post()
  async estimate(@Body() body: ValuationRequestDto) {
    try {
      const result = await this.valuationService.estimatePrice(body);
      return result;
    } catch (error) {
      console.error('Valuation error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to get car valuation';
      throw new HttpException(
        {
          message: 'Failed to get car valuation',
          details: errorMessage,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}





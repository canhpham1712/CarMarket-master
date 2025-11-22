import { IsUUID, IsEnum, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../../entities/transaction.entity';

export class MarkAsSoldDto {
  @ApiProperty({
    description: 'ID of the buyer who purchased the listing',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  buyerId!: string;

  @ApiProperty({
    description: 'Final sale amount',
    example: 25000.00,
  })
  @IsNumber()
  @Min(0)
  amount!: number;

  @ApiProperty({
    description: 'Payment method used',
    enum: PaymentMethod,
    example: PaymentMethod.CASH,
  })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({
    description: 'Payment reference (e.g., transaction number, check number)',
    example: 'CHK-12345',
  })
  @IsOptional()
  @IsString()
  paymentReference?: string;

  @ApiPropertyOptional({
    description: 'Additional notes about the sale',
    example: 'Sold as-is, buyer inspected vehicle',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}


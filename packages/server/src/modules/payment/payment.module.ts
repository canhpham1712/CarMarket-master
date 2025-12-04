import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PayOSService } from './payos.service';
import { ListingPromotion } from '../../entities/listing-promotion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ListingPromotion])],
  controllers: [PaymentController],
  providers: [PaymentService, PayOSService],
  exports: [PaymentService, PayOSService],
})
export class PaymentModule {}


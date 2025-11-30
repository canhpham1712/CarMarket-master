import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../../entities/user.entity';
import { ListingDetail } from '../../entities/listing-detail.entity';
import { SellerRating } from '../../entities/seller-rating.entity';
import { SellerVerificationModule } from '../seller-verification/seller-verification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, ListingDetail, SellerRating]),
    SellerVerificationModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

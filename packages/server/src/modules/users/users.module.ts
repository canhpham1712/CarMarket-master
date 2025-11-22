import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../../entities/user.entity';
import { ListingDetail } from '../../entities/listing-detail.entity';
import { SellerRating } from '../../entities/seller-rating.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, ListingDetail, SellerRating])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

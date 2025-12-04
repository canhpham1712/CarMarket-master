import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { ListingDetail } from '../../entities/listing-detail.entity';
import { CarDetail } from '../../entities/car-detail.entity';
import { CarImage } from '../../entities/car-image.entity';
import { CarVideo } from '../../entities/car-video.entity';
import { User } from '../../entities/user.entity';
import { ListingPendingChanges } from '../../entities/listing-pending-changes.entity';
import { Transaction } from '../../entities/transaction.entity';
import { ChatConversation } from '../../entities/chat-conversation.entity';
import { LogsModule } from '../logs/logs.module';
import { RbacModule } from '../rbac/rbac.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { UserViewHistory } from '../../entities/user-view-history.entity';
import { ListingPromotion } from '../../entities/listing-promotion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ListingDetail,
      CarDetail,
      CarImage,
      CarVideo,
      User,
      ListingPendingChanges,
      Transaction,
      ChatConversation,
      UserViewHistory,
      ListingPromotion,
    ]),
    LogsModule,
    RbacModule, // Import RbacModule to use PermissionGuard and ResourceGuard
    NotificationsModule,
    RecommendationsModule,
  ],
  controllers: [ListingsController],
  providers: [ListingsService],
  exports: [ListingsService],
})
export class ListingsModule {}

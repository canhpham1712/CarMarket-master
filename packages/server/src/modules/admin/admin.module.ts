import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../../entities/user.entity';
import { ListingDetail } from '../../entities/listing-detail.entity';
import { Transaction } from '../../entities/transaction.entity';
import { ListingPendingChanges } from '../../entities/listing-pending-changes.entity';
import { CarDetail } from '../../entities/car-detail.entity';
import { CarImage } from '../../entities/car-image.entity';
import { CarVideo } from '../../entities/car-video.entity';
import { LogsModule } from '../logs/logs.module';
import { RbacModule } from '../rbac/rbac.module';
import { ChatModule } from '../chat/chat.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      ListingDetail,
      Transaction,
      ListingPendingChanges,
      CarDetail,
      CarImage,
      CarVideo,
    ]),
    LogsModule,
    RbacModule,
    ChatModule,
    NotificationsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions, TypeOrmOptionsFactory } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { CarDetail } from '../entities/car-detail.entity';
import { CarImage } from '../entities/car-image.entity';
import { CarVideo } from '../entities/car-video.entity';
import { ListingDetail } from '../entities/listing-detail.entity';
import { Transaction } from '../entities/transaction.entity';
import { CarMake } from '../entities/car-make.entity';
import { CarModel } from '../entities/car-model.entity';
import { CarMetadata } from '../entities/car-metadata.entity';
import { Favorite } from '../entities/favorite.entity';
import { ChatConversation } from '../entities/chat-conversation.entity';
import { ChatMessage } from '../entities/chat-message.entity';
import { ListingPendingChanges } from '../entities/listing-pending-changes.entity';
import { ActivityLog } from '../entities/activity-log.entity';
import { FAQ } from '../entities/faq.entity';
import { Permission } from '../entities/permission.entity';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { ListingComment } from '../entities/listing-comment.entity';
import { CommentReaction } from '../entities/comment-reaction.entity';
import { CommentReport } from '../entities/comment-report.entity';
import { Notification } from '../entities/notification.entity';
import { SellerRating } from '../entities/seller-rating.entity';
import { UserRecommendation } from '../entities/user-recommendation.entity';
import { UserSearchHistory } from '../entities/user-search-history.entity';
import { UserViewHistory } from '../entities/user-view-history.entity';
import { SellerVerification } from '../entities/seller-verification.entity';
import { SellerVerificationDocument } from '../entities/seller-verification-document.entity';
import { PhoneVerificationOtp } from '../entities/phone-verification-otp.entity';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {  
    const host = this.configService.get<string>('DATABASE_HOST', 'localhost');
    const port = parseInt(this.configService.get<string>('DATABASE_PORT', '5432'));
    const username = this.configService.get<string>('DATABASE_USERNAME');
    const password = this.configService.get<string>('DATABASE_PASSWORD');
    const database = this.configService.get<string>('DATABASE_NAME');

    if (!username) throw new Error('DATABASE_USERNAME is not set');
    if (!password) throw new Error('DATABASE_PASSWORD is not set');
    if (!database) throw new Error('DATABASE_NAME is not set');

    return {
      type: 'postgres',
      host,
      port,
      username,
      password,
      database,
      entities: [
        User,
        CarDetail,
        CarImage,
        CarVideo,
        ListingDetail,
        Transaction,
        CarMake,
        CarModel,
        CarMetadata,
        Favorite,
        ChatConversation,
        ChatMessage,
        ListingPendingChanges,
        ActivityLog,
        FAQ,
        Permission,
        Role,
        UserRole,
        AuditLog,
        ListingComment,
        CommentReaction,
        CommentReport,
        Notification,
        SellerRating,
        UserRecommendation,
        UserSearchHistory,
        UserViewHistory,
        SellerVerification,
        SellerVerificationDocument,
        PhoneVerificationOtp,
      ],
      synchronize: false,
      migrationsRun: false, // Disabled: Run migrations manually using SQL script
      logging: this.configService.get<string>('NODE_ENV') === 'development' ? ['error'] : false,
      migrations: ['dist/migrations/*{.ts,.js}'],
      migrationsTableName: 'migrations',
    };
  }
}

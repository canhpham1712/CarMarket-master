import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { User } from '../../entities/user.entity';
import { ListingDetail } from '../../entities/listing-detail.entity';
import { Transaction } from '../../entities/transaction.entity';
import { ChatConversation } from '../../entities/chat-conversation.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      ListingDetail,
      Transaction,
      ChatConversation,
      ChatMessage,
    ]),
    RbacModule, // Provides PermissionService + guards for PermissionGuard
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}


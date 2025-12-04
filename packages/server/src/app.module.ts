import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ListingsModule } from './modules/listings/listings.module';
import { SearchModule } from './modules/search/search.module';
import { AdminModule } from './modules/admin/admin.module';
import { MetadataModule } from './modules/metadata/metadata.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { ChatModule } from './modules/chat/chat.module';
import { LogsModule } from './modules/logs/logs.module';
import { AssistantModule } from './modules/assistant/assistant.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { CommentsModule } from './modules/comments/comments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { RedisModule } from './modules/redis/redis.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { GeocodingModule } from './modules/geocoding/geocoding.module';
import { SellerVerificationModule } from './modules/seller-verification/seller-verification.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { ValuationModule } from './modules/valuation/valuation.module';
import { PaymentModule } from './modules/payment/payment.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useClass: DatabaseConfig,
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    ListingsModule,
    SearchModule,
    AdminModule,
    MetadataModule,
    FavoritesModule,
    ChatModule,
    LogsModule,
    AssistantModule,
    RbacModule,
    CommentsModule,
    NotificationsModule,
    RatingsModule,
    AnalyticsModule,
    RedisModule,
    MonitoringModule,
    RecommendationsModule,
    GeocodingModule,
    SellerVerificationModule,
    PromotionsModule,
    PaymentModule,
    ValuationModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

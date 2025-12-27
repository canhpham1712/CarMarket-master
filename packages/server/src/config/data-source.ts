import { DataSource } from 'typeorm';
import { config } from 'dotenv';
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
import { ChatbotConversation } from '../entities/chatbot-conversation.entity';
import { ChatbotMessage } from '../entities/chatbot-message.entity';
import { ListingPendingChanges } from '../entities/listing-pending-changes.entity';
import { ListingPromotion } from '../entities/listing-promotion.entity';
import { ActivityLog } from '../entities/activity-log.entity';
import { FAQ } from '../entities/faq.entity';
import { Permission } from '../entities/permission.entity';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { SellerRating } from '../entities/seller-rating.entity';
import { Notification } from '../entities/notification.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { NotificationDeliveryLog } from '../entities/notification-delivery-log.entity';

// Load environment variables
config();

const dbHost = process.env.DATABASE_HOST || 'localhost';
const dbPort = parseInt(process.env.DATABASE_PORT || '5432');
const dbUser = process.env.DATABASE_USERNAME;
const dbPass = process.env.DATABASE_PASSWORD;
const dbName = process.env.DATABASE_NAME;

if (!dbUser) throw new Error('DATABASE_USERNAME is not set');
if (!dbPass) throw new Error('DATABASE_PASSWORD is not set');
if (!dbName) throw new Error('DATABASE_NAME is not set');

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: dbHost,
  port: dbPort,
  username: dbUser,
  password: dbPass,
  database: dbName,
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
    ChatbotConversation,
    ChatbotMessage,
    ListingPendingChanges,
    ListingPromotion,
    ActivityLog,
    FAQ,
    Permission,
    Role,
    UserRole,
    AuditLog,
    SellerRating,
    Notification,
    NotificationPreference,
    NotificationDeliveryLog,
  ],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development' ? ['error'] : false,
});

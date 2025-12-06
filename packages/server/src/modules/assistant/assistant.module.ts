import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssistantController } from './assistant.controller';
import { AssistantService } from './assistant.service';
import { IntentClassificationService } from './services/intent-classification.service';
import { ResponseHandlerService } from './services/response-handler.service';
import { QueryExtractionService } from './services/query-extraction.service';
import { ListingQueryBuilderService } from './services/listing-query-builder.service';
import { UserContextService } from './services/user-context.service';
import { CarComparisonService } from './services/car-comparison.service';
import { EmbeddingService } from './services/embedding.service';
import { FAQRAGService } from './services/faq-rag.service';
import { ChromaDBService } from './services/chromadb.service';
import { ListingDetail } from '../../entities/listing-detail.entity';
import { CarMetadata } from '../../entities/car-metadata.entity';
import { CarMake } from '../../entities/car-make.entity';
import { CarModel } from '../../entities/car-model.entity';
import { User } from '../../entities/user.entity';
import { Favorite } from '../../entities/favorite.entity';
import { ChatConversation } from '../../entities/chat-conversation.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { FAQ } from '../../entities/faq.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ListingDetail,
      CarMetadata,
      CarMake,
      CarModel,
      User,
      Favorite,
      ChatConversation,
      ChatMessage,
      FAQ,
    ]),
    NotificationsModule,
  ],
  controllers: [AssistantController],
  providers: [
    AssistantService,
    IntentClassificationService,
    ResponseHandlerService,
    QueryExtractionService,
    ListingQueryBuilderService,
    UserContextService,
    CarComparisonService,
    EmbeddingService,
    FAQRAGService,
    ChromaDBService,
  ],
  exports: [AssistantService, EmbeddingService, FAQRAGService, ChromaDBService],
})
export class AssistantModule {}


import { Injectable, Logger } from '@nestjs/common';
import { IntentClassificationService } from './services/intent-classification.service';
import { ResponseHandlerService } from './services/response-handler.service';
import { AssistantQueryDto } from './dto/assistant-query.dto';
import { AssistantResponseDto } from './dto/assistant-response.dto';
import { User } from '../../entities/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../entities/notification.entity';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    private readonly intentClassificationService: IntentClassificationService,
    private readonly responseHandlerService: ResponseHandlerService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async processQuery(
    queryDto: AssistantQueryDto,
    currentUser?: User,
  ): Promise<AssistantResponseDto> {
    try {
      this.logger.log(`Processing query: ${queryDto.query}`);

      // Step 1: Classify user intent using LLM
      const { intent, confidence, extractedEntities } =
        await this.intentClassificationService.classifyIntent(queryDto.query);

      this.logger.log(
        `Intent classified as: ${intent} (confidence: ${confidence})`,
      );

      // Step 2: Handle the intent and generate response
      const response = await this.responseHandlerService.handleIntent(
        intent,
        queryDto.query,
        extractedEntities,
        currentUser,
      );

      return response;
    } catch (error) {
      this.logger.error('Error processing query:', error);
      
      // Fallback response
      return {
        intent: null,
        message:
          "I'm having trouble understanding your question. Could you please rephrase it or try asking something else?",
        suggestions: [
          {
            id: '1',
            label: 'View all cars',
            query: 'Show me all available cars',
            icon: '🚗',
          },
          {
            id: '2',
            label: 'Get help',
            query: 'How can I buy a car?',
            icon: '❓',
          },
        ],
      };
    }
  }

  async getWelcomeMessage(userId?: string): Promise<AssistantResponseDto> {
    const welcomeMessage =
      "👋 Hi! I'm your car marketplace assistant. I can help you with:\n\n" +
      "🚗 Car specifications and features\n" +
      "📋 Available cars in our inventory\n" +
      "⚖️ Comparing different car models\n" +
      "❓ Frequently asked questions\n\n" +
      "How can I assist you today?";

    const response: AssistantResponseDto = {
      intent: null,
      message: welcomeMessage,
      suggestions: [
        {
          id: '1',
          label: 'Show available cars',
          query: 'What cars do you have available?',
          icon: '🚗',
        },
        {
          id: '2',
          label: 'Compare cars',
          query: 'Compare Honda Civic vs Toyota Corolla',
          icon: '⚖️',
        },
        {
          id: '3',
          label: 'Car specs',
          query: 'What are the specs of BMW X5?',
          icon: '📊',
        },
        {
          id: '4',
          label: 'How to buy',
          query: 'How do I buy a car from you?',
          icon: '❓',
        },
      ],
    };

    // Check for unread listing approval notifications
    if (userId) {
      try {
        const notificationsResponse =
          await this.notificationsService.getUserNotifications(
            userId,
            1,
            10,
            true, // unreadOnly
          );

        const approvalNotifications = notificationsResponse.notifications.filter(
          (notif) => notif.type === NotificationType.LISTING_APPROVED,
        );

        if (approvalNotifications.length > 0) {
          // Return notifications separately in data field
          response.data = {
            notifications: approvalNotifications.map((notif) => ({
              id: notif.id,
              message: notif.message,
              listingId: notif.relatedListingId,
              createdAt: notif.createdAt,
            })),
          };
        }
      } catch (error) {
        this.logger.error('Error fetching notifications for welcome message:', error);
        // Continue with normal welcome message if notification fetch fails
      }
    }

    return response;
  }
}


import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { IntentClassificationService } from './services/intent-classification.service';
import { ResponseHandlerService } from './services/response-handler.service';
import { AssistantQueryDto } from './dto/assistant-query.dto';
import { AssistantResponseDto } from './dto/assistant-response.dto';
import { SyncMessagesDto, MessageSender } from './dto/sync-messages.dto';
import { User } from '../../entities/user.entity';
import { ChatbotConversation } from '../../entities/chatbot-conversation.entity';
import { ChatbotMessage, ChatbotMessageSender } from '../../entities/chatbot-message.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../entities/notification.entity';

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);

  constructor(
    @InjectRepository(ChatbotConversation)
    private readonly conversationRepository: Repository<ChatbotConversation>,
    @InjectRepository(ChatbotMessage)
    private readonly messageRepository: Repository<ChatbotMessage>,
    private readonly dataSource: DataSource,
    private readonly intentClassificationService: IntentClassificationService,
    private readonly responseHandlerService: ResponseHandlerService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Get or create a conversation for the user
   */
  async getOrCreateConversation(
    userId: string,
    conversationId?: string,
    deviceId?: string,
    sessionId?: string,
  ): Promise<ChatbotConversation> {
    if (conversationId) {
      const conversation = await this.conversationRepository.findOne({
        where: { id: conversationId, userId },
      });

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      // Validate ownership
      if (conversation.userId !== userId) {
        throw new ForbiddenException('You do not have access to this conversation');
      }

      return conversation;
    }

    // Create new conversation
    const conversation = this.conversationRepository.create({
      userId,
      deviceId: deviceId || null,
      sessionId: sessionId || null,
      title: null, // Will be set from first message
    });

    return await this.conversationRepository.save(conversation);
  }

  /**
   * Generate title from first user message
   */
  private generateTitle(content: string): string {
    const maxLength = 255;
    const trimmed = content.trim();
    if (trimmed.length <= maxLength) {
      return trimmed;
    }
    return trimmed.substring(0, maxLength - 3) + '...';
  }

  /**
   * Save a message to the database
   */
  private async saveMessage(
    conversationId: string,
    content: string,
    sender: ChatbotMessageSender,
  ): Promise<ChatbotMessage> {
    const message = this.messageRepository.create({
      conversationId,
      content: content.trim(),
      sender,
    });

    return await this.messageRepository.save(message);
  }

  /**
   * Process a query and save messages
   */
  async processQuery(
    queryDto: AssistantQueryDto,
    currentUser?: User,
  ): Promise<AssistantResponseDto> {
    // If guest user, return response without saving to DB
    if (!currentUser) {
      try {
        this.logger.log(`Processing guest query: ${queryDto.query}`);

        const { intent, confidence, extractedEntities } =
          await this.intentClassificationService.classifyIntent(queryDto.query);

        this.logger.log(
          `Intent classified as: ${intent} (confidence: ${confidence})`,
        );

        const response = await this.responseHandlerService.handleIntent(
          intent,
          queryDto.query,
          extractedEntities,
          currentUser,
        );

        return response;
      } catch (error) {
        this.logger.error('Error processing guest query:', error);
        return {
          intent: null,
          message:
            "I'm having trouble understanding your question. Could you please rephrase it or try asking something else?",
        };
      }
    }

    // Authenticated user flow - save to DB
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      this.logger.log(`Processing authenticated query: ${queryDto.query}`);

      // Get or create conversation
      const conversation = await this.getOrCreateConversation(
        currentUser.id,
        queryDto.conversationId,
        queryDto.deviceId,
      );

      // Generate title from first message if conversation is new
      if (!conversation.title && !conversation.messages) {
        conversation.title = this.generateTitle(queryDto.query);
        await this.conversationRepository.save(conversation);
      }

      // Validate message content
      const trimmedQuery = queryDto.query.trim();
      if (!trimmedQuery || trimmedQuery.length === 0) {
        throw new BadRequestException('Message content cannot be empty');
      }

      if (trimmedQuery.length > 10000) {
        throw new BadRequestException('Message content is too long (max 10000 characters)');
      }

      // Save user message using transaction manager
      let userMessage: ChatbotMessage;
      try {
        const messageEntity = queryRunner.manager.create(ChatbotMessage, {
          conversationId: conversation.id,
          content: trimmedQuery.trim(),
          sender: ChatbotMessageSender.USER,
        });
        userMessage = await queryRunner.manager.save(ChatbotMessage, messageEntity);
      } catch (error) {
        this.logger.error('Failed to save user message:', error);
        await queryRunner.rollbackTransaction();
        throw new BadRequestException({
          code: 'MESSAGE_SAVE_FAILED',
          message: 'Failed to save your message. Please try again.',
          details: error.message,
        });
      }

      // Process query
      const { intent, confidence, extractedEntities } =
        await this.intentClassificationService.classifyIntent(trimmedQuery);

      this.logger.log(
        `Intent classified as: ${intent} (confidence: ${confidence})`,
      );

      // Generate response
      const response = await this.responseHandlerService.handleIntent(
        intent,
        trimmedQuery,
        extractedEntities,
        currentUser,
      );

      // Save assistant response using transaction manager
      try {
        const assistantMessageEntity = queryRunner.manager.create(ChatbotMessage, {
          conversationId: conversation.id,
          content: response.message.trim(),
          sender: ChatbotMessageSender.ASSISTANT,
        });
        await queryRunner.manager.save(ChatbotMessage, assistantMessageEntity);
      } catch (error) {
        this.logger.error('Failed to save assistant response:', error);
        await queryRunner.rollbackTransaction();
        throw new InternalServerErrorException({
          code: 'RESPONSE_SAVE_FAILED',
          message: 'Response generated but failed to save. Your message was saved.',
          details: error.message,
          partialData: {
            conversationId: conversation.id,
            userMessageId: userMessage.id,
          },
        });
      }

      // Update conversation metadata using transaction manager
      await queryRunner.manager.update(
        ChatbotConversation,
        { id: conversation.id },
        {
          lastMessage: response.message,
          lastMessageAt: new Date(),
        },
      );

      await queryRunner.commitTransaction();

      // Return response with conversationId
      return {
        ...response,
        conversationId: conversation.id,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      // If it's already a known error (BadRequest, InternalServerError), rethrow
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      this.logger.error('Error processing query:', error);

      // Return fallback response with error info
      return {
        intent: null,
        message:
          "I'm having trouble understanding your question. Could you please rephrase it or try asking something else?",
        error: {
          code: 'PROCESSING_ERROR',
          message: 'An error occurred while processing your query',
          details: error.message,
        },
      };
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get conversation messages for context restoration
   */
  async getConversationMessages(
    conversationId: string,
    userId: string,
  ): Promise<{ conversation: ChatbotConversation; messages: ChatbotMessage[] }> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId, userId },
      relations: ['messages'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    // Validate ownership
    if (conversation.userId !== userId) {
      throw new ForbiddenException('You do not have access to this conversation');
    }

    // Load messages ordered by createdAt
    const messages = await this.messageRepository.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });

    return {
      conversation,
      messages,
    };
  }

  /**
   * Sync guest messages to user account after login
   */
  async syncGuestMessages(
    userId: string,
    syncDto: SyncMessagesDto,
  ): Promise<{
    success: boolean;
    conversationId: string;
    syncedCount: number;
    skippedCount: number;
    error?: string;
  }> {
    if (!syncDto.messages || syncDto.messages.length === 0) {
      throw new BadRequestException('No messages to sync');
    }

    // Limit messages per sync
    const maxMessages = 100;
    if (syncDto.messages.length > maxMessages) {
      throw new BadRequestException(`Cannot sync more than ${maxMessages} messages at once`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create or find conversation for user
      const whereCondition: any = { userId };
      if (syncDto.deviceId) {
        whereCondition.deviceId = syncDto.deviceId;
      } else {
        whereCondition.deviceId = IsNull();
      }
      
      let conversation = await this.conversationRepository.findOne({
        where: whereCondition,
        order: { createdAt: 'DESC' },
      });

      if (!conversation) {
        conversation = this.conversationRepository.create({
          userId,
          deviceId: syncDto.deviceId || null,
          sessionId: syncDto.sessionId || null,
          title: null,
        });

        // Generate title from first user message
        const firstUserMessage = syncDto.messages.find((m) => m.sender === MessageSender.USER);
        if (firstUserMessage) {
          conversation.title = this.generateTitle(firstUserMessage.content);
        }

        conversation = await this.conversationRepository.save(conversation);
      }

      let syncedCount = 0;
      let skippedCount = 0;

      // Get existing messages to check for duplicates
      const existingMessages = await this.messageRepository.find({
        where: { conversationId: conversation.id },
        order: { createdAt: 'ASC' },
      });

      // Sync messages
      for (const msg of syncDto.messages) {
        // Validate message format
        if (!msg.content || !msg.sender || !msg.timestamp) {
          skippedCount++;
          continue;
        }

        // Check for duplicate (by content + timestamp ± 1 second)
        const messageTimestamp = new Date(msg.timestamp);
        const isDuplicate = existingMessages.some((existing) => {
          const timeDiff = Math.abs(
            messageTimestamp.getTime() - existing.createdAt.getTime(),
          );
          return (
            existing.content.trim() === msg.content.trim() &&
            timeDiff < 1000 // Within 1 second
          );
        });

        if (isDuplicate) {
          skippedCount++;
          continue;
        }

        try {
          const sender =
            msg.sender === MessageSender.USER
              ? ChatbotMessageSender.USER
              : ChatbotMessageSender.ASSISTANT;

          await this.saveMessage(conversation.id, msg.content, sender);
          syncedCount++;
        } catch (error) {
          this.logger.error(`Failed to sync message: ${error.message}`);
          skippedCount++;
        }
      }

      // Update conversation metadata
      if (syncDto.messages.length > 0) {
        const lastMessage = syncDto.messages[syncDto.messages.length - 1];
        if (lastMessage && lastMessage.content) {
          await this.conversationRepository.update(conversation.id, {
            lastMessage: lastMessage.content.substring(0, 500),
            lastMessageAt: new Date(lastMessage.timestamp),
          });
        }
      }

      await queryRunner.commitTransaction();

      return {
        success: true,
        conversationId: conversation.id,
        syncedCount,
        skippedCount,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to sync guest messages:', error);

      return {
        success: false,
        conversationId: '',
        syncedCount: 0,
        skippedCount: syncDto.messages.length,
        error: error.message,
      };
    } finally {
      await queryRunner.release();
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


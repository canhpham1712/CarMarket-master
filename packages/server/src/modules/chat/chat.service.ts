import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { ChatConversation } from '../../entities/chat-conversation.entity';
import { ChatMessage, MessageType } from '../../entities/chat-message.entity';
import { ListingDetail } from '../../entities/listing-detail.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../entities/notification.entity';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatConversation)
    private readonly conversationRepository: Repository<ChatConversation>,
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
    @InjectRepository(ListingDetail)
    private readonly listingRepository: Repository<ListingDetail>,
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => ChatGateway))
    private readonly chatGateway: ChatGateway,
  ) {}

  async startConversation(buyerId: string, listingId: string) {
    const listing = await this.listingRepository.findOne({
      where: { id: listingId },
      relations: ['seller'],
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.sellerId === buyerId) {
      throw new ForbiddenException('Cannot start conversation with yourself');
    }

    // Check if conversation already exists
    let conversation = await this.conversationRepository.findOne({
      where: {
        buyerId,
        sellerId: listing.sellerId,
        listingId,
      },
      relations: ['buyer', 'seller', 'listing'],
    });

    if (!conversation) {
      // Create new conversation
      conversation = this.conversationRepository.create({
        buyerId,
        sellerId: listing.sellerId,
        listingId,
      });

      conversation = await this.conversationRepository.save(conversation);

      // Add welcome message
      await this.sendMessage(
        listing.sellerId,
        conversation.id,
        `Hello! I'm interested in your listing: ${listing.title}`,
        MessageType.SYSTEM,
      );

      // Create notification for seller about new inquiry (with grouping)
      try {
        await this.notificationsService.groupOrCreateNotification(
          listing.sellerId,
          NotificationType.NEW_INQUIRY,
          'New Inquiry',
          `Someone is interested in your listing: "${listing.title}"`,
          listingId,
          {
            listingTitle: listing.title,
            buyerId: buyerId,
            conversationId: conversation.id,
          },
          60, // Group within 1 hour
        );
      } catch (notificationError) {
        console.error('Error creating new inquiry notification:', notificationError);
      }
    }

    return this.getConversationWithMessages(conversation.id);
  }

  async sendMessage(
    senderId: string,
    conversationId: string,
    content: string,
    type: MessageType = MessageType.TEXT,
  ) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (
      senderId !== conversation.buyerId &&
      senderId !== conversation.sellerId
    ) {
      throw new ForbiddenException(
        'Not authorized to send messages in this conversation',
      );
    }

    const message = this.messageRepository.create({
      senderId,
      conversationId,
      content,
      type,
    });

    const savedMessage = await this.messageRepository.save(message);

    // Update conversation
    await this.conversationRepository.update(conversationId, {
      lastMessage: content,
      lastMessageAt: new Date(),
    });

    // Get message with sender relation loaded
    const messageWithSender = await this.messageRepository.findOne({
      where: { id: savedMessage.id },
      relations: ['sender'],
    });

    // Emit Socket.IO event for real-time updates
    if (messageWithSender && this.chatGateway?.server) {
      // Serialize message to match client interface
      const serializedMessage = {
        id: messageWithSender.id,
        content: messageWithSender.content,
        type: messageWithSender.type,
        isRead: messageWithSender.isRead,
        createdAt: messageWithSender.createdAt.toISOString(),
        sender: {
          id: messageWithSender.sender.id,
          firstName: messageWithSender.sender.firstName,
          lastName: messageWithSender.sender.lastName,
          profileImage: messageWithSender.sender.profileImage || undefined,
        },
      };

      // Emit to all users in the conversation room
      this.chatGateway.server.to(`conversation:${conversationId}`).emit('newMessage', {
        conversationId,
        message: serializedMessage,
      });

      // Also update conversation for both users
      const otherUserId =
        senderId === conversation.buyerId
          ? conversation.sellerId
          : conversation.buyerId;

      // Get full conversation data for update
      const fullConversation = await this.conversationRepository.findOne({
        where: { id: conversationId },
        relations: ['buyer', 'seller', 'listing'],
      });

      if (fullConversation) {
        this.chatGateway.server.to(`user:${senderId}`).emit('conversationUpdated', {
          conversation: {
            id: fullConversation.id,
            lastMessage: content,
            lastMessageAt: new Date().toISOString(),
            buyerId: fullConversation.buyerId,
            sellerId: fullConversation.sellerId,
            listingId: fullConversation.listingId,
          },
        });
        this.chatGateway.server.to(`user:${otherUserId}`).emit('conversationUpdated', {
          conversation: {
            id: fullConversation.id,
            lastMessage: content,
            lastMessageAt: new Date().toISOString(),
            buyerId: fullConversation.buyerId,
            sellerId: fullConversation.sellerId,
            listingId: fullConversation.listingId,
          },
        });
      }
    }

    // Create notification for the other user (only for non-system messages)
    if (type !== MessageType.SYSTEM && messageWithSender) {
      const otherUserId =
        senderId === conversation.buyerId
          ? conversation.sellerId
          : conversation.buyerId;

      // Get listing for notification
      const listing = await this.listingRepository.findOne({
        where: { id: conversation.listingId },
      });

      try {
        const senderName = `${messageWithSender.sender.firstName} ${messageWithSender.sender.lastName}`;
        await this.notificationsService.updateOrCreateMessageNotification(
          otherUserId,
          conversationId,
          senderName,
          conversation.listingId,
          {
            conversationId: conversationId,
            senderId: senderId,
            messageId: savedMessage.id,
            listingTitle: listing?.title,
          },
        );
      } catch (notificationError) {
        console.error('Error creating/updating new message notification:', notificationError);
      }
    }

    return messageWithSender;
  }

  async getConversationWithMessages(conversationId: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['buyer', 'seller', 'listing', 'listing.carDetail'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const messages = await this.messageRepository.find({
      where: { conversationId },
      relations: ['sender'],
      order: { createdAt: 'ASC' },
    });

    return {
      conversation,
      messages,
    };
  }

  async getUserConversations(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    const [conversations, total] =
      await this.conversationRepository.findAndCount({
        where: [{ buyerId: userId }, { sellerId: userId }],
        relations: [
          'buyer',
          'seller',
          'listing',
          'listing.carDetail',
          'listing.carDetail.images',
        ],
        order: { lastMessageAt: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

    return {
      conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async markMessagesAsRead(conversationId: string, userId: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (userId !== conversation.buyerId && userId !== conversation.sellerId) {
      throw new ForbiddenException(
        'Not authorized to access this conversation',
      );
    }

    await this.messageRepository.update(
      {
        conversationId,
        senderId:
          userId !== conversation.buyerId
            ? conversation.buyerId
            : conversation.sellerId,
        isRead: false,
      },
      { isRead: true },
    );

    return { message: 'Messages marked as read' };
  }

  async updateTypingStatus(
    conversationId: string,
    userId: string,
    isTyping: boolean,
  ) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.buyerId === userId) {
      conversation.isBuyerTyping = isTyping;
    } else if (conversation.sellerId === userId) {
      conversation.isSellerTyping = isTyping;
    }

    await this.conversationRepository.save(conversation);
  }

  async getConversationById(conversationId: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['buyer', 'seller', 'listing'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return { conversation };
  }

  async getUnreadMessageCount(userId: string) {
    try {
      const conversations = await this.conversationRepository.find({
        where: [{ buyerId: userId }, { sellerId: userId }],
      });

      if (conversations.length === 0) {
        return { unreadCount: 0 };
      }

      const conversationIds = conversations.map((conv) => conv.id);

      const totalUnread = await this.messageRepository.count({
        where: {
          conversationId: In(conversationIds),
          senderId: Not(userId),
          isRead: false,
        },
      });

      return { unreadCount: totalUnread };
    } catch (error) {
      return { unreadCount: 0 };
    }
  }

  async getMessages(
    conversationId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const [messages, total] = await this.messageRepository.findAndCount({
      where: { conversationId },
      relations: ['sender'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit),
      },
    };
  }
}

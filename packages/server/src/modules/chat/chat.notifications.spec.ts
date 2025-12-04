import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatConversation } from '../../entities/chat-conversation.entity';
import { ChatMessage, MessageType } from '../../entities/chat-message.entity';
import { ListingDetail } from '../../entities/listing-detail.entity';
import { NotificationType } from '../../entities/notification.entity';

describe('ChatService - Notification Integration', () => {
  let chatService: ChatService;
  let notificationsService: NotificationsService;

  const mockNotificationsService = {
    createNotification: jest.fn(),
  };

  const mockConversationRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockMessageRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockListingRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: getRepositoryToken(ChatConversation),
          useValue: mockConversationRepository,
        },
        {
          provide: getRepositoryToken(ChatMessage),
          useValue: mockMessageRepository,
        },
        {
          provide: getRepositoryToken(ListingDetail),
          useValue: mockListingRepository,
        },
      ],
    }).compile();

    chatService = module.get<ChatService>(ChatService);
    notificationsService = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('startConversation', () => {
    it('should create NEW_INQUIRY notification for seller when new conversation starts', async () => {
      const buyerId = 'buyer-123';
      const sellerId = 'seller-123';
      const listingId = 'listing-123';
      const listing = {
        id: listingId,
        sellerId,
        title: 'Test Car',
        seller: { id: sellerId },
      };

      const savedConversation = {
        id: 'conv-123',
        buyerId,
        sellerId,
        listingId,
        buyer: { id: buyerId },
        seller: { id: sellerId },
        listing: listing,
      };

      // Mock flow:
      // 1. startConversation checks if conversation exists (null)
      // 2. Creates new conversation
      // 3. sendMessage gets conversation (savedConversation) - for system message
      // 4. getConversationWithMessages gets conversation with relations
      mockConversationRepository.findOne
        .mockResolvedValueOnce(null) // First call: check if conversation exists in startConversation
        .mockResolvedValueOnce(savedConversation) // Second call: in sendMessage (system message)
        .mockResolvedValueOnce({ // Third call: for getConversationWithMessages (with relations)
          ...savedConversation,
          buyer: { id: buyerId },
          seller: { id: sellerId },
          listing: {
            ...listing,
            carDetail: {},
          },
        });

      mockListingRepository.findOne.mockResolvedValue(listing);
      mockConversationRepository.create.mockReturnValue(savedConversation);
      mockConversationRepository.save.mockResolvedValue(savedConversation);
      mockConversationRepository.update.mockResolvedValue(undefined);
      
      // Mock for sendMessage (system message)
      const systemMessage = {
        id: 'msg-123',
        content: 'Hello',
        sender: { id: sellerId, firstName: 'Seller', lastName: 'Name' },
      };
      mockMessageRepository.create.mockReturnValue(systemMessage);
      mockMessageRepository.save.mockResolvedValue(systemMessage);
      mockMessageRepository.findOne.mockResolvedValue(systemMessage);
      
      // Mock for getConversationWithMessages
      mockMessageRepository.find.mockResolvedValue([systemMessage]);

      await chatService.startConversation(buyerId, listingId);

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        sellerId,
        NotificationType.NEW_INQUIRY,
        'New Inquiry',
        expect.stringContaining('Test Car'),
        listingId,
        expect.objectContaining({
          listingTitle: 'Test Car',
          buyerId,
        }),
      );
    });

    it('should not create notification if conversation already exists', async () => {
      const buyerId = 'buyer-123';
      const listingId = 'listing-123';
      const listing = {
        id: listingId,
        sellerId: 'seller-123',
        seller: { id: 'seller-123' },
      };
      const existingConversation = {
        id: 'conv-123',
        buyerId,
        sellerId: 'seller-123',
        listingId,
        buyer: { id: buyerId },
        seller: { id: 'seller-123' },
        listing: listing,
      };

      mockListingRepository.findOne.mockResolvedValue(listing);
      mockConversationRepository.findOne
        .mockResolvedValueOnce(existingConversation) // Conversation exists
        .mockResolvedValueOnce(existingConversation); // For getConversationWithMessages
      mockMessageRepository.find.mockResolvedValue([]);

      await chatService.startConversation(buyerId, listingId);

      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('should create NEW_MESSAGE notification for recipient', async () => {
      const senderId = 'sender-123';
      const recipientId = 'recipient-123';
      const conversationId = 'conv-123';
      const conversation = {
        id: conversationId,
        buyerId: senderId,
        sellerId: recipientId,
        listingId: 'listing-123',
      };

      const message = {
        id: 'msg-123',
        content: 'Hello there',
        sender: {
          id: senderId,
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      const listing = {
        id: 'listing-123',
        title: 'Test Car',
      };

      mockConversationRepository.findOne.mockResolvedValue(conversation);
      mockMessageRepository.save.mockResolvedValue(message);
      mockMessageRepository.findOne.mockResolvedValue(message);
      mockListingRepository.findOne.mockResolvedValue(listing);

      await chatService.sendMessage(
        senderId,
        conversationId,
        'Hello there',
        MessageType.TEXT,
      );

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        recipientId,
        NotificationType.NEW_MESSAGE,
        'New Message',
        expect.stringContaining('John Doe'),
        conversation.listingId,
        expect.objectContaining({
          conversationId,
          senderId,
        }),
      );
    });

    it('should not create notification for system messages', async () => {
      const senderId = 'sender-123';
      const conversationId = 'conv-123';
      const conversation = {
        id: conversationId,
        buyerId: senderId,
        sellerId: 'recipient-123',
        listingId: 'listing-123',
      };

      mockConversationRepository.findOne.mockResolvedValue(conversation);
      mockMessageRepository.save.mockResolvedValue({
        id: 'msg-123',
        content: 'System message',
      });

      await chatService.sendMessage(
        senderId,
        conversationId,
        'System message',
        MessageType.SYSTEM,
      );

      expect(mockNotificationsService.createNotification).not.toHaveBeenCalled();
    });
  });
});


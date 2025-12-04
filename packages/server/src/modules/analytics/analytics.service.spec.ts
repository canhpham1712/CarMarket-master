import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsService } from './analytics.service';
import { User } from '../../entities/user.entity';
import { ListingDetail, ListingStatus } from '../../entities/listing-detail.entity';
import { Transaction, TransactionStatus } from '../../entities/transaction.entity';
import { ChatConversation } from '../../entities/chat-conversation.entity';
import { ChatMessage } from '../../entities/chat-message.entity';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let userRepository: Repository<User>;
  let listingRepository: Repository<ListingDetail>;
  let transactionRepository: Repository<Transaction>;
  let conversationRepository: Repository<ChatConversation>;
  let messageRepository: Repository<ChatMessage>;

  const mockUserRepository = {
    count: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockListingRepository = {
    count: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockTransactionRepository = {
    count: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockConversationRepository = {
    find: jest.fn(),
  };

  const mockMessageRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(ListingDetail),
          useValue: mockListingRepository,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: getRepositoryToken(ChatConversation),
          useValue: mockConversationRepository,
        },
        {
          provide: getRepositoryToken(ChatMessage),
          useValue: mockMessageRepository,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    listingRepository = module.get<Repository<ListingDetail>>(
      getRepositoryToken(ListingDetail),
    );
    transactionRepository = module.get<Repository<Transaction>>(
      getRepositoryToken(Transaction),
    );
    conversationRepository = module.get<Repository<ChatConversation>>(
      getRepositoryToken(ChatConversation),
    );
    messageRepository = module.get<Repository<ChatMessage>>(
      getRepositoryToken(ChatMessage),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getRevenueMetrics', () => {
    it('should calculate revenue metrics correctly', async () => {
      const mockTransactions = [
        {
          id: '1',
          amount: 10000,
          platformFee: 500,
          status: TransactionStatus.COMPLETED,
          createdAt: new Date(),
        },
        {
          id: '2',
          amount: 15000,
          platformFee: 750,
          status: TransactionStatus.COMPLETED,
          createdAt: new Date(),
        },
        {
          id: '3',
          amount: 20000,
          platformFee: 1000,
          status: TransactionStatus.PENDING,
          createdAt: new Date(),
        },
      ];

      mockTransactionRepository.find.mockResolvedValue(mockTransactions);

      const result = await service.getRevenueMetrics('30d');

      expect(result.totalRevenue).toBe(25000);
      expect(result.platformFees).toBe(1250);
      expect(result.averageTransactionValue).toBe(12500);
      expect(result.completedTransactions).toBe(2);
      expect(result.pendingTransactions).toBe(1);
    });
  });

  describe('getUserMetrics', () => {
    it('should calculate user metrics correctly', async () => {
      mockUserRepository.count
        .mockResolvedValueOnce(100) // totalUsers
        .mockResolvedValueOnce(80) // activeUsers
        .mockResolvedValueOnce(10) // newUsers
        .mockResolvedValueOnce(8); // previousPeriodUsers

      const result = await service.getUserMetrics('30d');

      expect(result.totalUsers).toBe(100);
      expect(result.activeUsers).toBe(80);
      expect(result.newUsers).toBe(10);
      expect(result.growthRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getListingMetrics', () => {
    it('should calculate listing metrics correctly', async () => {
      const mockListings = [
        {
          id: '1',
          viewCount: 100,
          favoriteCount: 10,
          inquiryCount: 5,
          status: ListingStatus.APPROVED,
        },
        {
          id: '2',
          viewCount: 200,
          favoriteCount: 20,
          inquiryCount: 10,
          status: ListingStatus.APPROVED,
        },
      ];

      mockListingRepository.count
        .mockResolvedValueOnce(2) // totalListings
        .mockResolvedValueOnce(2) // activeListings
        .mockResolvedValueOnce(0) // pendingListings
        .mockResolvedValueOnce(0) // rejectedListings
        .mockResolvedValueOnce(0) // soldListings
        .mockResolvedValueOnce(mockListings); // allListings

      mockListingRepository.find.mockResolvedValue(mockListings);

      const result = await service.getListingMetrics('30d');

      expect(result.totalListings).toBe(2);
      expect(result.totalViews).toBe(300);
      expect(result.totalFavorites).toBe(30);
      expect(result.totalInquiries).toBe(15);
      expect(result.averageViewsPerListing).toBe(150);
    });
  });

  describe('getDashboardData', () => {
    it('should return dashboard data for super_admin role', async () => {
      mockUserRepository.count.mockResolvedValue(100);
      mockListingRepository.count.mockResolvedValue(50);
      mockListingRepository.find.mockResolvedValue([]);
      mockTransactionRepository.find.mockResolvedValue([]);
      mockConversationRepository.find.mockResolvedValue([]);
      mockMessageRepository.find.mockResolvedValue([]);

      const result = await service.getDashboardData('super_admin', undefined, '30d');

      expect(result.role).toBe('super_admin');
      expect(result.overview.revenue).toBeDefined();
      expect(result.overview.users).toBeDefined();
      expect(result.overview.listings).toBeDefined();
    });

    it('should return dashboard data for seller role with userId', async () => {
      const userId = 'seller-123';
      mockTransactionRepository.find.mockResolvedValue([]);
      mockListingRepository.find.mockResolvedValue([]);
      mockListingRepository.count.mockResolvedValue(10);
      mockConversationRepository.find.mockResolvedValue([]);
      mockMessageRepository.find.mockResolvedValue([]);

      const result = await service.getDashboardData('seller', userId, '30d');

      expect(result.role).toBe('seller');
      expect(result.overview.revenue).toBeDefined();
      expect(result.overview.listings).toBeDefined();
    });

    it('should throw error for seller role without userId', async () => {
      await expect(
        service.getDashboardData('seller', undefined, '30d'),
      ).rejects.toThrow('User ID required for seller dashboard');
    });
  });

  describe('cache', () => {
    it('should cache results', async () => {
      mockTransactionRepository.find.mockResolvedValue([]);

      await service.getRevenueMetrics('30d');
      await service.getRevenueMetrics('30d');

      // Should only call repository once due to caching
      expect(mockTransactionRepository.find).toHaveBeenCalledTimes(1);
    });

    it('should invalidate cache', () => {
      service.invalidateCache('revenue');
      // Cache should be cleared for revenue-related keys
      expect(service['cache'].size).toBe(0);
    });
  });
});


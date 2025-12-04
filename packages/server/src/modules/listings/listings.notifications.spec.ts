import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListingsService } from './listings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LogsService } from '../logs/logs.service';
import { ListingDetail, ListingStatus } from '../../entities/listing-detail.entity';
import { User } from '../../entities/user.entity';
import { Transaction } from '../../entities/transaction.entity';
import { CarDetail } from '../../entities/car-detail.entity';
import { CarImage } from '../../entities/car-image.entity';
import { CarVideo } from '../../entities/car-video.entity';
import { ListingPendingChanges } from '../../entities/listing-pending-changes.entity';
import { ChatConversation } from '../../entities/chat-conversation.entity';
import { NotificationType } from '../../entities/notification.entity';

describe('ListingsService - Notification Integration', () => {
  let listingsService: ListingsService;
  let notificationsService: NotificationsService;

  const mockNotificationsService = {
    createNotification: jest.fn(),
  };

  const mockLogsService = {
    createLog: jest.fn(),
  };

  const mockListingRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockCarDetailRepository = {
    findOne: jest.fn(),
  };

  const mockCarImageRepository = {
    find: jest.fn(),
  };

  const mockCarVideoRepository = {
    find: jest.fn(),
  };

  const mockPendingChangesRepository = {
    find: jest.fn(),
  };

  const mockTransactionRepository = {
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockConversationRepository = {
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingsService,
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: LogsService,
          useValue: mockLogsService,
        },
        {
          provide: getRepositoryToken(ListingDetail),
          useValue: mockListingRepository,
        },
        {
          provide: getRepositoryToken(CarDetail),
          useValue: mockCarDetailRepository,
        },
        {
          provide: getRepositoryToken(CarImage),
          useValue: mockCarImageRepository,
        },
        {
          provide: getRepositoryToken(CarVideo),
          useValue: mockCarVideoRepository,
        },
        {
          provide: getRepositoryToken(ListingPendingChanges),
          useValue: mockPendingChangesRepository,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(ChatConversation),
          useValue: mockConversationRepository,
        },
      ],
    }).compile();

    listingsService = module.get<ListingsService>(ListingsService);
    notificationsService = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations
    mockListingRepository.findOne.mockReset();
    mockListingRepository.update.mockReset();
    mockUserRepository.findOne.mockReset();
    mockTransactionRepository.find.mockReset();
    mockTransactionRepository.create.mockReset();
    mockTransactionRepository.save.mockReset();
    mockCarDetailRepository.findOne.mockReset();
    mockCarImageRepository.find.mockReset();
    mockCarVideoRepository.find.mockReset();
    mockNotificationsService.createNotification.mockReset();
  });

  describe('markAsSold', () => {
    it('should create LISTING_SOLD notification for seller', async () => {
      const sellerId = 'seller-123';
      const buyerId = 'buyer-123';
      const listingId = 'listing-123';
      const listing = {
        id: listingId,
        sellerId,
        title: 'Test Car',
        price: 10000,
        soldAt: null,
        carDetailId: 'car-123',
        carDetail: {
          id: 'car-123',
          images: [],
          videos: [],
        },
      };

      const updatedListing = {
        ...listing,
        title: 'Test Car',
        soldAt: new Date(),
        status: 'sold',
        isActive: false,
        viewCount: 0,
        carDetail: {
          id: 'car-123',
          images: [],
          videos: [],
        },
        seller: { id: sellerId },
      };

      mockListingRepository.findOne
        .mockResolvedValueOnce(listing) // First call in markAsSold
        .mockResolvedValueOnce(updatedListing) // Second call in findOne (after update) - with relations
        .mockResolvedValueOnce(updatedListing); // Third call for viewCount update
      mockListingRepository.update.mockResolvedValue(undefined);
      mockUserRepository.findOne.mockResolvedValue({ id: buyerId });
      mockTransactionRepository.find.mockResolvedValue([]);
      mockTransactionRepository.create.mockReturnValue({
        id: 'txn-123',
        transactionNumber: 'TXN-2024-001',
      });
      mockTransactionRepository.save.mockResolvedValue({
        id: 'txn-123',
        transactionNumber: 'TXN-2024-001',
      });
      mockCarDetailRepository.findOne.mockResolvedValue(updatedListing.carDetail);
      mockCarImageRepository.find.mockResolvedValue([]);
      mockCarVideoRepository.find.mockResolvedValue([]);

      await listingsService.markAsSold(listingId, sellerId, {
        buyerId,
        amount: 10000,
        paymentMethod: 'cash',
      });

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        sellerId,
        NotificationType.LISTING_SOLD,
        'Listing Sold',
        expect.stringContaining('Test Car'),
        listingId,
        expect.objectContaining({
          listingTitle: 'Test Car',
          buyerId,
        }),
      );
    });

    it('should create LISTING_SOLD notification for buyer', async () => {
      const sellerId = 'seller-456';
      const buyerId = 'buyer-456';
      const listingId = 'listing-456';
      const listing = {
        id: listingId,
        sellerId: sellerId, // Explicitly set to match sellerId parameter
        title: 'Test Car 2',
        price: 15000,
        soldAt: null, // Important: must be null
        carDetailId: 'car-456',
        carDetail: {
          id: 'car-456',
          images: [],
          videos: [],
        },
      };

      const updatedListing = {
        ...listing,
        title: 'Test Car 2',
        soldAt: new Date(),
        status: 'sold',
        isActive: false,
        viewCount: 0,
        carDetail: {
          id: 'car-456',
          images: [],
          videos: [],
        },
        seller: { id: sellerId },
      };

      // Setup mocks for this test (afterEach already clears them)
      let findOneCallCount = 0;
      mockListingRepository.findOne.mockImplementation(() => {
        findOneCallCount++;
        if (findOneCallCount === 1) {
          return Promise.resolve(listing); // First call in markAsSold
        } else {
          return Promise.resolve(updatedListing); // Subsequent calls
        }
      });
      mockListingRepository.update.mockResolvedValue(undefined);
      mockUserRepository.findOne.mockResolvedValue({ id: buyerId });
      mockTransactionRepository.find.mockResolvedValue([]);
      mockTransactionRepository.create.mockReturnValue({
        id: 'txn-456',
        transactionNumber: 'TXN-2024-002',
      });
      mockTransactionRepository.save.mockResolvedValue({
        id: 'txn-456',
        transactionNumber: 'TXN-2024-002',
      });
      mockCarDetailRepository.findOne.mockResolvedValue(updatedListing.carDetail);
      mockCarImageRepository.find.mockResolvedValue([]);
      mockCarVideoRepository.find.mockResolvedValue([]);

      await listingsService.markAsSold(listingId, sellerId, {
        buyerId,
        amount: 15000,
        paymentMethod: 'cash',
      });

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        buyerId,
        NotificationType.LISTING_SOLD,
        'Purchase Confirmed',
        expect.stringContaining('Test Car 2'),
        listingId,
        expect.objectContaining({
          listingTitle: 'Test Car 2',
          sellerId,
        }),
      );
    });
  });
});


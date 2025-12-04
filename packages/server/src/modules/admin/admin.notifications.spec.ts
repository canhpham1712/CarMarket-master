import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AdminService } from './admin.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatGateway } from '../chat/chat.gateway';
import { LogsService } from '../logs/logs.service';
import { PermissionService } from '../rbac/permission.service';
import { ListingDetail, ListingStatus } from '../../entities/listing-detail.entity';
import { User } from '../../entities/user.entity';
import { Transaction } from '../../entities/transaction.entity';
import { ListingPendingChanges } from '../../entities/listing-pending-changes.entity';
import { CarDetail } from '../../entities/car-detail.entity';
import { CarImage } from '../../entities/car-image.entity';
import { CarVideo } from '../../entities/car-video.entity';
import { NotificationType } from '../../entities/notification.entity';

describe('AdminService - Notification Integration', () => {
  let adminService: AdminService;
  let notificationsService: NotificationsService;
  let listingRepository: Repository<ListingDetail>;

  const mockNotificationsService = {
    createNotification: jest.fn(),
  };

  const mockChatGateway = {
    sendNotificationToUser: jest.fn(),
  };

  const mockLogsService = {
    createLog: jest.fn(),
  };

  const mockPermissionService = {
    // Add methods if needed
  };

  const mockListingRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
  };

  const mockTransactionRepository = {
    find: jest.fn(),
  };

  const mockPendingChangesRepository = {
    find: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockCarDetailRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockCarImageRepository = {
    delete: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockCarVideoRepository = {
    delete: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: ChatGateway,
          useValue: mockChatGateway,
        },
        {
          provide: LogsService,
          useValue: mockLogsService,
        },
        {
          provide: PermissionService,
          useValue: mockPermissionService,
        },
        {
          provide: getRepositoryToken(ListingDetail),
          useValue: mockListingRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: getRepositoryToken(ListingPendingChanges),
          useValue: mockPendingChangesRepository,
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
      ],
    }).compile();

    adminService = module.get<AdminService>(AdminService);
    notificationsService = module.get<NotificationsService>(NotificationsService);
    listingRepository = module.get<Repository<ListingDetail>>(
      getRepositoryToken(ListingDetail),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('approveListing', () => {
    it('should create LISTING_APPROVED notification for seller', async () => {
      const listingId = 'listing-123';
      const sellerId = 'seller-123';
      const listing = {
        id: listingId,
        sellerId,
        title: 'Test Car',
        status: ListingStatus.PENDING,
        seller: { id: sellerId, email: 'seller@test.com' },
        carDetailId: 'car-123',
        carDetail: { id: 'car-123' },
      };

      mockListingRepository.findOne.mockResolvedValue(listing);
      mockPendingChangesRepository.find.mockResolvedValue([]);
      mockListingRepository.update.mockResolvedValue(undefined);
      mockLogsService.createLog.mockResolvedValue(undefined);

      await adminService.approveListing(listingId, 'admin-123');

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        sellerId,
        NotificationType.LISTING_APPROVED,
        'Listing Approved',
        expect.stringContaining('Test Car'),
        listingId,
        expect.objectContaining({
          listingTitle: 'Test Car',
        }),
      );
    });
  });

  describe('rejectListing', () => {
    it('should create LISTING_REJECTED notification for seller', async () => {
      const listingId = 'listing-456';
      const sellerId = 'seller-456';
      const rejectionReason = 'Incomplete information';
      const listing = {
        id: listingId,
        sellerId,
        title: 'Test Car 2',
        status: ListingStatus.PENDING,
        seller: { id: sellerId, email: 'seller2@test.com' },
      };

      mockListingRepository.findOne.mockResolvedValue(listing);
      mockListingRepository.update.mockResolvedValue(undefined);
      mockLogsService.createLog.mockResolvedValue(undefined);

      await adminService.rejectListing(listingId, rejectionReason, 'admin-123');

      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith(
        sellerId,
        NotificationType.LISTING_REJECTED,
        'Listing Rejected',
        expect.stringContaining(rejectionReason),
        listingId,
        expect.objectContaining({
          listingTitle: 'Test Car 2',
          rejectionReason,
        }),
      );
    });
  });
});


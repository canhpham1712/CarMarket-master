import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual } from 'typeorm';
import { User } from '../../entities/user.entity';
import { ListingDetail, ListingStatus } from '../../entities/listing-detail.entity';
import { Transaction, TransactionStatus } from '../../entities/transaction.entity';
import { ChatConversation } from '../../entities/chat-conversation.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import {
  RevenueMetrics,
  RevenueTimeSeries,
  UserMetrics,
  UserGrowthTimeSeries,
  ListingMetrics,
  ListingPerformanceTimeSeries,
  TopListing,
  TransactionMetrics,
  TransactionTimeSeries,
  PaymentMethodBreakdown,
  EngagementMetrics,
  EngagementTimeSeries,
  GeographicDistribution,
  DashboardData,
  TimeRange,
} from './dto/analytics.dto';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class AnalyticsService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(ListingDetail)
    private readonly listingRepository: Repository<ListingDetail>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(ChatConversation)
    private readonly conversationRepository: Repository<ChatConversation>,
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
  ) {}

  /**
   * Get cached data or compute and cache
   */
  private async getCached<T>(
    key: string,
    computeFn: () => Promise<T>,
    ttl: number = this.CACHE_TTL,
  ): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const data = await computeFn();
    this.cache.set(key, {
      data,
      expiresAt: now + ttl,
    });

    return data;
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Parse period string to date range
   */
  private parsePeriod(period: string): TimeRange {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    return { startDate, endDate };
  }

  /**
   * Get revenue metrics
   */
  async getRevenueMetrics(period: string = '30d', userId?: string): Promise<RevenueMetrics> {
    const cacheKey = `revenue:${period}:${userId || 'all'}`;
    return this.getCached(cacheKey, async () => {
    const { startDate, endDate } = this.parsePeriod(period);
    
    const whereCondition: any = {
      createdAt: Between(startDate, endDate),
    };

    if (userId) {
      whereCondition.sellerId = userId;
    }

    const [completed, pending, cancelled] = await Promise.all([
      this.transactionRepository.find({
        where: { ...whereCondition, status: TransactionStatus.COMPLETED },
      }),
      this.transactionRepository.find({
        where: { ...whereCondition, status: TransactionStatus.PENDING },
      }),
      this.transactionRepository.find({
        where: { ...whereCondition, status: TransactionStatus.CANCELLED },
      }),
    ]);

    const totalRevenue = completed.reduce((sum, t) => sum + Number(t.amount), 0);
    const platformFees = completed.reduce((sum, t) => sum + Number(t.platformFee), 0);
    const averageTransactionValue =
      completed.length > 0 ? totalRevenue / completed.length : 0;

    return {
      totalRevenue,
      platformFees,
      averageTransactionValue,
      completedTransactions: completed.length,
      pendingTransactions: pending.length,
      cancelledTransactions: cancelled.length,
    };
    });
  }

  /**
   * Get revenue time series data
   */
  async getRevenueTimeSeries(period: string = '30d', userId?: string): Promise<RevenueTimeSeries[]> {
    const cacheKey = `revenue-timeseries:${period}:${userId || 'all'}`;
    return this.getCached(cacheKey, async () => {
    const { startDate, endDate } = this.parsePeriod(period);
    const transactions = await this.transactionRepository.find({
      where: userId
        ? {
            sellerId: userId,
            createdAt: Between(startDate, endDate),
          }
        : {
            createdAt: Between(startDate, endDate),
          },
      order: { createdAt: 'ASC' },
    });

    // Group by date
    const grouped = new Map<string, RevenueTimeSeries>();

    transactions.forEach((t) => {
      // Ensure we always have a string key even if createdAt is nullable in typings
      const date = (t.createdAt?.toISOString().split('T')[0]) ?? '';
      if (!grouped.has(date)) {
        grouped.set(date, {
          date,
          revenue: 0,
          platformFees: 0,
          transactions: 0,
        });
      }

      const entry = grouped.get(date)!;
      entry.transactions += 1;
      
      if (t.status === TransactionStatus.COMPLETED) {
        entry.revenue += Number(t.amount);
        entry.platformFees += Number(t.platformFee);
      }
    });

    return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
    });
  }

  /**
   * Get user metrics
   */
  async getUserMetrics(period: string = '30d'): Promise<UserMetrics> {
    const cacheKey = `users:${period}`;
    return this.getCached(cacheKey, async () => {
    const { startDate, endDate } = this.parsePeriod(period);
    const previousPeriodStart = new Date(startDate);
    previousPeriodStart.setDate(previousPeriodStart.getDate() - (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    const [totalUsers, activeUsers, newUsers, previousPeriodUsers] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { isActive: true } }),
      this.userRepository.count({
        where: { createdAt: Between(startDate, endDate) },
      }),
      this.userRepository.count({
        where: { createdAt: Between(previousPeriodStart, startDate) },
      }),
    ]);

    const growthRate =
      previousPeriodUsers > 0
        ? ((newUsers - previousPeriodUsers) / previousPeriodUsers) * 100
        : 0;

    // Simple retention: users who registered in previous period and are still active
    const retainedUsers = await this.userRepository.count({
      where: {
        createdAt: Between(previousPeriodStart, startDate),
        isActive: true,
      },
    });

    const retentionRate =
      previousPeriodUsers > 0 ? (retainedUsers / previousPeriodUsers) * 100 : 0;

    return {
      totalUsers,
      activeUsers,
      newUsers,
      growthRate,
      retentionRate,
    };
    });
  }

  /**
   * Get user growth time series
   */
  async getUserGrowthTimeSeries(period: string = '30d'): Promise<UserGrowthTimeSeries[]> {
    const cacheKey = `users-growth:${period}`;
    return this.getCached(cacheKey, async () => {
    const { startDate, endDate } = this.parsePeriod(period);
    const users = await this.userRepository.find({
      where: { createdAt: Between(startDate, endDate) },
      order: { createdAt: 'ASC' },
    });

    const grouped = new Map<string, UserGrowthTimeSeries>();
    let cumulativeTotal = await this.userRepository.count({
      where: { createdAt: LessThanOrEqual(startDate) },
    });

    users.forEach((user) => {
      const date = (user.createdAt?.toISOString().split('T')[0]) ?? '';
      if (!grouped.has(date)) {
        grouped.set(date, {
          date,
          newUsers: 0,
          totalUsers: cumulativeTotal,
          activeUsers: 0,
        });
      }

      const entry = grouped.get(date)!;
      entry.newUsers += 1;
      entry.totalUsers = cumulativeTotal + entry.newUsers;
      if (user.isActive) {
        entry.activeUsers += 1;
      }
    });

    return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
    });
  }

  /**
   * Get listing metrics
   */
  async getListingMetrics(period: string = '30d', userId?: string): Promise<ListingMetrics> {
    const cacheKey = `listings:${period}:${userId || 'all'}`;
    return this.getCached(cacheKey, async () => {
    const { startDate, endDate } = this.parsePeriod(period);

    const whereCondition: any = {
      createdAt: Between(startDate, endDate),
    };

    if (userId) {
      whereCondition.sellerId = userId;
    }

    const [
      totalListings,
      activeListings,
      pendingListings,
      rejectedListings,
      soldListings,
      allListings,
    ] = await Promise.all([
      this.listingRepository.count({ where: whereCondition }),
      this.listingRepository.count({
        where: { ...whereCondition, status: ListingStatus.APPROVED },
      }),
      this.listingRepository.count({
        where: { ...whereCondition, status: ListingStatus.PENDING },
      }),
      this.listingRepository.count({
        where: { ...whereCondition, status: ListingStatus.REJECTED },
      }),
      this.listingRepository.count({
        where: { ...whereCondition, status: ListingStatus.SOLD },
      }),
      this.listingRepository.find({ where: whereCondition }),
    ]);

    const totalViews = allListings.reduce((sum, l) => sum + (l.viewCount || 0), 0);
    const totalFavorites = allListings.reduce((sum, l) => sum + (l.favoriteCount || 0), 0);
    const totalInquiries = allListings.reduce((sum, l) => sum + (l.inquiryCount || 0), 0);
    const averageViewsPerListing = totalListings > 0 ? totalViews / totalListings : 0;
    const conversionRate =
      totalInquiries > 0 ? (soldListings / totalInquiries) * 100 : 0;

    return {
      totalListings,
      activeListings,
      pendingListings,
      rejectedListings,
      soldListings,
      totalViews,
      totalFavorites,
      totalInquiries,
      averageViewsPerListing,
      conversionRate,
    };
    });
  }

  /**
   * Get listing performance time series
   */
  async getListingPerformanceTimeSeries(
    period: string = '30d',
    userId?: string,
  ): Promise<ListingPerformanceTimeSeries[]> {
    const cacheKey = `listings-performance:${period}:${userId || 'all'}`;
    return this.getCached(cacheKey, async () => {
    const { startDate, endDate } = this.parsePeriod(period);
    const listings = await this.listingRepository.find({
      where: userId
        ? {
            sellerId: userId,
            createdAt: Between(startDate, endDate),
          }
        : {
            createdAt: Between(startDate, endDate),
          },
      order: { createdAt: 'ASC' },
    });

    const grouped = new Map<string, ListingPerformanceTimeSeries>();

    listings.forEach((listing) => {
      const date = (listing.createdAt?.toISOString().split('T')[0]) ?? '';
      if (!grouped.has(date)) {
        grouped.set(date, {
          date,
          newListings: 0,
          approvedListings: 0,
          soldListings: 0,
          views: 0,
          inquiries: 0,
        });
      }

      const entry = grouped.get(date)!;
      entry.newListings += 1;
      entry.views += listing.viewCount || 0;
      entry.inquiries += listing.inquiryCount || 0;

      if (listing.status === ListingStatus.APPROVED) {
        entry.approvedListings += 1;
      }
      if (listing.status === ListingStatus.SOLD) {
        entry.soldListings += 1;
      }
    });

    return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
    });
  }

  /**
   * Get top listings
   */
  async getTopListings(limit: number = 10, userId?: string): Promise<TopListing[]> {
    const cacheKey = `top-listings:${limit}:${userId || 'all'}`;
    return this.getCached(cacheKey, async () => {
    const whereCondition: any = {};
    if (userId) {
      whereCondition.sellerId = userId;
    }

    const listings = await this.listingRepository.find({
      where: whereCondition,
      order: { viewCount: 'DESC', favoriteCount: 'DESC' },
      take: limit,
      relations: ['carDetail'],
    });

    return listings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      price: listing.price,
      views: listing.viewCount || 0,
      favorites: listing.favoriteCount || 0,
      inquiries: listing.inquiryCount || 0,
      status: listing.status,
      createdAt: listing.createdAt,
    }));
    }, 2 * 60 * 1000); // Cache top listings for 2 minutes
  }

  /**
   * Get transaction metrics
   */
  async getTransactionMetrics(period: string = '30d', userId?: string): Promise<TransactionMetrics> {
    const cacheKey = `transactions:${period}:${userId || 'all'}`;
    return this.getCached(cacheKey, async () => {
    const { startDate, endDate } = this.parsePeriod(period);

    const whereCondition: any = {
      createdAt: Between(startDate, endDate),
    };

    if (userId) {
      whereCondition.sellerId = userId;
    }

    const [completed, pending, cancelled, allTransactions] = await Promise.all([
      this.transactionRepository.find({
        where: { ...whereCondition, status: TransactionStatus.COMPLETED },
        relations: ['listing'],
      }),
      this.transactionRepository.find({
        where: { ...whereCondition, status: TransactionStatus.PENDING },
      }),
      this.transactionRepository.find({
        where: { ...whereCondition, status: TransactionStatus.CANCELLED },
      }),
      this.transactionRepository.find({
        where: whereCondition,
        relations: ['listing'],
      }),
    ]);

    const totalRevenue = completed.reduce((sum, t) => sum + Number(t.amount), 0);
    const platformFees = completed.reduce((sum, t) => sum + Number(t.platformFee), 0);
    const averageTransactionValue =
      completed.length > 0 ? totalRevenue / completed.length : 0;

    // Calculate average time to sale
    let totalDaysToSale = 0;
    let salesWithListing = 0;
    completed.forEach((t) => {
      if (t.listing && t.completedAt && t.listing.createdAt) {
        const days =
          (t.completedAt.getTime() - t.listing.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        totalDaysToSale += days;
        salesWithListing += 1;
      }
    });
    const averageTimeToSale = salesWithListing > 0 ? totalDaysToSale / salesWithListing : 0;

    const completionRate =
      allTransactions.length > 0
        ? (completed.length / allTransactions.length) * 100
        : 0;

    return {
      totalTransactions: allTransactions.length,
      completedTransactions: completed.length,
      pendingTransactions: pending.length,
      cancelledTransactions: cancelled.length,
      totalRevenue,
      platformFees,
      averageTransactionValue,
      averageTimeToSale,
      completionRate,
    };
    });
  }

  /**
   * Get transaction time series
   */
  async getTransactionTimeSeries(period: string = '30d', userId?: string): Promise<TransactionTimeSeries[]> {
    const cacheKey = `transactions-timeseries:${period}:${userId || 'all'}`;
    return this.getCached(cacheKey, async () => {
    const { startDate, endDate } = this.parsePeriod(period);
    const transactions = await this.transactionRepository.find({
      where: userId
        ? {
            sellerId: userId,
            createdAt: Between(startDate, endDate),
          }
        : {
            createdAt: Between(startDate, endDate),
          },
      order: { createdAt: 'ASC' },
    });

    const grouped = new Map<string, TransactionTimeSeries>();

    transactions.forEach((t) => {
      const date = (t.createdAt?.toISOString().split('T')[0]) ?? '';
      if (!grouped.has(date)) {
        grouped.set(date, {
          date,
          transactions: 0,
          revenue: 0,
          completed: 0,
        });
      }

      const entry = grouped.get(date)!;
      entry.transactions += 1;

      if (t.status === TransactionStatus.COMPLETED) {
        entry.revenue += Number(t.amount);
        entry.completed += 1;
      }
    });

    return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
    });
  }

  /**
   * Get payment method breakdown
   */
  async getPaymentMethodBreakdown(period: string = '30d', userId?: string): Promise<PaymentMethodBreakdown[]> {
    const cacheKey = `payment-methods:${period}:${userId || 'all'}`;
    return this.getCached(cacheKey, async () => {
    const { startDate, endDate } = this.parsePeriod(period);

    const whereCondition: any = {
      createdAt: Between(startDate, endDate),
      status: TransactionStatus.COMPLETED,
    };

    if (userId) {
      whereCondition.sellerId = userId;
    }

    const transactions = await this.transactionRepository.find({
      where: whereCondition,
    });

    const grouped = new Map<string, { count: number; totalAmount: number }>();

    transactions.forEach((t) => {
      const method = t.paymentMethod;
      if (!grouped.has(method)) {
        grouped.set(method, { count: 0, totalAmount: 0 });
      }

      const entry = grouped.get(method)!;
      entry.count += 1;
      entry.totalAmount += Number(t.amount);
    });

    const totalAmount = Array.from(grouped.values()).reduce(
      (sum, e) => sum + e.totalAmount,
      0,
    );

    return Array.from(grouped.entries()).map(([method, data]) => ({
      method,
      count: data.count,
      totalAmount: data.totalAmount,
      percentage: totalAmount > 0 ? (data.totalAmount / totalAmount) * 100 : 0,
    }));
    });
  }

  /**
   * Get engagement metrics
   */
  async getEngagementMetrics(period: string = '30d', userId?: string): Promise<EngagementMetrics> {
    const cacheKey = `engagement:${period}:${userId || 'all'}`;
    return this.getCached(cacheKey, async () => {
    const { startDate, endDate } = this.parsePeriod(period);

    const conversationWhere: any = {
      createdAt: Between(startDate, endDate),
    };

    if (userId) {
      conversationWhere.sellerId = userId;
    }

    const [conversations, messages] = await Promise.all([
      this.conversationRepository.find({
        where: conversationWhere,
        relations: ['messages'],
      }),
      this.messageRepository.find({
        where: {
          createdAt: Between(startDate, endDate),
          ...(userId ? { senderId: userId } : {}),
        },
      }),
    ]);

    const totalConversations = conversations.length;
    const totalMessages = messages.length;
    const activeConversations = conversations.filter(
      (c) => c.lastMessageAt && c.lastMessageAt >= startDate,
    ).length;

    const averageMessagesPerConversation =
      totalConversations > 0 ? totalMessages / totalConversations : 0;

    // Calculate response rate (conversations with at least 2 messages)
    const conversationsWithResponses = conversations.filter(
      (c) => c.messages && c.messages.length >= 2,
    ).length;
    const responseRate =
      totalConversations > 0 ? (conversationsWithResponses / totalConversations) * 100 : 0;

    // Calculate average response time
    let totalResponseTime = 0;
    let responseCount = 0;
    conversations.forEach((c) => {
      if (c.messages && c.messages.length >= 2) {
        const sortedMessages = c.messages.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        );
        for (let i = 1; i < sortedMessages.length; i++) {
          const current = sortedMessages[i];
          const previous = sortedMessages[i - 1];
          if (!current || !previous) {
            continue;
          }
          const timeDiff =
            (current.createdAt.getTime() - previous.createdAt.getTime()) /
            (1000 * 60 * 60);
          totalResponseTime += timeDiff;
          responseCount += 1;
        }
      }
    });
    const averageResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0;

    return {
      totalConversations,
      totalMessages,
      activeConversations,
      averageMessagesPerConversation,
      responseRate,
      averageResponseTime,
    };
    });
  }

  /**
   * Get engagement time series
   */
  async getEngagementTimeSeries(period: string = '30d', userId?: string): Promise<EngagementTimeSeries[]> {
    const cacheKey = `engagement-timeseries:${period}:${userId || 'all'}`;
    return this.getCached(cacheKey, async () => {
    const { startDate, endDate } = this.parsePeriod(period);

    const conversationWhere: any = {
      createdAt: Between(startDate, endDate),
    };

    if (userId) {
      conversationWhere.sellerId = userId;
    }

    const [conversations, messages] = await Promise.all([
      this.conversationRepository.find({
        where: conversationWhere,
        order: { createdAt: 'ASC' },
      }),
      this.messageRepository.find({
        where: {
          createdAt: Between(startDate, endDate),
          ...(userId ? { senderId: userId } : {}),
        },
        order: { createdAt: 'ASC' },
      }),
    ]);

    const grouped = new Map<string, EngagementTimeSeries>();

    conversations.forEach((c) => {
      const date = (c.createdAt?.toISOString().split('T')[0]) ?? '';
      if (!grouped.has(date)) {
        grouped.set(date, { date, conversations: 0, messages: 0 });
      }
      grouped.get(date)!.conversations += 1;
    });

    messages.forEach((m) => {
      const date = (m.createdAt?.toISOString().split('T')[0]) ?? '';
      if (!grouped.has(date)) {
        grouped.set(date, { date, conversations: 0, messages: 0 });
      }
      grouped.get(date)!.messages += 1;
    });

    return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
    });
  }

  /**
   * Get geographic distribution
   */
  async getGeographicDistribution(): Promise<GeographicDistribution[]> {
    const cacheKey = 'geographic:all';
    return this.getCached(cacheKey, async () => {
    const listings = await this.listingRepository.find({
      select: ['location', 'city', 'state', 'country'],
    });

    const users = await this.userRepository.find({
      select: ['location'],
    });

    const transactions = await this.transactionRepository.find({
      relations: ['listing'],
      where: { status: TransactionStatus.COMPLETED },
    });

    const grouped = new Map<string, GeographicDistribution>();

    listings.forEach((l) => {
      const location = l.city || l.state || l.country || l.location || 'Unknown';
      if (!grouped.has(location)) {
        grouped.set(location, {
          location,
          listings: 0,
          users: 0,
          transactions: 0,
        });
      }
      grouped.get(location)!.listings += 1;
    });

    users.forEach((u) => {
      const location = u.location || 'Unknown';
      if (!grouped.has(location)) {
        grouped.set(location, {
          location,
          listings: 0,
          users: 0,
          transactions: 0,
        });
      }
      grouped.get(location)!.users += 1;
    });

    transactions.forEach((t) => {
      const location =
        t.listing?.city ||
        t.listing?.state ||
        t.listing?.country ||
        t.listing?.location ||
        'Unknown';
      if (!grouped.has(location)) {
        grouped.set(location, {
          location,
          listings: 0,
          users: 0,
          transactions: 0,
        });
      }
      grouped.get(location)!.transactions += 1;
    });

    return Array.from(grouped.values()).sort((a, b) => b.listings - a.listings);
    }, 15 * 60 * 1000); // Cache geographic data for 15 minutes
  }

  /**
   * Get dashboard data for specific role
   */
  async getDashboardData(role: string, userId?: string, period: string = '30d'): Promise<DashboardData> {
    const dashboardData: DashboardData = {
      role,
      overview: {},
      charts: {},
    };

    switch (role) {
      case 'super_admin':
        dashboardData.overview = {
          revenue: await this.getRevenueMetrics(period),
          users: await this.getUserMetrics(period),
          listings: await this.getListingMetrics(period),
          transactions: await this.getTransactionMetrics(period),
          engagement: await this.getEngagementMetrics(period),
        };
        dashboardData.charts = {
          revenueTrend: await this.getRevenueTimeSeries(period),
          userGrowth: await this.getUserGrowthTimeSeries(period),
          listingPerformance: await this.getListingPerformanceTimeSeries(period),
          transactionVolume: await this.getTransactionTimeSeries(period),
          paymentMethods: await this.getPaymentMethodBreakdown(period),
          engagementTrend: await this.getEngagementTimeSeries(period),
          geographic: await this.getGeographicDistribution(),
        };
        dashboardData.topListings = await this.getTopListings(10);
        break;

      case 'admin':
        dashboardData.overview = {
          users: await this.getUserMetrics(period),
          listings: await this.getListingMetrics(period),
          transactions: await this.getTransactionMetrics(period),
        };
        dashboardData.charts = {
          listingPerformance: await this.getListingPerformanceTimeSeries(period),
          userGrowth: await this.getUserGrowthTimeSeries(period),
          transactionVolume: await this.getTransactionTimeSeries(period),
        };
        break;

      case 'moderator':
        dashboardData.overview = {
          listings: await this.getListingMetrics(period),
          engagement: await this.getEngagementMetrics(period),
        };
        dashboardData.charts = {
          listingPerformance: await this.getListingPerformanceTimeSeries(period),
          engagementTrend: await this.getEngagementTimeSeries(period),
        };
        break;

      case 'seller':
        if (!userId) {
          throw new Error('User ID required for seller dashboard');
        }
        dashboardData.overview = {
          revenue: await this.getRevenueMetrics(period, userId),
          listings: await this.getListingMetrics(period, userId),
          transactions: await this.getTransactionMetrics(period, userId),
          engagement: await this.getEngagementMetrics(period, userId),
        };
        dashboardData.charts = {
          revenueTrend: await this.getRevenueTimeSeries(period, userId),
          listingPerformance: await this.getListingPerformanceTimeSeries(period, userId),
          transactionVolume: await this.getTransactionTimeSeries(period, userId),
          engagementTrend: await this.getEngagementTimeSeries(period, userId),
        };
        dashboardData.topListings = await this.getTopListings(5, userId);
        break;

      default:
        throw new Error(`Unknown role: ${role}`);
    }

    return dashboardData;
  }
}


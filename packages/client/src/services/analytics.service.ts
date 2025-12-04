import { apiClient } from '../lib/api';

export interface RevenueMetrics {
  totalRevenue: number;
  platformFees: number;
  averageTransactionValue: number;
  completedTransactions: number;
  pendingTransactions: number;
  cancelledTransactions: number;
}

export interface RevenueTimeSeries {
  date: string;
  revenue: number;
  platformFees: number;
  transactions: number;
}

export interface UserMetrics {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  growthRate: number;
  retentionRate: number;
}

export interface UserGrowthTimeSeries extends Record<string, string | number> {
  date: string;
  newUsers: number;
  totalUsers: number;
  activeUsers: number;
}

export interface ListingMetrics {
  totalListings: number;
  activeListings: number;
  pendingListings: number;
  rejectedListings: number;
  soldListings: number;
  totalViews: number;
  totalFavorites: number;
  totalInquiries: number;
  averageViewsPerListing: number;
  conversionRate: number;
}

export interface ListingPerformanceTimeSeries extends Record<string, string | number> {
  date: string;
  newListings: number;
  approvedListings: number;
  soldListings: number;
  views: number;
  inquiries: number;
}

export interface TopListing {
  id: string;
  title: string;
  price: number;
  views: number;
  favorites: number;
  inquiries: number;
  status: string;
  createdAt: string;
}

export interface TransactionMetrics {
  totalTransactions: number;
  completedTransactions: number;
  pendingTransactions: number;
  cancelledTransactions: number;
  totalRevenue: number;
  platformFees: number;
  averageTransactionValue: number;
  averageTimeToSale: number;
  completionRate: number;
}

export interface TransactionTimeSeries extends Record<string, string | number> {
  date: string;
  transactions: number;
  revenue: number;
  completed: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  count: number;
  totalAmount: number;
  percentage: number;
}

export interface EngagementMetrics {
  totalConversations: number;
  totalMessages: number;
  activeConversations: number;
  averageMessagesPerConversation: number;
  responseRate: number;
  averageResponseTime: number;
}

export interface EngagementTimeSeries {
  date: string;
  conversations: number;
  messages: number;
}

export interface GeographicDistribution {
  location: string;
  listings: number;
  users: number;
  transactions: number;
}

export interface DashboardData {
  role: string;
  overview: {
    revenue?: RevenueMetrics;
    users?: UserMetrics;
    listings?: ListingMetrics;
    transactions?: TransactionMetrics;
    engagement?: EngagementMetrics;
  };
  charts: {
    revenueTrend?: RevenueTimeSeries[];
    userGrowth?: UserGrowthTimeSeries[];
    listingPerformance?: ListingPerformanceTimeSeries[];
    transactionVolume?: TransactionTimeSeries[];
    paymentMethods?: PaymentMethodBreakdown[];
    engagementTrend?: EngagementTimeSeries[];
    geographic?: GeographicDistribution[];
  };
  topListings?: TopListing[];
}

export class AnalyticsService {
  static async getDashboardData(
    role: string,
    period: string = '30d'
  ): Promise<DashboardData> {
    return apiClient.get<DashboardData>(`/analytics/dashboard/${role}`, { period });
  }

  static async getRevenue(period: string = '30d') {
    return apiClient.get('/analytics/revenue', { period });
  }

  static async getUserGrowth(period: string = '30d') {
    return apiClient.get('/analytics/users/growth', { period });
  }

  static async getListingPerformance(period: string = '30d') {
    return apiClient.get('/analytics/listings/performance', { period });
  }

  static async getTransactions(period: string = '30d') {
    return apiClient.get('/analytics/transactions', { period });
  }

  static async getEngagement(period: string = '30d') {
    return apiClient.get('/analytics/engagement', { period });
  }

  static async getGeographic() {
    return apiClient.get<GeographicDistribution[]>('/analytics/geographic');
  }
}


import { useState, useEffect } from 'react';
import {
  DollarSign,
  Car,
  Eye,
  Heart,
  MessageSquare,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { ChartCard } from '../../components/dashboard/ChartCard';
import { TimeRangeSelector } from '../../components/dashboard/TimeRangeSelector';
import type { TimeRange } from '../../components/dashboard/TimeRangeSelector';
import { LineChart } from '../../components/charts/LineChart';
import { BarChart } from '../../components/charts/BarChart';
import { AreaChart } from '../../components/charts/AreaChart';
import { AnalyticsService } from '../../services/analytics.service';
import type { DashboardData } from '../../services/analytics.service';
import { METRIC_TOOLTIPS } from '../../constants/metricTooltips';
import toast from 'react-hot-toast';

export function SellerDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await AnalyticsService.getDashboardData('seller', timeRange);
      setDashboardData(data);
    } catch (error: any) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Seller Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading dashboard data...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!dashboardData) {
    return (
      <DashboardLayout title="Seller Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Failed to load dashboard data</div>
        </div>
      </DashboardLayout>
    );
  }

  const { overview, charts, topListings } = dashboardData;

  // Calculate conversion rate
  const conversionRate =
    overview.listings && overview.listings.totalInquiries > 0
      ? (overview.listings.soldListings / overview.listings.totalInquiries) * 100
      : 0;

  return (
    <DashboardLayout
      title="Seller Dashboard"
      subtitle="Your listing performance and sales metrics"
    >
      {/* Time Range Selector */}
      <div className="mb-6 flex justify-end">
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {overview.revenue && (
          <>
            <MetricCard
              title="Total Revenue"
              value={overview.revenue.totalRevenue}
              icon={DollarSign}
              iconColor="text-green-600"
              tooltip={METRIC_TOOLTIPS['Total Revenue']}
            />
            <MetricCard
              title="Completed Sales"
              value={overview.revenue.completedTransactions}
              icon={Car}
              iconColor="text-blue-600"
              tooltip={METRIC_TOOLTIPS['Completed Sales']}
            />
            <MetricCard
              title="Avg Sale Value"
              value={overview.revenue.averageTransactionValue}
              icon={TrendingUp}
              iconColor="text-purple-600"
              tooltip={METRIC_TOOLTIPS['Avg Sale Value']}
            />
          </>
        )}
        {overview.listings && (
          <>
            <MetricCard
              title="Total Listings"
              value={overview.listings.totalListings}
              icon={Car}
              iconColor="text-blue-600"
              tooltip={METRIC_TOOLTIPS['Total Listings']}
            />
            <MetricCard
              title="Active Listings"
              value={overview.listings.activeListings}
              icon={Car}
              iconColor="text-green-600"
              tooltip={METRIC_TOOLTIPS['Active Listings']}
            />
            <MetricCard
              title="Pending Approval"
              value={overview.listings.pendingListings}
              icon={Car}
              iconColor="text-yellow-600"
              tooltip={METRIC_TOOLTIPS['Pending Approval']}
            />
            <MetricCard
              title="Sold Listings"
              value={overview.listings.soldListings}
              icon={Car}
              iconColor="text-orange-600"
              tooltip={METRIC_TOOLTIPS['Sold Listings']}
            />
            <MetricCard
              title="Total Views"
              value={overview.listings.totalViews}
              icon={Eye}
              iconColor="text-blue-600"
              tooltip={METRIC_TOOLTIPS['Total Views']}
            />
            <MetricCard
              title="Total Favorites"
              value={overview.listings.totalFavorites}
              icon={Heart}
              iconColor="text-red-600"
              tooltip={METRIC_TOOLTIPS['Total Favorites']}
            />
            <MetricCard
              title="Total Inquiries"
              value={overview.listings.totalInquiries}
              icon={MessageSquare}
              iconColor="text-purple-600"
              tooltip={METRIC_TOOLTIPS['Total Inquiries']}
            />
            <MetricCard
              title="Conversion Rate"
              value={`${conversionRate.toFixed(2)}%`}
              icon={TrendingUp}
              iconColor="text-green-600"
              tooltip={METRIC_TOOLTIPS['Conversion Rate']}
            />
          </>
        )}
        {overview.transactions && (
          <>
            <MetricCard
              title="Avg Time to Sale"
              value={`${overview.transactions.averageTimeToSale.toFixed(1)} days`}
              icon={Clock}
              iconColor="text-blue-600"
              tooltip={METRIC_TOOLTIPS['Avg Time to Sale']}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
        {charts.revenueTrend && charts.revenueTrend.length > 0 && (
          <ChartCard title="Revenue Trend">
            <AreaChart
              data={charts.revenueTrend}
              dataKeys={[{ key: 'revenue', color: '#10b981', name: 'Revenue' }]}
              xAxisKey="date"
            />
          </ChartCard>
        )}

        {charts.listingPerformance && charts.listingPerformance.length > 0 && (
          <ChartCard title="Listing Performance">
            <BarChart
              data={charts.listingPerformance}
              dataKeys={[
                { key: 'views', color: '#3b82f6', name: 'Views' },
                { key: 'inquiries', color: '#8b5cf6', name: 'Inquiries' },
              ]}
              xAxisKey="date"
            />
          </ChartCard>
        )}

        {charts.transactionVolume && charts.transactionVolume.length > 0 && (
          <ChartCard title="Sales Trend">
            <LineChart
              data={charts.transactionVolume}
              dataKeys={[
                { key: 'completed', color: '#10b981', name: 'Completed Sales' },
              ]}
              xAxisKey="date"
            />
          </ChartCard>
        )}

        {charts.engagementTrend && charts.engagementTrend.length > 0 && (
          <ChartCard title="Inquiry Activity">
            <BarChart
              data={charts.engagementTrend}
              dataKeys={[
                { key: 'conversations', color: '#3b82f6', name: 'Conversations' },
                { key: 'messages', color: '#8b5cf6', name: 'Messages' },
              ]}
              xAxisKey="date"
            />
          </ChartCard>
        )}
      </div>

      {/* Top Listings */}
      {topListings && topListings.length > 0 && (
        <div className="mb-6">
          <ChartCard title="Your Top Performing Listings">
            <div className="overflow-x-auto">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Listing
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Favorites
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Inquiries
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topListings.map((listing) => (
                    <tr key={listing.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {listing.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {listing.views}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {listing.favorites}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {listing.inquiries}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            listing.status === 'approved'
                              ? 'bg-green-100 text-green-800'
                              : listing.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {listing.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </ChartCard>
        </div>
      )}
    </DashboardLayout>
  );
}


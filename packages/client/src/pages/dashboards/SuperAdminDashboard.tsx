import { useState, useEffect } from 'react';
import {
  DollarSign,
  Users,
  Car,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { SidebarLayout, type DashboardSection } from '../../components/dashboard/SidebarLayout';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { ChartCard } from '../../components/dashboard/ChartCard';
import { TimeRangeSelector } from '../../components/dashboard/TimeRangeSelector';
import type { TimeRange } from '../../components/dashboard/TimeRangeSelector';
import { LineChart } from '../../components/charts/LineChart';
import { AreaChart } from '../../components/charts/AreaChart';
import { BarChart } from '../../components/charts/BarChart';
import { PieChart } from '../../components/charts/PieChart';
import { AnalyticsService } from '../../services/analytics.service';
import type { DashboardData } from '../../services/analytics.service';
import { METRIC_TOOLTIPS } from '../../constants/metricTooltips';
import toast from 'react-hot-toast';

export function SuperAdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await AnalyticsService.getDashboardData('super_admin', timeRange);
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
      <SidebarLayout
        title="Super Admin Dashboard"
        subtitle="Complete system overview and analytics"
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading dashboard data...</div>
        </div>
      </SidebarLayout>
    );
  }

  if (!dashboardData) {
    return (
      <SidebarLayout
        title="Super Admin Dashboard"
        subtitle="Complete system overview and analytics"
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      >
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Failed to load dashboard data</div>
        </div>
      </SidebarLayout>
    );
  }

  const { overview, charts, topListings } = dashboardData;

  const renderSection = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <>
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
                    title="Platform Fees"
                    value={overview.revenue.platformFees}
                    icon={TrendingUp}
                    iconColor="text-blue-600"
                    tooltip={METRIC_TOOLTIPS['Platform Fees']}
                  />
                  <MetricCard
                    title="Avg Transaction Value"
                    value={overview.revenue.averageTransactionValue}
                    icon={BarChart3}
                    iconColor="text-purple-600"
                    tooltip={METRIC_TOOLTIPS['Avg Transaction Value']}
                  />
                  <MetricCard
                    title="Completed Transactions"
                    value={overview.revenue.completedTransactions}
                    icon={Car}
                    iconColor="text-orange-600"
                    tooltip={METRIC_TOOLTIPS['Completed Transactions']}
                  />
                </>
              )}
              {overview.users && (
                <>
                  <MetricCard
                    title="Total Users"
                    value={overview.users.totalUsers}
                    icon={Users}
                    iconColor="text-blue-600"
                    tooltip={METRIC_TOOLTIPS['Total Users']}
                  />
                  <MetricCard
                    title="Active Users"
                    value={overview.users.activeUsers}
                    icon={Users}
                    iconColor="text-green-600"
                    tooltip={METRIC_TOOLTIPS['Active Users']}
                  />
                  <MetricCard
                    title="New Users"
                    value={overview.users.newUsers}
                    icon={TrendingUp}
                    iconColor="text-purple-600"
                    tooltip={METRIC_TOOLTIPS['New Users']}
                  />
                  <MetricCard
                    title="Growth Rate"
                    value={`${overview.users.growthRate.toFixed(2)}%`}
                    icon={TrendingUp}
                    iconColor="text-orange-600"
                    tooltip={METRIC_TOOLTIPS['Growth Rate']}
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
                    title="Pending Listings"
                    value={overview.listings.pendingListings}
                    icon={Car}
                    iconColor="text-yellow-600"
                    tooltip={METRIC_TOOLTIPS['Pending Listings']}
                  />
                  <MetricCard
                    title="Conversion Rate"
                    value={`${overview.listings.conversionRate.toFixed(2)}%`}
                    icon={TrendingUp}
                    iconColor="text-purple-600"
                    tooltip={METRIC_TOOLTIPS['Conversion Rate']}
                  />
                </>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {charts.revenueTrend && charts.revenueTrend.length > 0 && (
                <ChartCard title="Revenue Trend">
                  <LineChart
                    data={charts.revenueTrend as any[]}
                    dataKeys={[
                      { key: 'revenue', color: '#10b981', name: 'Revenue' },
                      { key: 'platformFees', color: '#3b82f6', name: 'Platform Fees' },
                    ]}
                    xAxisKey="date"
                  />
                </ChartCard>
              )}
              {charts.userGrowth && charts.userGrowth.length > 0 && (
                <ChartCard title="User Growth">
                  <AreaChart
                    data={charts.userGrowth as any[]}
                    dataKeys={[
                      { key: 'newUsers', color: '#3b82f6', name: 'New Users' },
                      { key: 'totalUsers', color: '#10b981', name: 'Total Users' },
                    ]}
                    xAxisKey="date"
                    stacked={false}
                  />
                </ChartCard>
              )}
            </div>
          </>
        );

      case 'revenue':
        return (
          <>
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
                    title="Platform Fees"
                    value={overview.revenue.platformFees}
                    icon={TrendingUp}
                    iconColor="text-blue-600"
                    tooltip={METRIC_TOOLTIPS['Platform Fees']}
                  />
                  <MetricCard
                    title="Avg Transaction Value"
                    value={overview.revenue.averageTransactionValue}
                    icon={BarChart3}
                    iconColor="text-purple-600"
                    tooltip={METRIC_TOOLTIPS['Avg Transaction Value']}
                  />
                  <MetricCard
                    title="Completed Transactions"
                    value={overview.revenue.completedTransactions}
                    icon={Car}
                    iconColor="text-orange-600"
                    tooltip={METRIC_TOOLTIPS['Completed Transactions']}
                  />
                </>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
              {charts.revenueTrend && charts.revenueTrend.length > 0 && (
                <ChartCard title="Revenue Trend">
                  <LineChart
                    data={charts.revenueTrend as any[]}
                    dataKeys={[
                      { key: 'revenue', color: '#10b981', name: 'Revenue' },
                      { key: 'platformFees', color: '#3b82f6', name: 'Platform Fees' },
                    ]}
                    xAxisKey="date"
                  />
                </ChartCard>
              )}
              {charts.transactionVolume && charts.transactionVolume.length > 0 && (
                <ChartCard title="Transaction Volume">
                  <BarChart
                    data={charts.transactionVolume as any[]}
                    dataKeys={[
                      { key: 'transactions', color: '#3b82f6', name: 'Transactions' },
                      { key: 'completed', color: '#10b981', name: 'Completed' },
                    ]}
                    xAxisKey="date"
                  />
                </ChartCard>
              )}
            </div>
            {charts.paymentMethods && charts.paymentMethods.length > 0 && (
              <div className="mb-6">
                <ChartCard title="Payment Methods Distribution">
                  <PieChart
                    data={charts.paymentMethods as any[]}
                    dataKey="totalAmount"
                    nameKey="method"
                  />
                </ChartCard>
              </div>
            )}
          </>
        );

      case 'users':
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
              {overview.users && (
                <>
                  <MetricCard
                    title="Total Users"
                    value={overview.users.totalUsers}
                    icon={Users}
                    iconColor="text-blue-600"
                    tooltip={METRIC_TOOLTIPS['Total Users']}
                  />
                  <MetricCard
                    title="Active Users"
                    value={overview.users.activeUsers}
                    icon={Users}
                    iconColor="text-green-600"
                    tooltip={METRIC_TOOLTIPS['Active Users']}
                  />
                  <MetricCard
                    title="New Users"
                    value={overview.users.newUsers}
                    icon={TrendingUp}
                    iconColor="text-purple-600"
                    tooltip={METRIC_TOOLTIPS['New Users']}
                  />
                  <MetricCard
                    title="Growth Rate"
                    value={`${overview.users.growthRate.toFixed(2)}%`}
                    icon={TrendingUp}
                    iconColor="text-orange-600"
                    tooltip={METRIC_TOOLTIPS['Growth Rate']}
                  />
                </>
              )}
            </div>
            {charts.userGrowth && charts.userGrowth.length > 0 && (
              <div className="mb-6">
                <ChartCard title="User Growth Over Time">
                  <AreaChart
                    data={charts.userGrowth as any[]}
                    dataKeys={[
                      { key: 'newUsers', color: '#3b82f6', name: 'New Users' },
                      { key: 'totalUsers', color: '#10b981', name: 'Total Users' },
                    ]}
                    xAxisKey="date"
                    stacked={false}
                  />
                </ChartCard>
              </div>
            )}
          </>
        );

      case 'listings':
        return (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
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
                    title="Pending Listings"
                    value={overview.listings.pendingListings}
                    icon={Car}
                    iconColor="text-yellow-600"
                    tooltip={METRIC_TOOLTIPS['Pending Listings']}
                  />
                  <MetricCard
                    title="Conversion Rate"
                    value={`${overview.listings.conversionRate.toFixed(2)}%`}
                    icon={TrendingUp}
                    iconColor="text-purple-600"
                    tooltip={METRIC_TOOLTIPS['Conversion Rate']}
                  />
                </>
              )}
            </div>
            {charts.listingPerformance && charts.listingPerformance.length > 0 && (
              <div className="mb-6">
                <ChartCard title="Listing Performance">
                  <BarChart
                    data={charts.listingPerformance as any[]}
                    dataKeys={[
                      { key: 'newListings', color: '#3b82f6', name: 'New' },
                      { key: 'approvedListings', color: '#10b981', name: 'Approved' },
                      { key: 'soldListings', color: '#f59e0b', name: 'Sold' },
                    ]}
                    xAxisKey="date"
                    stacked={true}
                  />
                </ChartCard>
              </div>
            )}
            {topListings && topListings.length > 0 && (
              <div className="mb-6">
                <ChartCard title="Top Performing Listings">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Listing
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Price
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
                              ${listing.price.toLocaleString()}
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
                </ChartCard>
              </div>
            )}
          </>
        );

      case 'analytics':
        return (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
              {charts.revenueTrend && charts.revenueTrend.length > 0 && (
                <ChartCard title="Revenue Trend">
                  <LineChart
                    data={charts.revenueTrend as any[]}
                    dataKeys={[
                      { key: 'revenue', color: '#10b981', name: 'Revenue' },
                      { key: 'platformFees', color: '#3b82f6', name: 'Platform Fees' },
                    ]}
                    xAxisKey="date"
                  />
                </ChartCard>
              )}
              {charts.userGrowth && charts.userGrowth.length > 0 && (
                <ChartCard title="User Growth">
                  <AreaChart
                    data={charts.userGrowth as any[]}
                    dataKeys={[
                      { key: 'newUsers', color: '#3b82f6', name: 'New Users' },
                      { key: 'totalUsers', color: '#10b981', name: 'Total Users' },
                    ]}
                    xAxisKey="date"
                    stacked={false}
                  />
                </ChartCard>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
              {charts.transactionVolume && charts.transactionVolume.length > 0 && (
                <ChartCard title="Transaction Volume">
                  <BarChart
                    data={charts.transactionVolume as any[]}
                    dataKeys={[
                      { key: 'transactions', color: '#3b82f6', name: 'Transactions' },
                      { key: 'completed', color: '#10b981', name: 'Completed' },
                    ]}
                    xAxisKey="date"
                  />
                </ChartCard>
              )}
              {charts.engagementTrend && charts.engagementTrend.length > 0 && (
                <ChartCard title="Engagement Trend">
                  <LineChart
                    data={charts.engagementTrend as any[]}
                    dataKeys={[
                      { key: 'conversations', color: '#3b82f6', name: 'Conversations' },
                      { key: 'messages', color: '#8b5cf6', name: 'Messages' },
                    ]}
                    xAxisKey="date"
                  />
                </ChartCard>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {charts.paymentMethods && charts.paymentMethods.length > 0 && (
                <ChartCard title="Payment Methods">
                  <PieChart
                    data={charts.paymentMethods as any[]}
                    dataKey="totalAmount"
                    nameKey="method"
                  />
                </ChartCard>
              )}
              {charts.listingPerformance && charts.listingPerformance.length > 0 && (
                <ChartCard title="Listing Performance">
                  <BarChart
                    data={charts.listingPerformance as any[]}
                    dataKeys={[
                      { key: 'newListings', color: '#3b82f6', name: 'New' },
                      { key: 'approvedListings', color: '#10b981', name: 'Approved' },
                      { key: 'soldListings', color: '#f59e0b', name: 'Sold' },
                    ]}
                    xAxisKey="date"
                    stacked={true}
                  />
                </ChartCard>
              )}
            </div>
          </>
        );

      case 'geographic':
        return (
          <>
            {charts.geographic && charts.geographic.length > 0 && (
              <div className="mb-6">
                <ChartCard title="Geographic Distribution">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Location
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Listings
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Users
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Transactions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {charts.geographic.map((geo, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {geo.location}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {geo.listings}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {geo.users}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {geo.transactions}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ChartCard>
              </div>
            )}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <SidebarLayout
      title="Super Admin Dashboard"
      subtitle="Complete system overview and analytics"
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {/* Time Range Selector */}
      <div className="mb-6 flex justify-end">
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      {/* Section Content */}
      {renderSection()}
    </SidebarLayout>
  );
}
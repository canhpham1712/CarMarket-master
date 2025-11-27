import { useState, useEffect } from 'react';
import { Users, Car, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { ChartCard } from '../../components/dashboard/ChartCard';
import { TimeRangeSelector } from '../../components/dashboard/TimeRangeSelector';
import type { TimeRange } from '../../components/dashboard/TimeRangeSelector';
import { LineChart } from '../../components/charts/LineChart';
import { BarChart } from '../../components/charts/BarChart';
import { PieChart } from '../../components/charts/PieChart';
import { AnalyticsService } from '../../services/analytics.service';
import type { DashboardData } from '../../services/analytics.service';
import { METRIC_TOOLTIPS } from '../../constants/metricTooltips';
import { RealtimeActivityPanel } from '../../components/monitoring/RealtimeActivityPanel';
import toast from 'react-hot-toast';

export function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await AnalyticsService.getDashboardData('admin', timeRange);
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
      <DashboardLayout title="Admin Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading dashboard data...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!dashboardData) {
    return (
      <DashboardLayout title="Admin Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Failed to load dashboard data</div>
        </div>
      </DashboardLayout>
    );
  }

  const { overview, charts } = dashboardData;

  // Calculate approval/rejection rate
  const approvalRate =
    overview.listings && overview.listings.totalListings > 0
      ? ((overview.listings.activeListings + overview.listings.soldListings) /
          overview.listings.totalListings) *
        100
      : 0;

  const rejectionRate =
    overview.listings && overview.listings.totalListings > 0
      ? (overview.listings.rejectedListings / overview.listings.totalListings) * 100
      : 0;

  return (
    <DashboardLayout
      title="Admin Dashboard"
      subtitle="User and listing management overview"
    >
      {/* Real-time Activity Panel */}
      <div className="mb-8">
        <RealtimeActivityPanel />
      </div>

      {/* Time Range Selector */}
      <div className="mb-6 flex justify-end">
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      {/* Overview Metrics */}
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
          </>
        )}
        {overview.listings && (
          <>
            <MetricCard
              title="Pending Listings"
              value={overview.listings.pendingListings}
              icon={Car}
              iconColor="text-yellow-600"
              tooltip={METRIC_TOOLTIPS['Pending Listings']}
            />
            <MetricCard
              title="Approval Rate"
              value={`${approvalRate.toFixed(1)}%`}
              icon={CheckCircle}
              iconColor="text-green-600"
              tooltip={METRIC_TOOLTIPS['Approval Rate']}
            />
            <MetricCard
              title="Rejection Rate"
              value={`${rejectionRate.toFixed(1)}%`}
              icon={XCircle}
              iconColor="text-red-600"
              tooltip={METRIC_TOOLTIPS['Rejection Rate']}
            />
            <MetricCard
              title="Active Listings"
              value={overview.listings.activeListings}
              icon={Car}
              iconColor="text-blue-600"
              tooltip={METRIC_TOOLTIPS['Active Listings']}
            />
          </>
        )}
        {overview.transactions && (
          <>
            <MetricCard
              title="Total Transactions"
              value={overview.transactions.totalTransactions}
              icon={TrendingUp}
              iconColor="text-blue-600"
              tooltip={METRIC_TOOLTIPS['Total Transactions']}
            />
            <MetricCard
              title="Completion Rate"
              value={`${overview.transactions.completionRate.toFixed(1)}%`}
              icon={CheckCircle}
              iconColor="text-green-600"
              tooltip={METRIC_TOOLTIPS['Completion Rate']}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
        {charts.listingPerformance && charts.listingPerformance.length > 0 && (
          <ChartCard title="Listing Status Breakdown">
            <PieChart
              data={[
                {
                  name: 'Approved',
                  value: overview.listings?.activeListings || 0,
                },
                {
                  name: 'Pending',
                  value: overview.listings?.pendingListings || 0,
                },
                {
                  name: 'Rejected',
                  value: overview.listings?.rejectedListings || 0,
                },
                {
                  name: 'Sold',
                  value: overview.listings?.soldListings || 0,
                },
              ]}
              dataKey="value"
              nameKey="name"
            />
          </ChartCard>
        )}

        {charts.listingPerformance && charts.listingPerformance.length > 0 && (
          <ChartCard title="Listing Activity Trends">
            <LineChart
              data={charts.listingPerformance}
              dataKeys={[
                { key: 'newListings', color: '#3b82f6', name: 'New Listings' },
                { key: 'approvedListings', color: '#10b981', name: 'Approved' },
                { key: 'soldListings', color: '#f59e0b', name: 'Sold' },
              ]}
              xAxisKey="date"
            />
          </ChartCard>
        )}

        {charts.userGrowth && charts.userGrowth.length > 0 && (
          <ChartCard title="User Growth">
            <BarChart
              data={charts.userGrowth}
              dataKeys={[
                { key: 'newUsers', color: '#3b82f6', name: 'New Users' },
                { key: 'activeUsers', color: '#10b981', name: 'Active Users' },
              ]}
              xAxisKey="date"
            />
          </ChartCard>
        )}

        {charts.transactionVolume && charts.transactionVolume.length > 0 && (
          <ChartCard title="Transaction Volume">
            <BarChart
              data={charts.transactionVolume}
              dataKeys={[
                { key: 'transactions', color: '#3b82f6', name: 'Total' },
                { key: 'completed', color: '#10b981', name: 'Completed' },
              ]}
              xAxisKey="date"
            />
          </ChartCard>
        )}
      </div>
    </DashboardLayout>
  );
}


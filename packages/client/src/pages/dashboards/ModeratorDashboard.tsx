import { useState, useEffect } from 'react';
import { FileText, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { ChartCard } from '../../components/dashboard/ChartCard';
import { TimeRangeSelector } from '../../components/dashboard/TimeRangeSelector';
import type { TimeRange } from '../../components/dashboard/TimeRangeSelector';
import { BarChart } from '../../components/charts/BarChart';
import { PieChart } from '../../components/charts/PieChart';
import { LineChart } from '../../components/charts/LineChart';
import { AnalyticsService } from '../../services/analytics.service';
import type { DashboardData } from '../../services/analytics.service';
import { METRIC_TOOLTIPS } from '../../constants/metricTooltips';
import toast from 'react-hot-toast';

export function ModeratorDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await AnalyticsService.getDashboardData('moderator', timeRange);
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
      <DashboardLayout title="Moderator Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading dashboard data...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!dashboardData) {
    return (
      <DashboardLayout title="Moderator Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Failed to load dashboard data</div>
        </div>
      </DashboardLayout>
    );
  }

  const { overview, charts } = dashboardData;

  return (
    <DashboardLayout
      title="Moderator Dashboard"
      subtitle="Content moderation and review metrics"
    >
      {/* Time Range Selector */}
      <div className="mb-6 flex justify-end">
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {overview.listings && (
          <>
            <MetricCard
              title="Pending Reviews"
              value={overview.listings.pendingListings}
              icon={FileText}
              iconColor="text-yellow-600"
              tooltip={METRIC_TOOLTIPS['Pending Reviews']}
            />
            <MetricCard
              title="Approved Listings"
              value={overview.listings.activeListings}
              icon={CheckCircle}
              iconColor="text-green-600"
              tooltip={METRIC_TOOLTIPS['Approved Listings']}
            />
            <MetricCard
              title="Rejected Listings"
              value={overview.listings.rejectedListings}
              icon={AlertCircle}
              iconColor="text-red-600"
              tooltip={METRIC_TOOLTIPS['Rejected Listings']}
            />
            <MetricCard
              title="Total Reviewed"
              value={
                overview.listings.activeListings +
                overview.listings.rejectedListings +
                overview.listings.soldListings
              }
              icon={FileText}
              iconColor="text-blue-600"
              tooltip={METRIC_TOOLTIPS['Total Reviewed']}
            />
          </>
        )}
        {overview.engagement && (
          <>
            <MetricCard
              title="Total Conversations"
              value={overview.engagement.totalConversations}
              icon={MessageSquare}
              iconColor="text-blue-600"
              tooltip={METRIC_TOOLTIPS['Total Conversations']}
            />
            <MetricCard
              title="Active Conversations"
              value={overview.engagement.activeConversations}
              icon={MessageSquare}
              iconColor="text-green-600"
              tooltip={METRIC_TOOLTIPS['Active Conversations']}
            />
            <MetricCard
              title="Total Messages"
              value={overview.engagement.totalMessages}
              icon={MessageSquare}
              iconColor="text-purple-600"
              tooltip={METRIC_TOOLTIPS['Total Messages']}
            />
            <MetricCard
              title="Response Rate"
              value={`${overview.engagement.responseRate.toFixed(1)}%`}
              icon={CheckCircle}
              iconColor="text-orange-600"
              tooltip={METRIC_TOOLTIPS['Response Rate']}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
        {charts.listingPerformance && charts.listingPerformance.length > 0 && (
          <ChartCard title="Review Activity">
            <BarChart
              data={charts.listingPerformance}
              dataKeys={[
                { key: 'newListings', color: '#3b82f6', name: 'New' },
                { key: 'approvedListings', color: '#10b981', name: 'Approved' },
                { key: 'soldListings', color: '#f59e0b', name: 'Sold' },
              ]}
              xAxisKey="date"
            />
          </ChartCard>
        )}

        {overview.listings && (
          <ChartCard title="Content Status Distribution">
            <PieChart
              data={[
                {
                  name: 'Approved',
                  value: overview.listings.activeListings,
                },
                {
                  name: 'Pending',
                  value: overview.listings.pendingListings,
                },
                {
                  name: 'Rejected',
                  value: overview.listings.rejectedListings,
                },
              ]}
              dataKey="value"
              nameKey="name"
            />
          </ChartCard>
        )}

        {charts.engagementTrend && charts.engagementTrend.length > 0 && (
          <ChartCard title="Moderation Trends">
            <LineChart
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
    </DashboardLayout>
  );
}


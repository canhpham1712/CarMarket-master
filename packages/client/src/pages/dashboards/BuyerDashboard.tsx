import { useState, useEffect } from 'react';
import { Heart, MessageSquare, Search, Car } from 'lucide-react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { MetricCard } from '../../components/dashboard/MetricCard';
import { ChartCard } from '../../components/dashboard/ChartCard';
import { TimeRangeSelector } from '../../components/dashboard/TimeRangeSelector';
import type { TimeRange } from '../../components/dashboard/TimeRangeSelector';
import { LineChart } from '../../components/charts/LineChart';
import { BarChart } from '../../components/charts/BarChart';
import { AnalyticsService } from '../../services/analytics.service';
import type { DashboardData } from '../../services/analytics.service';
import { METRIC_TOOLTIPS } from '../../constants/metricTooltips';
import toast from 'react-hot-toast';

export function BuyerDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await AnalyticsService.getDashboardData('buyer', timeRange);
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
      <DashboardLayout title="Buyer Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading dashboard data...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!dashboardData) {
    return (
      <DashboardLayout title="Buyer Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="text-red-500">Failed to load dashboard data</div>
        </div>
      </DashboardLayout>
    );
  }

  const { overview, charts } = dashboardData;

  return (
    <DashboardLayout
      title="Buyer Dashboard"
      subtitle="Your activity and engagement overview"
    >
      {/* Time Range Selector */}
      <div className="mb-6 flex justify-end">
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
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
              title="Messages Sent"
              value={overview.engagement.totalMessages}
              icon={MessageSquare}
              iconColor="text-purple-600"
              tooltip={METRIC_TOOLTIPS['Messages Sent']}
            />
            <MetricCard
              title="Active Conversations"
              value={overview.engagement.activeConversations}
              icon={MessageSquare}
              iconColor="text-green-600"
              tooltip={METRIC_TOOLTIPS['Active Conversations']}
            />
            <MetricCard
              title="Response Rate"
              value={`${overview.engagement.responseRate.toFixed(1)}%`}
              icon={MessageSquare}
              iconColor="text-orange-600"
              tooltip={METRIC_TOOLTIPS['Response Rate']}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
        {charts.engagementTrend && charts.engagementTrend.length > 0 && (
          <ChartCard title="Activity Timeline">
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

        {charts.engagementTrend && charts.engagementTrend.length > 0 && (
          <ChartCard title="Message Activity">
            <BarChart
              data={charts.engagementTrend}
              dataKeys={[
                { key: 'messages', color: '#3b82f6', name: 'Messages' },
              ]}
              xAxisKey="date"
            />
          </ChartCard>
        )}
      </div>
    </DashboardLayout>
  );
}


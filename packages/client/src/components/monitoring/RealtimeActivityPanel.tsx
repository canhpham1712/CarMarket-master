import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { RealtimeMetricCard } from './RealtimeMetricCard';
import { ApiActivityChart } from './ApiActivityChart';
import { ActiveUsersList } from './ActiveUsersList';
import { Users, Zap, AlertCircle, Clock } from 'lucide-react';
import { monitoringService, type RealtimeMetrics, type RecentApiCall, type RecentError, type ActiveUser } from '../../services/monitoring.service';
import { METRIC_TOOLTIPS } from '../../constants/metricTooltips';

export function RealtimeActivityPanel() {
  const [metrics, setMetrics] = useState<RealtimeMetrics | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [recentApiCalls, setRecentApiCalls] = useState<RecentApiCall[]>([]);
  const [recentErrors, setRecentErrors] = useState<RecentError[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initial load
    loadData();

    // Connect to WebSocket for real-time updates
    monitoringService.connect(
      (newMetrics) => {
        setMetrics(newMetrics);
        setConnected(true);
      },
      (errors) => {
        setRecentErrors(errors);
      },
      (calls) => {
        setRecentApiCalls(calls);
      }
    );

    // Poll for active users every 10 seconds
    const userInterval = setInterval(() => {
      monitoringService
        .getActiveUsers()
        .then((response) => {
          if (response?.users) {
            setActiveUsers(Array.isArray(response.users) ? response.users : []);
          }
        })
        .catch(console.error);
    }, 10000);

    return () => {
      monitoringService.disconnect();
      clearInterval(userInterval);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const results = await Promise.allSettled([
        monitoringService.getRealtimeMetrics(),
        monitoringService.getActiveUsers(),
        monitoringService.getRecentApiCalls(20),
        monitoringService.getRecentErrors(10),
      ]);

      if (results[0].status === 'fulfilled') {
        setMetrics(results[0].value);
      }
      if (results[1].status === 'fulfilled' && results[1].value?.users) {
        setActiveUsers(Array.isArray(results[1].value.users) ? results[1].value.users : []);
      }
      if (results[2].status === 'fulfilled' && results[2].value) {
        setRecentApiCalls(Array.isArray(results[2].value) ? results[2].value : []);
      }
      if (results[3].status === 'fulfilled' && results[3].value) {
        setRecentErrors(Array.isArray(results[3].value) ? results[3].value : []);
      }

      // If all requests failed, it's likely a permission issue
      if (results.every(r => r.status === 'rejected')) {
        const firstError = results.find(r => r.status === 'rejected');
        if (firstError?.status === 'rejected' && firstError.reason?.message?.includes('403')) {
          console.warn('Monitoring access denied. Please ensure you have monitoring:view permission and are logged in as admin.');
        }
      }
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading real-time activity...</div>
      </div>
    );
  }

  // If no metrics but not loading, show error or empty state
  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Monitoring Access Denied
            </h3>
            <p className="text-gray-600 mb-4">
              You don't have permission to view monitoring data. Please ensure:
            </p>
            <ul className="text-sm text-gray-500 text-left max-w-md mx-auto space-y-1">
              <li>• You have the <code className="bg-gray-100 px-1 rounded">monitoring:view</code> permission</li>
              <li>• RBAC permissions have been seeded to the database</li>
              <li>• You are logged in as an admin or super admin</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare API activity chart data (last 10 minutes)
  const apiActivityData = (recentApiCalls || []).slice(0, 20).map((call) => ({
    timestamp: call.timestamp,
    calls: 1,
    errors: call.statusCode >= 400 ? 1 : 0,
  }));

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Real-time Activity</h2>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              connected ? 'bg-green-500' : 'bg-gray-400'
            }`}
          ></div>
          <span className="text-sm text-gray-600">
            {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <RealtimeMetricCard
          title="Active Users"
          value={metrics?.activeUsersCount ?? 0}
          icon={Users}
          iconColor="text-blue-600"
          subtitle="Currently online"
          tooltip={METRIC_TOOLTIPS['Active Users']}
        />
        <RealtimeMetricCard
          title="API Calls/min"
          value={metrics?.apiCallsPerMinute ?? 0}
          icon={Zap}
          iconColor="text-purple-600"
          subtitle={`${(metrics?.requestsPerSecond ?? 0).toFixed(2)} req/s`}
          tooltip={METRIC_TOOLTIPS['API Calls/min']}
        />
        <RealtimeMetricCard
          title="Error Rate"
          value={`${(metrics?.errorRate ?? 0).toFixed(2)}%`}
          icon={AlertCircle}
          iconColor="text-red-600"
          subtitle={`${recentErrors.length} recent errors`}
          tooltip={METRIC_TOOLTIPS['Error Rate']}
        />
        <RealtimeMetricCard
          title="Avg Response Time"
          value={`${(metrics?.averageResponseTime ?? 0).toFixed(0)}ms`}
          icon={Clock}
          iconColor="text-green-600"
          subtitle="Last hour average"
          tooltip={METRIC_TOOLTIPS['Avg Response Time']}
        />
      </div>

      {/* Charts and Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Activity Chart */}
        <ApiActivityChart data={apiActivityData} title="Recent API Activity" />

        {/* Active Users List */}
        <ActiveUsersList users={activeUsers} loading={false} />
      </div>

      {/* Recent Errors */}
      {recentErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Recent Errors ({recentErrors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentErrors.map((error, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                >
                  <div className="flex-1">
                    <p className="font-medium text-red-900">
                      {error.method} {error.endpoint}
                    </p>
                    <p className="text-sm text-red-700">{error.errorMessage}</p>
                    <p className="text-xs text-red-600 mt-1">
                      {error.timestamp instanceof Date
                        ? error.timestamp.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : new Date(error.timestamp).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-1 bg-red-200 text-red-800 rounded text-sm font-medium">
                      {error.statusCode}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


import { LineChart } from '../charts/LineChart';
import { ChartCard } from '../dashboard/ChartCard';

interface ApiActivityDataPoint {
  timestamp: Date;
  calls: number;
  errors: number;
}

interface ApiActivityChartProps {
  data: ApiActivityDataPoint[];
  title?: string;
}

export function ApiActivityChart({ data, title = 'API Activity' }: ApiActivityChartProps) {
  // Transform data for chart
  const chartData = data.map((point) => ({
    date: point.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    calls: point.calls,
    errors: point.errors,
  }));

  return (
    <ChartCard title={title}>
      <LineChart
        data={chartData}
        dataKeys={[
          { key: 'calls', color: '#3b82f6', name: 'API Calls' },
          { key: 'errors', color: '#ef4444', name: 'Errors' },
        ]}
        xAxisKey="date"
      />
    </ChartCard>
  );
}


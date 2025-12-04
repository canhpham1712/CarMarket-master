import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface AreaChartData {
  [key: string]: string | number;
}

interface AreaChartProps {
  data: AreaChartData[];
  dataKeys: { key: string; color: string; name: string }[];
  xAxisKey: string;
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  stacked?: boolean;
}

export function AreaChart({
  data,
  dataKeys,
  xAxisKey,
  height = 300,
  showLegend = true,
  showGrid = true,
  stacked = false,
}: AreaChartProps) {
  return (
    <div className="w-full overflow-x-auto">
      <ResponsiveContainer width="100%" height={height} minWidth={300}>
      <RechartsAreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {showGrid && <CartesianGrid strokeDasharray="3 3" />}
        <XAxis
          dataKey={xAxisKey}
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
          }}
        />
        {showLegend && <Legend />}
        {dataKeys.map(({ key, color, name }) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stackId={stacked ? 'stack' : undefined}
            stroke={color}
            fill={color}
            fillOpacity={0.6}
            name={name}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
    </div>
  );
}


import type { SVGProps, ComponentType } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Tooltip } from '../ui/Tooltip';
import { Info } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  iconColor?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  tooltip?: string;
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-blue-600',
  trend,
  subtitle,
  tooltip,
}: MetricCardProps) {
  const formatValue = (val: string | number): string => {
    if (typeof val === 'number') {
      if (val >= 1000000) {
        return `$${(val / 1000000).toFixed(2)}M`;
      }
      if (val >= 1000) {
        return `$${(val / 1000).toFixed(2)}K`;
      }
      return val.toLocaleString();
    }
    return val;
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-lg bg-gray-100 ${iconColor}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-600">{title}</p>
                {tooltip && (
                  <Tooltip content={tooltip} position="bottom">
                    <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help flex-shrink-0" />
                  </Tooltip>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatValue(value)}
              </p>
              {subtitle && (
                <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
              )}
              {trend && (
                <div className="flex items-center mt-1">
                  <span
                    className={`text-xs font-medium ${
                      trend.isPositive ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                  </span>
                  <span className="text-xs text-gray-500 ml-1">vs previous period</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


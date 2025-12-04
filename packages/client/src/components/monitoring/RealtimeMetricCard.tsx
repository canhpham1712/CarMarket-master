import { Card, CardContent } from '../ui/Card';
import type { ComponentType, SVGProps } from 'react';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';

interface RealtimeMetricCardProps {
  title: string;
  value: string | number;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  iconColor?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  subtitle?: string;
  tooltip?: string;
}

export function RealtimeMetricCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-blue-600',
  trend,
  trendValue,
  subtitle,
  tooltip,
}: RealtimeMetricCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium text-gray-600">{title}</p>
              {tooltip && (
                <Tooltip content={tooltip} position="bottom">
                  <Info className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help flex-shrink-0" />
                </Tooltip>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {trend && trendValue && (
                <div
                  className={`flex items-center gap-1 text-sm font-medium ${
                    trend === 'up'
                      ? 'text-green-600'
                      : trend === 'down'
                      ? 'text-red-600'
                      : 'text-gray-600'
                  }`}
                >
                  {trend === 'up' ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : trend === 'down' ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : null}
                  <span>{trendValue}</span>
                </div>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`${iconColor} p-3 bg-gray-50 rounded-lg`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


'use client';

import { formatCurrency, formatNumber } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: number;
  type?: 'currency' | 'number' | 'count';
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'red' | 'green' | 'blue' | 'yellow' | 'gray';
}

const colorClasses = {
  red: 'bg-red-50 text-red-600',
  green: 'bg-green-50 text-green-600',
  blue: 'bg-blue-50 text-blue-600',
  yellow: 'bg-yellow-50 text-yellow-600',
  gray: 'bg-gray-50 text-gray-600',
};

export default function KpiCard({
  title,
  value,
  type = 'number',
  icon,
  trend,
  color = 'gray',
}: KpiCardProps) {
  const formatValue = () => {
    switch (type) {
      case 'currency':
        return formatCurrency(value);
      case 'count':
        return formatNumber(value);
      default:
        return formatNumber(value);
    }
  };

  return (
    <div className="kpi-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="kpi-label">{title}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="kpi-value">{formatValue()}</span>
            {type === 'currency' && (
              <span className="text-sm text-gray-500">ج.م</span>
            )}
          </div>
          {trend && (
            <div
              className={`flex items-center gap-1 mt-2 text-sm ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

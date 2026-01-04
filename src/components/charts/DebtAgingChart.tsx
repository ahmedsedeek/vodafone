'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { AR } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';

interface DebtAgingChartProps {
  data: {
    '0-7': number;
    '8-30': number;
    '31-60': number;
    '60+': number;
  };
  height?: number;
}

const COLORS = ['#10b981', '#f59e0b', '#f97316', '#ef4444'];

export default function DebtAgingChart({ data, height = 200 }: DebtAgingChartProps) {
  const chartData = [
    { name: AR.debtAging.current, value: data['0-7'], color: COLORS[0] },
    { name: AR.debtAging.week, value: data['8-30'], color: COLORS[1] },
    { name: AR.debtAging.month, value: data['31-60'], color: COLORS[2] },
    { name: AR.debtAging.overdue, value: data['60+'], color: COLORS[3] },
  ];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">{payload[0].payload.name}</p>
          <p className="font-semibold text-gray-900">
            {formatCurrency(payload[0].value)} ج.م
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

'use client';

import { useState } from 'react';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { AR } from '@/lib/constants';
import { formatDate, getMonthStart, todayDate } from '@/lib/utils';

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

type QuickRange = 'today' | 'week' | 'month' | 'lastMonth' | 'custom';

export default function DateRangePicker({
  from,
  to,
  onChange,
}: DateRangePickerProps) {
  const [activeRange, setActiveRange] = useState<QuickRange>('month');

  const applyQuickRange = (range: QuickRange) => {
    setActiveRange(range);
    const today = new Date();

    switch (range) {
      case 'today':
        onChange(todayDate(), todayDate());
        break;
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        onChange(formatDate(weekStart), todayDate());
        break;
      case 'month':
        onChange(getMonthStart(), todayDate());
        break;
      case 'lastMonth':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        onChange(formatDate(lastMonth), formatDate(lastMonthEnd));
        break;
    }
  };

  const quickRanges: { key: QuickRange; label: string }[] = [
    { key: 'today', label: AR.reports.today },
    { key: 'week', label: AR.reports.thisWeek },
    { key: 'month', label: AR.reports.thisMonth },
    { key: 'lastMonth', label: AR.reports.lastMonth },
    { key: 'custom', label: AR.reports.custom },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Quick range buttons */}
      <div className="flex items-center gap-2">
        {quickRanges.map((range) => (
          <button
            key={range.key}
            onClick={() => applyQuickRange(range.key)}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              activeRange === range.key
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      {/* Custom date inputs */}
      {activeRange === 'custom' && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">{AR.reports.from}:</label>
            <input
              type="date"
              value={from}
              onChange={(e) => onChange(e.target.value, to)}
              className="form-input w-auto text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">{AR.reports.to}:</label>
            <input
              type="date"
              value={to}
              onChange={(e) => onChange(from, e.target.value)}
              className="form-input w-auto text-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}

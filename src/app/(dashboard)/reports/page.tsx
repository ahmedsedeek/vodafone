'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import Header from '@/components/layout/Header';
import { LoadingSpinner, DateRangePicker, KpiCard } from '@/components/ui';
import { ProfitChart, DebtAgingChart } from '@/components/charts';
import { AR } from '@/lib/constants';
import { reportsApi } from '@/lib/api';
import { ProfitReport, DebtAgingReport, TopClient, ChartDataPoint } from '@/types';
import { formatCurrency, getMonthStart, todayDate } from '@/lib/utils';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [profitReport, setProfitReport] = useState<ProfitReport | null>(null);
  const [debtAging, setDebtAging] = useState<DebtAgingReport | null>(null);
  const [topClients, setTopClients] = useState<TopClient[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  // Date range
  const [dateFrom, setDateFrom] = useState(getMonthStart());
  const [dateTo, setDateTo] = useState(todayDate());

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profit, debt, clients, chart] = await Promise.all([
        reportsApi.getProfitReport(dateFrom, dateTo),
        reportsApi.getDebtAging(),
        reportsApi.getTopClients(10),
        reportsApi.getProfitChart(30),
      ]);
      setProfitReport(profit);
      setDebtAging(debt);
      setTopClients(clients);
      setChartData(chart);
    } catch (error) {
      toast.error(AR.messages.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo]);

  if (loading) {
    return (
      <div className="p-6">
        <Header title={AR.reports.title} />
        <div className="mt-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title={AR.reports.title} subtitle="تقارير وتحليلات متقدمة" />

      <div className="p-6 space-y-6">
        {/* Date Range Picker */}
        <div className="card">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">{AR.reports.dateRange}</h3>
            <DateRangePicker
              from={dateFrom}
              to={dateTo}
              onChange={(from, to) => {
                setDateFrom(from);
                setDateTo(to);
              }}
            />
          </div>
        </div>

        {/* Profit Summary */}
        {profitReport && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KpiCard
              title="إجمالي الأرباح"
              value={profitReport.totalProfit}
              type="currency"
              color="green"
              icon={<ArrowTrendingUpIcon className="w-6 h-6" />}
            />
            <KpiCard
              title="عدد المعاملات"
              value={profitReport.totalTransactions}
              type="count"
              color="blue"
              icon={<ChartBarIcon className="w-6 h-6" />}
            />
            <KpiCard
              title="حجم التداول"
              value={profitReport.totalVcAmount}
              type="currency"
              color="gray"
              icon={<ChartBarIcon className="w-6 h-6" />}
            />
            <KpiCard
              title="متوسط الربح/معاملة"
              value={profitReport.totalTransactions > 0 ? profitReport.totalProfit / profitReport.totalTransactions : 0}
              type="currency"
              color="yellow"
              icon={<ArrowTrendingUpIcon className="w-6 h-6" />}
            />
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profit Chart */}
          <div className="card">
            <h3 className="card-title mb-4">{AR.reports.profitReport} - آخر 30 يوم</h3>
            <ProfitChart data={chartData} height={300} />
          </div>

          {/* Debt Aging Chart */}
          {debtAging && (
            <div className="card">
              <h3 className="card-title mb-4">{AR.debtAging.title}</h3>
              <DebtAgingChart
                data={{
                  '0-7': debtAging.buckets['0-7'].total,
                  '8-30': debtAging.buckets['8-30'].total,
                  '31-60': debtAging.buckets['31-60'].total,
                  '60+': debtAging.buckets['60+'].total,
                }}
                height={250}
              />
              <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-500">إجمالي الديون</div>
                  <div className="text-xl font-bold text-red-600">
                    {formatCurrency(debtAging.totalDebt)} ج.م
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500">عدد المعاملات غير المسددة</div>
                  <div className="text-xl font-bold text-gray-900">
                    {debtAging.transactionCount}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Top Clients */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">أفضل 10 عملاء حسب حجم التداول</h3>
          </div>
          {topClients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{AR.clients.clientName}</th>
                    <th>حجم التداول</th>
                    <th>عدد المعاملات</th>
                    <th>إجمالي العمولات</th>
                  </tr>
                </thead>
                <tbody>
                  {topClients.map((client, index) => (
                    <tr key={client.client_id}>
                      <td className="font-medium text-gray-500">{index + 1}</td>
                      <td className="font-medium text-gray-900">{client.client_name}</td>
                      <td className="text-blue-600 font-medium">
                        {formatCurrency(client.volume)} ج.م
                      </td>
                      <td>{client.count}</td>
                      <td className="text-green-600 font-medium">
                        {formatCurrency(client.profit)} ج.م
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">لا توجد بيانات</p>
          )}
        </div>

        {/* Monthly Profit Breakdown */}
        {profitReport && Object.keys(profitReport.monthlyProfit).length > 0 && (
          <div className="card">
            <h3 className="card-title mb-4">الأرباح الشهرية</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {Object.entries(profitReport.monthlyProfit)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .slice(0, 6)
                .map(([month, profit]) => (
                  <div
                    key={month}
                    className="p-4 bg-gray-50 rounded-lg text-center"
                  >
                    <div className="text-sm text-gray-500">{month}</div>
                    <div className="text-lg font-bold text-green-600 mt-1">
                      {formatCurrency(profit)} ج.م
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Daily Breakdown */}
        {profitReport && Object.keys(profitReport.dailyProfit).length > 0 && (
          <div className="card">
            <h3 className="card-title mb-4">تفاصيل الأرباح اليومية</h3>
            <div className="max-h-96 overflow-y-auto">
              <table className="data-table">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th>التاريخ</th>
                    <th>الربح</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(profitReport.dailyProfit)
                    .sort((a, b) => b[0].localeCompare(a[0]))
                    .map(([date, profit]) => (
                      <tr key={date}>
                        <td>{date}</td>
                        <td className="text-green-600 font-medium">
                          {formatCurrency(profit)} ج.م
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

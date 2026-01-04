'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  WalletIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ArrowsRightLeftIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import Header from '@/components/layout/Header';
import { KpiCard, LoadingSpinner } from '@/components/ui';
import { ProfitChart, DebtAgingChart } from '@/components/charts';
import { AR } from '@/lib/constants';
import { reportsApi, seedApi } from '@/lib/api';
import { DashboardKPIs, ChartDataPoint } from '@/types';
import { formatCurrency } from '@/lib/utils';

export default function DashboardPage() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [kpisData, chartDataResponse] = await Promise.all([
        reportsApi.getDashboard(),
        reportsApi.getProfitChart(30),
      ]);
      setKpis(kpisData);
      setChartData(chartDataResponse);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Don't show error toast on initial load if no data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSeedData = async () => {
    try {
      setSeeding(true);
      await seedApi.seed(true);
      toast.success('تم إنشاء البيانات التجريبية بنجاح');
      fetchData();
    } catch (error) {
      toast.error('فشل في إنشاء البيانات التجريبية');
    } finally {
      setSeeding(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <Header title={AR.nav.dashboard} />
        <div className="mt-8">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  // Show empty state if no data at all (no wallets AND no clients)
  if (!kpis || (kpis.totalClients === 0 && kpis.totalWalletBalance === 0)) {
    return (
      <div>
        <Header title={AR.nav.dashboard} subtitle={AR.appTagline} />
        <div className="p-6">
          <div className="max-w-2xl mx-auto text-center py-16">
            <SparklesIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              مرحباً بك في نظام فودافون كاش
            </h2>
            <p className="text-gray-500 mb-6">
              لا توجد بيانات حالياً. يمكنك البدء بإضافة محافظ وعملاء، أو تحميل بيانات تجريبية للتجربة.
            </p>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={handleSeedData}
                disabled={seeding}
                className="btn btn-primary"
              >
                {seeding ? 'جاري التحميل...' : 'تحميل بيانات تجريبية'}
              </button>
              <Link href="/wallets" className="btn btn-secondary">
                إضافة محفظة
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title={AR.nav.dashboard} subtitle={AR.appTagline} />

      <div className="p-6 space-y-6">
        {/* KPI Cards - Top Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title={AR.kpis.todayProfit}
            value={kpis.todayProfit}
            type="currency"
            color="green"
            icon={<ArrowTrendingUpIcon className="w-6 h-6" />}
          />
          <KpiCard
            title={AR.kpis.weekProfit}
            value={kpis.weekProfit}
            type="currency"
            color="blue"
            icon={<ArrowTrendingUpIcon className="w-6 h-6" />}
          />
          <KpiCard
            title={AR.kpis.monthProfit}
            value={kpis.monthProfit}
            type="currency"
            color="red"
            icon={<ArrowTrendingUpIcon className="w-6 h-6" />}
          />
          <KpiCard
            title={AR.kpis.todayTransactions}
            value={kpis.todayTransactionCount}
            type="count"
            color="gray"
            icon={<ArrowsRightLeftIcon className="w-6 h-6" />}
          />
        </div>

        {/* KPI Cards - Second Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title={AR.kpis.totalBalance}
            value={kpis.totalWalletBalance}
            type="currency"
            color="blue"
            icon={<WalletIcon className="w-6 h-6" />}
          />
          <KpiCard
            title={AR.kpis.totalDebts}
            value={kpis.totalDebts}
            type="currency"
            color="yellow"
            icon={<ExclamationTriangleIcon className="w-6 h-6" />}
          />
          <KpiCard
            title={AR.kpis.totalClients}
            value={kpis.totalClients}
            type="count"
            color="gray"
            icon={<UsersIcon className="w-6 h-6" />}
          />
          <KpiCard
            title={AR.kpis.activeClients}
            value={kpis.activeClients}
            type="count"
            color="green"
            icon={<UsersIcon className="w-6 h-6" />}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profit Chart */}
          <div className="lg:col-span-2 card">
            <div className="card-header">
              <h3 className="card-title">الأرباح - آخر 30 يوم</h3>
            </div>
            <ProfitChart data={chartData} height={300} />
          </div>

          {/* Debt Aging */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">{AR.debtAging.title}</h3>
            </div>
            <DebtAgingChart data={kpis.debtAging} height={250} />
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">إجمالي الديون</span>
                <span className="font-bold text-red-600">
                  {formatCurrency(kpis.totalDebts)} ج.م
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/transactions"
            className="card hover:shadow-md transition-shadow flex items-center gap-4"
          >
            <div className="p-3 bg-blue-100 rounded-lg">
              <ArrowsRightLeftIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{AR.transactions.addTransaction}</h4>
              <p className="text-sm text-gray-500">إضافة معاملة جديدة</p>
            </div>
          </Link>

          <Link
            href="/payments"
            className="card hover:shadow-md transition-shadow flex items-center gap-4"
          >
            <div className="p-3 bg-green-100 rounded-lg">
              <BanknotesIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{AR.payments.addPayment}</h4>
              <p className="text-sm text-gray-500">تسجيل دفعة من عميل</p>
            </div>
          </Link>

          <Link
            href="/clients"
            className="card hover:shadow-md transition-shadow flex items-center gap-4"
          >
            <div className="p-3 bg-purple-100 rounded-lg">
              <UsersIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">{AR.clients.addClient}</h4>
              <p className="text-sm text-gray-500">إضافة عميل جديد</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

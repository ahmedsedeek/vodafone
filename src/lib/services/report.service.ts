// ============================================
// Report Service - Dashboard KPIs and Analytics
// ============================================

import { WalletDB, ClientDB, TransactionDB } from '@/lib/db';
import {
  DashboardKPIs,
  ChartDataPoint,
  TopClient,
} from '@/types';
import { todayDate, formatDate, getWeekStart, getMonthStart } from '@/lib/utils';
import { TransactionService } from './transaction.service';
import { WalletService } from './wallet.service';
import { ClientService } from './client.service';

export class ReportService {
  /**
   * Get dashboard KPIs
   */
  static async getDashboardKpis(): Promise<DashboardKPIs> {
    const today = todayDate();
    const weekStart = formatDate(getWeekStart(new Date()));
    const monthStart = getMonthStart();

    // Get all data
    const wallets = await WalletDB.getAll();
    const clients = await ClientDB.getAll();
    const allTransactions = await TransactionDB.getAll();

    // Today's transactions
    const todayTx = allTransactions.filter((tx) => tx.transaction_date === today);
    const todayProfit = todayTx.reduce(
      (sum, tx) => sum + (tx.fee_amount || 0),
      0
    );
    const todayVolume = todayTx.reduce(
      (sum, tx) => sum + (tx.vc_amount || 0),
      0
    );

    // This week
    const weekTx = allTransactions.filter(
      (tx) => tx.transaction_date >= weekStart
    );
    const weekProfit = weekTx.reduce(
      (sum, tx) => sum + (tx.fee_amount || 0),
      0
    );

    // This month
    const monthTx = allTransactions.filter(
      (tx) => tx.transaction_date >= monthStart
    );
    const monthProfit = monthTx.reduce(
      (sum, tx) => sum + (tx.fee_amount || 0),
      0
    );

    // Total balances
    const totalWalletBalance = wallets.reduce(
      (sum, w) => sum + (w.current_balance || 0),
      0
    );

    // Total debts
    const totalDebts = clients.reduce(
      (sum, c) => sum + (c.total_debt || 0),
      0
    );

    // Active clients (with transactions in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = formatDate(thirtyDaysAgo);
    const activeClientIds = new Set(
      allTransactions
        .filter((tx) => tx.transaction_date >= thirtyDaysAgoStr)
        .map((tx) => tx.client_id)
        .filter(Boolean)
    );

    // Debt aging
    const debtAging = await TransactionService.getDebtAgingReport();

    return {
      // Today
      todayProfit,
      todayVolume,
      todayTransactionCount: todayTx.length,

      // Week
      weekProfit,
      weekTransactionCount: weekTx.length,

      // Month
      monthProfit,
      monthTransactionCount: monthTx.length,

      // Totals
      totalWalletBalance,
      totalDebts,
      totalClients: clients.length,
      activeClients: activeClientIds.size,
      totalWallets: wallets.length,

      // Debt aging
      debtAging: {
        '0-7': debtAging.buckets['0-7'].total,
        '8-30': debtAging.buckets['8-30'].total,
        '31-60': debtAging.buckets['31-60'].total,
        '60+': debtAging.buckets['60+'].total,
      },
    };
  }

  /**
   * Get profit chart data (last N days)
   */
  static async getProfitChartData(days: number = 30): Promise<ChartDataPoint[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const allTransactions = await TransactionDB.getAll();

    // Group by date
    const dailyData: Record<string, { profit: number; volume: number; transactions: number }> = {};

    for (const tx of allTransactions) {
      const date = tx.transaction_date;
      if (!dailyData[date]) {
        dailyData[date] = { profit: 0, volume: 0, transactions: 0 };
      }
      dailyData[date].profit += tx.fee_amount || 0;
      dailyData[date].volume += tx.vc_amount || 0;
      dailyData[date].transactions += 1;
    }

    // Fill in missing dates with 0
    const chartData: ChartDataPoint[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = formatDate(currentDate);
      const data = dailyData[dateStr] || { profit: 0, volume: 0, transactions: 0 };
      chartData.push({
        date: dateStr,
        profit: data.profit,
        volume: data.volume,
        transactions: data.transactions,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return chartData;
  }

  /**
   * Get transaction volume by type
   */
  static async getVolumeByType(
    fromDate: string,
    toDate: string
  ): Promise<Record<string, { count: number; volume: number }>> {
    const transactions = await TransactionService.getAll({
      from: fromDate,
      to: toDate,
    });

    const byType: Record<string, { count: number; volume: number }> = {
      TRANSFER_OUT: { count: 0, volume: 0 },
      TRANSFER_IN: { count: 0, volume: 0 },
      DEPOSIT: { count: 0, volume: 0 },
      WITHDRAW: { count: 0, volume: 0 },
    };

    for (const tx of transactions) {
      const type = tx.transaction_type;
      if (byType[type]) {
        byType[type].count++;
        byType[type].volume += tx.vc_amount || 0;
      }
    }

    return byType;
  }

  /**
   * Get top clients by volume
   */
  static async getTopClients(limit: number = 10): Promise<TopClient[]> {
    const clients = await ClientDB.getAll();
    const transactions = await TransactionDB.getAll();

    // Calculate volume per client
    const clientVolume: Record<
      string,
      { volume: number; count: number; profit: number }
    > = {};

    for (const tx of transactions) {
      const clientId = tx.client_id;
      if (!clientId) continue;

      if (!clientVolume[clientId]) {
        clientVolume[clientId] = { volume: 0, count: 0, profit: 0 };
      }
      clientVolume[clientId].volume += tx.vc_amount || 0;
      clientVolume[clientId].count++;
      clientVolume[clientId].profit += tx.fee_amount || 0;
    }

    // Map to clients and sort
    const ranked: TopClient[] = clients
      .map((c) => ({
        client_id: c.client_id,
        client_name: c.client_name,
        ...(clientVolume[c.client_id] || { volume: 0, count: 0, profit: 0 }),
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, limit);

    return ranked;
  }

  /**
   * Get monthly summary for the year
   */
  static async getMonthlySummary(
    year: number = new Date().getFullYear()
  ): Promise<Array<{ month: string; profit: number; volume: number; transactions: number }>> {
    const allTransactions = await TransactionDB.getAll();

    const monthlyData: Record<
      string,
      { profit: number; volume: number; transactions: number }
    > = {};

    for (const tx of allTransactions) {
      if (!tx.transaction_date.startsWith(year.toString())) continue;

      const monthKey = tx.transaction_date.substring(0, 7);
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { profit: 0, volume: 0, transactions: 0 };
      }
      monthlyData[monthKey].profit += tx.fee_amount || 0;
      monthlyData[monthKey].volume += tx.vc_amount || 0;
      monthlyData[monthKey].transactions++;
    }

    // Create array for all months
    const result = [];
    for (let month = 1; month <= 12; month++) {
      const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
      const data = monthlyData[monthKey] || { profit: 0, volume: 0, transactions: 0 };
      result.push({
        month: monthKey,
        ...data,
      });
    }

    return result;
  }
}

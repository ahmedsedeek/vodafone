// ============================================
// Report Service - Dashboard KPIs and Analytics
// Uses Google Apps Script API in production
// ============================================

import { reportsApi } from '@/lib/api-production';
import {
  DashboardKPIs,
  ChartDataPoint,
  TopClient,
  ProfitReport,
  DebtAgingReport,
} from '@/types';

export class ReportService {
  /**
   * Get dashboard KPIs
   */
  static async getDashboardKpis(): Promise<DashboardKPIs> {
    return reportsApi.getDashboard();
  }

  /**
   * Get profit chart data (last N days)
   */
  static async getProfitChartData(days: number = 30): Promise<ChartDataPoint[]> {
    return reportsApi.getProfitChart(days);
  }

  /**
   * Get profit report for date range
   */
  static async getProfitReport(fromDate: string, toDate: string): Promise<ProfitReport> {
    return reportsApi.getProfitReport({ from: fromDate, to: toDate });
  }

  /**
   * Get debt aging report
   */
  static async getDebtAgingReport(): Promise<DebtAgingReport> {
    return reportsApi.getDebtAging();
  }

  /**
   * Get top clients by volume
   */
  static async getTopClients(limit: number = 10): Promise<TopClient[]> {
    return reportsApi.getTopClients(limit);
  }
}

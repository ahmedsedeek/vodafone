// ============================================
// Profit Report API Routes
// ============================================

import { NextRequest } from 'next/server';
import { TransactionService } from '@/lib/services';
import { successResponse, handleApiError } from '@/lib/api-response';
import { getMonthStart, todayDate } from '@/lib/utils';

// GET /api/reports/profit?from=&to= - Get profit report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from') || getMonthStart();
    const toDate = searchParams.get('to') || todayDate();

    const report = await TransactionService.getProfitReport(fromDate, toDate);
    return successResponse(report, 'تم جلب تقرير الأرباح');
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================
// Chart Data API Routes
// ============================================

import { NextRequest } from 'next/server';
import { ReportService } from '@/lib/services';
import { successResponse, handleApiError } from '@/lib/api-response';

// GET /api/reports/chart?days= - Get chart data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const data = await ReportService.getProfitChartData(days);
    return successResponse(data, 'تم جلب بيانات الرسم البياني');
  } catch (error) {
    return handleApiError(error);
  }
}

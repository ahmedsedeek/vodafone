// ============================================
// Dashboard API Routes
// ============================================

import { ReportService } from '@/lib/services';
import { successResponse, handleApiError } from '@/lib/api-response';

// GET /api/dashboard - Get dashboard KPIs
export async function GET() {
  try {
    const kpis = await ReportService.getDashboardKpis();
    return successResponse(kpis, 'تم جلب بيانات لوحة التحكم');
  } catch (error) {
    return handleApiError(error);
  }
}

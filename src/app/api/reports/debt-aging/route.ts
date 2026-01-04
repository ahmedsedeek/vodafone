// ============================================
// Debt Aging Report API Routes
// ============================================

import { TransactionService } from '@/lib/services';
import { successResponse, handleApiError } from '@/lib/api-response';

// GET /api/reports/debt-aging - Get debt aging report
export async function GET() {
  try {
    const report = await TransactionService.getDebtAgingReport();
    return successResponse(report, 'تم جلب تقرير عمر الديون');
  } catch (error) {
    return handleApiError(error);
  }
}

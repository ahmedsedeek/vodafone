// ============================================
// Client Statement API Routes
// ============================================

import { NextRequest } from 'next/server';
import { ClientService } from '@/lib/services';
import { successResponse, handleApiError } from '@/lib/api-response';
import { getMonthStart, todayDate } from '@/lib/utils';

// GET /api/clients/[id]/statement?from=&to= - Get client statement
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('from') || getMonthStart();
    const toDate = searchParams.get('to') || todayDate();

    const statement = await ClientService.getStatement(
      params.id,
      fromDate,
      toDate
    );
    return successResponse(statement, 'تم جلب كشف الحساب');
  } catch (error) {
    return handleApiError(error);
  }
}

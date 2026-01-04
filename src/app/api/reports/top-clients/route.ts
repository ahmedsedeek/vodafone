// ============================================
// Top Clients Report API Routes
// ============================================

import { NextRequest } from 'next/server';
import { ReportService } from '@/lib/services';
import { successResponse, handleApiError } from '@/lib/api-response';

// GET /api/reports/top-clients?limit= - Get top clients
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const clients = await ReportService.getTopClients(limit);
    return successResponse(clients, 'تم جلب أفضل العملاء');
  } catch (error) {
    return handleApiError(error);
  }
}

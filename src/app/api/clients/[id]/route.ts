// ============================================
// Client by ID API Routes
// ============================================

import { NextRequest } from 'next/server';
import { ClientService } from '@/lib/services';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';

// GET /api/clients/[id] - Get client by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await ClientService.getById(params.id);
    if (!client) {
      return errorResponse('العميل غير موجود', 404);
    }
    return successResponse(client, 'تم جلب بيانات العميل');
  } catch (error) {
    return handleApiError(error);
  }
}

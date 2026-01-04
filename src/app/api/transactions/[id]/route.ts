// ============================================
// Transaction by ID API Routes
// ============================================

import { NextRequest } from 'next/server';
import { TransactionService } from '@/lib/services';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';

// DELETE /api/transactions/[id] - Delete transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await TransactionService.delete(params.id);
    return successResponse(null, 'تم حذف المعاملة بنجاح');
  } catch (error) {
    return handleApiError(error);
  }
}

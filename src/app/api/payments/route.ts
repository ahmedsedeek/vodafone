// ============================================
// Payments API Routes
// ============================================

import { NextRequest } from 'next/server';
import { PaymentService } from '@/lib/services';
import { successResponse, handleApiError } from '@/lib/api-response';
import { CreatePaymentInput } from '@/types';

// GET /api/payments - Get payments with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters: { client_id?: string; from?: string; to?: string } = {};

    if (searchParams.get('client_id')) {
      filters.client_id = searchParams.get('client_id')!;
    }
    if (searchParams.get('from')) {
      filters.from = searchParams.get('from')!;
    }
    if (searchParams.get('to')) {
      filters.to = searchParams.get('to')!;
    }

    const payments = await PaymentService.getAll(filters);
    return successResponse(payments, 'تم جلب المدفوعات');
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/payments - Create payment with FIFO allocation
export async function POST(request: NextRequest) {
  try {
    const body: CreatePaymentInput = await request.json();
    const result = await PaymentService.create(body);
    return successResponse(result, 'تم تسجيل الدفعة بنجاح', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

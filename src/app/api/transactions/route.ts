// ============================================
// Transactions API Routes
// ============================================

import { NextRequest } from 'next/server';
import { TransactionService } from '@/lib/services';
import { successResponse, handleApiError } from '@/lib/api-response';
import { CreateTransactionInput, TransactionFilters } from '@/types';

// GET /api/transactions - Get transactions with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const filters: TransactionFilters = {};

    if (searchParams.get('from')) {
      filters.from = searchParams.get('from')!;
    }
    if (searchParams.get('to')) {
      filters.to = searchParams.get('to')!;
    }
    if (searchParams.get('wallet_id')) {
      filters.wallet_id = searchParams.get('wallet_id')!;
    }
    if (searchParams.get('client_id')) {
      filters.client_id = searchParams.get('client_id')!;
    }
    if (searchParams.get('payment_status')) {
      filters.payment_status = searchParams.get('payment_status') as 'paid' | 'partial' | 'debt';
    }
    if (searchParams.get('transaction_type')) {
      filters.transaction_type = searchParams.get('transaction_type') as any;
    }

    const transactions = await TransactionService.getAll(filters);
    return successResponse(transactions, 'تم جلب المعاملات');
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/transactions - Create new transaction
export async function POST(request: NextRequest) {
  try {
    const body: CreateTransactionInput = await request.json();
    const transaction = await TransactionService.create(body);
    return successResponse(transaction, 'تم إنشاء المعاملة بنجاح', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

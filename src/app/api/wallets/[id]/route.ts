// ============================================
// Wallet by ID API Routes
// ============================================

import { NextRequest } from 'next/server';
import { WalletService } from '@/lib/services';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { UpdateWalletInput } from '@/types';

// GET /api/wallets/[id] - Get wallet by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const wallet = await WalletService.getById(params.id);
    if (!wallet) {
      return errorResponse('المحفظة غير موجودة', 404);
    }
    return successResponse(wallet, 'تم جلب بيانات المحفظة');
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/wallets/[id] - Update wallet
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: UpdateWalletInput = await request.json();
    const wallet = await WalletService.update(params.id, body);
    return successResponse(wallet, 'تم تحديث المحفظة بنجاح');
  } catch (error) {
    return handleApiError(error);
  }
}

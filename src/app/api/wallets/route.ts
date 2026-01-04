// ============================================
// Wallets API Routes
// ============================================

import { NextRequest } from 'next/server';
import { WalletService } from '@/lib/services';
import { successResponse, handleApiError } from '@/lib/api-response';
import { CreateWalletInput } from '@/types';

// GET /api/wallets - Get all wallets
export async function GET() {
  try {
    const wallets = await WalletService.getAll();
    return successResponse(wallets, 'تم جلب المحافظ');
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/wallets - Create new wallet
export async function POST(request: NextRequest) {
  try {
    const body: CreateWalletInput = await request.json();
    const wallet = await WalletService.create(body);
    return successResponse(wallet, 'تم إنشاء المحفظة بنجاح', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

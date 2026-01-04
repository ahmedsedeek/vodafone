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
    // Debug: Check if env variables are set
    const scriptUrl = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
    const apiKey = process.env.APPS_SCRIPT_API_KEY;

    if (!scriptUrl || !apiKey) {
      console.error('Missing env vars:', { scriptUrl: !!scriptUrl, apiKey: !!apiKey });
      return Response.json({
        success: false,
        message: 'Configuration error: Missing environment variables',
        debug: {
          hasScriptUrl: !!scriptUrl,
          hasApiKey: !!apiKey
        }
      }, { status: 500 });
    }

    const wallets = await WalletService.getAll();
    return successResponse(wallets, 'تم جلب المحافظ');
  } catch (error) {
    console.error('Wallets API error:', error);
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

// ============================================
// Client Phones API Routes
// ============================================

import { NextRequest } from 'next/server';
import { ClientService } from '@/lib/services';
import { successResponse, handleApiError } from '@/lib/api-response';
import { AddPhoneInput } from '@/types';

// POST /api/clients/[id]/phones - Add phone to client
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: AddPhoneInput = await request.json();
    const phone = await ClientService.addPhone(params.id, body);
    return successResponse(phone, 'تم إضافة رقم الهاتف بنجاح', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================
// Attachments API Routes
// ============================================

import { NextRequest } from 'next/server';
import { attachmentsApi } from '@/lib/api-production';
import { successResponse, handleApiError } from '@/lib/api-response';

// POST /api/attachments - Upload attachment
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const transactionId = formData.get('transaction_id') as string;

    if (!file) {
      throw new Error('الملف مطلوب');
    }

    if (!transactionId) {
      throw new Error('معرف المعاملة مطلوب');
    }

    const attachment = await attachmentsApi.upload(transactionId, file);

    return successResponse(attachment, 'تم رفع المرفق بنجاح', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

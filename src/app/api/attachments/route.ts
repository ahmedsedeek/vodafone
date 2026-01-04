// ============================================
// Attachments API Routes
// ============================================

import { NextRequest } from 'next/server';
import { AttachmentService } from '@/lib/services';
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

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const attachment = await AttachmentService.uploadBuffer(
      transactionId,
      buffer,
      file.name,
      file.type
    );

    return successResponse(attachment, 'تم رفع المرفق بنجاح', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

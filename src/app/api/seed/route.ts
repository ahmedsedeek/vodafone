// ============================================
// Seed Data API Route
// Disabled in production - data is managed in Google Sheets
// ============================================

import { successResponse, errorResponse } from '@/lib/api-response';

// POST /api/seed - Disabled in production
export async function POST() {
  return errorResponse(
    'هذه الوظيفة غير متاحة في بيئة الإنتاج. البيانات تُدار عبر Google Sheets.',
    400
  );
}

// DELETE /api/seed - Disabled in production
export async function DELETE() {
  return errorResponse(
    'هذه الوظيفة غير متاحة في بيئة الإنتاج. البيانات تُدار عبر Google Sheets.',
    400
  );
}

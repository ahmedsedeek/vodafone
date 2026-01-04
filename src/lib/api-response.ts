// ============================================
// API Response Helpers
// ============================================

import { NextResponse } from 'next/server';
import { ApiResponse } from '@/types';

export function successResponse<T>(
  data: T,
  message: string = 'نجاح',
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

export function errorResponse(
  message: string,
  code: number = 400
): NextResponse<ApiResponse<null>> {
  return NextResponse.json(
    {
      success: false,
      message,
      error: {
        code,
        message,
      },
      timestamp: new Date().toISOString(),
    },
    { status: code }
  );
}

export function handleApiError(error: unknown): NextResponse<ApiResponse<null>> {
  console.error('API Error:', error);

  if (error instanceof Error) {
    return errorResponse(error.message, 400);
  }

  return errorResponse('حدث خطأ غير متوقع', 500);
}

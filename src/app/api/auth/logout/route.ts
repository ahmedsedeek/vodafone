// ============================================
// Logout API Route
// ============================================

import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth';

export async function POST() {
  try {
    await clearSession();

    return NextResponse.json(
      { success: true, message: 'تم تسجيل الخروج بنجاح' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ في تسجيل الخروج' },
      { status: 500 }
    );
  }
}

// ============================================
// Login API Route
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { validatePassword, createSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { success: false, message: 'كلمة المرور مطلوبة' },
        { status: 400 }
      );
    }

    const isValid = validatePassword(password);

    if (!isValid) {
      return NextResponse.json(
        { success: false, message: 'كلمة المرور غير صحيحة' },
        { status: 401 }
      );
    }

    // Create session and set cookie
    await createSession();

    return NextResponse.json(
      { success: true, message: 'تم تسجيل الدخول بنجاح' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ في تسجيل الدخول' },
      { status: 500 }
    );
  }
}

// ============================================
// Authentication Utilities
// ============================================

import { cookies } from 'next/headers';
import { createHash, randomBytes } from 'crypto';

const COOKIE_NAME = 'vc_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// Generate a session token
function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

// Hash the session token for storage/comparison
function hashToken(token: string): string {
  const secret = process.env.SESSION_SECRET || 'fallback-secret';
  return createHash('sha256').update(token + secret).digest('hex');
}

// Validate admin password
export function validatePassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('ADMIN_PASSWORD environment variable is not set!');
    return false;
  }
  return password === adminPassword;
}

// Create a session and set cookie
export async function createSession(): Promise<string> {
  const token = generateSessionToken();
  const hashedToken = hashToken(token);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, hashedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  return hashedToken;
}

// Check if user is authenticated
export async function isAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);

    if (!sessionCookie || !sessionCookie.value) {
      return false;
    }

    // Session exists and has a value
    return sessionCookie.value.length === 64; // SHA-256 hash length
  } catch {
    return false;
  }
}

// Clear session (logout)
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Get session token from cookies (for API routes)
export async function getSessionToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);
    return sessionCookie?.value || null;
  } catch {
    return null;
  }
}

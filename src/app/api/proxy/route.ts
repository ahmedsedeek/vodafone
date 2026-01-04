// ============================================
// Production Proxy Route
// Proxies requests to Google Apps Script
// ============================================

import { NextRequest, NextResponse } from 'next/server';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL || '';
const API_KEY = process.env.APPS_SCRIPT_API_KEY || '';

/**
 * Proxy GET requests to Apps Script
 */
export async function GET(request: NextRequest) {
  return proxyRequest(request, 'GET');
}

/**
 * Proxy POST requests to Apps Script
 */
export async function POST(request: NextRequest) {
  return proxyRequest(request, 'POST');
}

/**
 * Main proxy function
 */
async function proxyRequest(request: NextRequest, method: string) {
  try {
    // Check if production mode
    if (!APPS_SCRIPT_URL) {
      return NextResponse.json(
        { success: false, message: 'Production not configured' },
        { status: 500 }
      );
    }

    // Get path from query params
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { success: false, message: 'Path is required' },
        { status: 400 }
      );
    }

    // Build Apps Script URL
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.set('path', path);
    url.searchParams.set('apiKey', API_KEY);

    // Forward other query params
    searchParams.forEach((value, key) => {
      if (key !== 'path') {
        url.searchParams.set(key, value);
      }
    });

    // Build fetch options
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    // Forward body for POST requests
    if (method === 'POST') {
      const body = await request.json();
      options.body = JSON.stringify(body);
    }

    // Make request to Apps Script
    const response = await fetch(url.toString(), options);
    const data = await response.json();

    return NextResponse.json(data);

  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Proxy error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

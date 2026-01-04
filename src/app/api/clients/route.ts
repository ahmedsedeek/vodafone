// ============================================
// Clients API Routes
// ============================================

import { NextRequest } from 'next/server';
import { ClientService } from '@/lib/services';
import { successResponse, handleApiError } from '@/lib/api-response';
import { CreateClientInput } from '@/types';

// GET /api/clients - Get all clients
export async function GET() {
  try {
    const clients = await ClientService.getAll();
    return successResponse(clients, 'تم جلب العملاء');
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/clients - Create new client
export async function POST(request: NextRequest) {
  try {
    const body: CreateClientInput = await request.json();
    const client = await ClientService.create(body);
    return successResponse(client, 'تم إنشاء العميل بنجاح', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

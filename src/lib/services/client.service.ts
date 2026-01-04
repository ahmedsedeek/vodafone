// ============================================
// Client Service
// Uses Google Apps Script API in production
// ============================================

import { clientsApi } from '@/lib/api-production';
import {
  Client,
  ClientPhone,
  CreateClientInput,
  AddPhoneInput,
  ClientStatement,
} from '@/types';

export class ClientService {
  /**
   * Get all clients with their phones
   */
  static async getAll(): Promise<Client[]> {
    const clients = await clientsApi.getAll();
    // Sort by creation date (newest first)
    return clients.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * Get client by ID with phones
   */
  static async getById(clientId: string): Promise<Client | null> {
    try {
      const client = await clientsApi.getById(clientId);
      return client || null;
    } catch {
      return null;
    }
  }

  /**
   * Create new client
   */
  static async create(input: CreateClientInput): Promise<Client> {
    return clientsApi.create({
      client_name: input.client_name,
      national_id: input.national_id,
      address: input.address,
      notes: input.notes,
      phone_number: input.phone_number,
      phone_label: 'شخصي',
    });
  }

  /**
   * Add phone to client
   */
  static async addPhone(clientId: string, input: AddPhoneInput): Promise<ClientPhone> {
    const result = await clientsApi.addPhone(clientId, {
      phone_number: input.phone_number,
      is_primary: input.is_primary,
      phone_label: input.phone_label,
    });

    return {
      phone_id: result.phone_id,
      client_id: clientId,
      phone_number: input.phone_number,
      is_primary: input.is_primary || false,
      phone_label: input.phone_label || 'شخصي',
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Get client statement for date range
   */
  static async getStatement(
    clientId: string,
    fromDate: string,
    toDate: string
  ): Promise<ClientStatement> {
    return clientsApi.getStatement(clientId, { from: fromDate, to: toDate });
  }

  /**
   * Get total debts across all clients
   */
  static async getTotalDebts(): Promise<number> {
    const clients = await clientsApi.getAll();
    return clients.reduce((sum, c) => sum + (c.total_debt || 0), 0);
  }
}

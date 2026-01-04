// ============================================
// Client Service
// ============================================

import { ClientDB, TransactionDB, PaymentDB } from '@/lib/db';
import {
  Client,
  ClientPhone,
  CreateClientInput,
  AddPhoneInput,
  ClientStatement,
  Transaction,
  Payment,
} from '@/types';
import { generateUUID, nowISO, isValidEgyptianPhone, validateRequired } from '@/lib/utils';

export class ClientService {
  /**
   * Get all clients with their phones
   */
  static async getAll(): Promise<Client[]> {
    const clients = await ClientDB.getAll();
    // Sort by creation date (newest first)
    return clients.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * Get client by ID with phones
   */
  static async getById(clientId: string): Promise<Client | null> {
    const client = await ClientDB.getById(clientId);
    return client || null;
  }

  /**
   * Create new client
   */
  static async create(input: CreateClientInput): Promise<Client> {
    // Validate required fields
    const missing = validateRequired(input, ['client_name']);
    if (missing.length > 0) {
      throw new Error(`الحقول المطلوبة: ${missing.join(', ')}`);
    }

    // Validate phone if provided
    if (input.phone_number && !isValidEgyptianPhone(input.phone_number)) {
      throw new Error('رقم الهاتف غير صحيح');
    }

    const now = nowISO();
    const clientId = generateUUID();

    const client: Client = {
      client_id: clientId,
      client_name: input.client_name.trim(),
      national_id: input.national_id?.trim() || '',
      address: input.address?.trim() || '',
      notes: input.notes?.trim() || '',
      total_debt: 0,
      is_active: true,
      phones: [],
      created_at: now,
      updated_at: now,
    };

    await ClientDB.create(client);

    // Add phone if provided
    if (input.phone_number) {
      const phone = await this.addPhone(clientId, {
        phone_number: input.phone_number,
        is_primary: true,
        phone_label: 'شخصي',
      });
      client.phones = [phone];
    }

    return client;
  }

  /**
   * Add phone to client
   */
  static async addPhone(clientId: string, input: AddPhoneInput): Promise<ClientPhone> {
    const client = await ClientDB.getById(clientId);
    if (!client) {
      throw new Error('العميل غير موجود');
    }

    if (!isValidEgyptianPhone(input.phone_number)) {
      throw new Error('رقم الهاتف غير صحيح');
    }

    const phone: ClientPhone = {
      phone_id: generateUUID(),
      client_id: clientId,
      phone_number: input.phone_number.replace(/[\s\-]/g, ''),
      is_primary: input.is_primary || false,
      phone_label: input.phone_label || 'شخصي',
      created_at: nowISO(),
    };

    return ClientDB.addPhone(phone);
  }

  /**
   * Update client total debt
   */
  static async updateTotalDebt(clientId: string): Promise<number> {
    const transactions = await TransactionDB.getByFilter(
      (tx) => tx.client_id === clientId && tx.payment_status !== 'paid'
    );

    const totalDebt = transactions.reduce((sum, tx) => sum + (tx.amount_due || 0), 0);
    await ClientDB.updateTotalDebt(clientId, totalDebt);

    return totalDebt;
  }

  /**
   * Get client statement for date range
   */
  static async getStatement(
    clientId: string,
    fromDate: string,
    toDate: string
  ): Promise<ClientStatement> {
    const client = await ClientDB.getById(clientId);
    if (!client) {
      throw new Error('العميل غير موجود');
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);

    // Get transactions in period
    const allTransactions = await TransactionDB.getAll();
    const transactions = allTransactions
      .filter((tx) => {
        if (tx.client_id !== clientId) return false;
        const txDate = new Date(tx.transaction_date);
        return txDate >= from && txDate <= to;
      })
      .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

    // Get payments in period
    const allPayments = await PaymentDB.getAll();
    const payments = allPayments
      .filter((p) => {
        if (p.client_id !== clientId) return false;
        const pDate = new Date(p.payment_date);
        return pDate >= from && pDate <= to;
      })
      .sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());

    // Calculate opening balance (transactions - payments before fromDate)
    const priorTransactions = allTransactions.filter((tx) => {
      if (tx.client_id !== clientId) return false;
      const txDate = new Date(tx.transaction_date);
      return txDate < from;
    });

    const priorPayments = allPayments.filter((p) => {
      if (p.client_id !== clientId) return false;
      const pDate = new Date(p.payment_date);
      return pDate < from;
    });

    const priorDebits = priorTransactions.reduce(
      (sum, tx) => sum + (tx.cash_amount || 0),
      0
    );
    const priorCredits = priorPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const openingBalance = priorDebits - priorCredits;

    // Period totals
    const periodDebits = transactions.reduce(
      (sum, tx) => sum + (tx.cash_amount || 0),
      0
    );
    const periodCredits = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const closingBalance = openingBalance + periodDebits - periodCredits;

    return {
      client,
      fromDate,
      toDate,
      openingBalance,
      transactions,
      payments,
      periodDebits,
      periodCredits,
      closingBalance,
    };
  }

  /**
   * Get total debts across all clients
   */
  static async getTotalDebts(): Promise<number> {
    const clients = await ClientDB.getAll();
    return clients.reduce((sum, c) => sum + (c.total_debt || 0), 0);
  }

  /**
   * Get active clients count (with transactions in last 30 days)
   */
  static async getActiveClientsCount(): Promise<number> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const transactions = await TransactionDB.getAll();
    const activeClientIds = new Set(
      transactions
        .filter((tx) => new Date(tx.transaction_date) >= thirtyDaysAgo)
        .map((tx) => tx.client_id)
        .filter(Boolean)
    );

    return activeClientIds.size;
  }
}

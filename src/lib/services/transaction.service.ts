// ============================================
// Transaction Service
// Uses Google Apps Script API in production
// ============================================

import { transactionsApi } from '@/lib/api-production';
import {
  Transaction,
  CreateTransactionInput,
  TransactionFilters,
} from '@/types';

export class TransactionService {
  /**
   * Get transactions with optional filters
   */
  static async getAll(filters: TransactionFilters = {}): Promise<Transaction[]> {
    const transactions = await transactionsApi.getAll({
      from: filters.from,
      to: filters.to,
      wallet_id: filters.wallet_id,
      client_id: filters.client_id,
      payment_status: filters.payment_status,
      transaction_type: filters.transaction_type,
    });

    // Sort by date (newest first)
    return transactions.sort(
      (a, b) =>
        new Date(b.transaction_date).getTime() -
        new Date(a.transaction_date).getTime()
    );
  }

  /**
   * Create new transaction
   */
  static async create(input: CreateTransactionInput): Promise<Transaction> {
    return transactionsApi.create({
      wallet_id: input.wallet_id,
      client_id: input.client_id,
      transaction_type: input.transaction_type,
      vc_amount: input.vc_amount,
      cash_amount: input.cash_amount,
      fee_amount: input.fee_amount,
      recipient_phone: input.recipient_phone,
      description: input.description,
      transaction_date: input.transaction_date,
    });
  }

  /**
   * Delete transaction
   */
  static async delete(transactionId: string): Promise<void> {
    return transactionsApi.delete(transactionId);
  }
}

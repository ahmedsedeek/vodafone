// ============================================
// Payment Service
// Uses Google Apps Script API in production
// ============================================

import { paymentsApi } from '@/lib/api-production';
import {
  Payment,
  CreatePaymentInput,
  PaymentAllocationResult,
} from '@/types';

export class PaymentService {
  /**
   * Get all payments with optional filters
   */
  static async getAll(filters: {
    client_id?: string;
    from?: string;
    to?: string;
  } = {}): Promise<Payment[]> {
    const payments = await paymentsApi.getAll({
      client_id: filters.client_id,
      from: filters.from,
      to: filters.to,
    });

    // Sort by date (newest first)
    return payments.sort(
      (a, b) =>
        new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
    );
  }

  /**
   * Create payment with FIFO allocation
   */
  static async create(input: CreatePaymentInput): Promise<PaymentAllocationResult> {
    return paymentsApi.create({
      client_id: input.client_id,
      amount: input.amount,
      payment_method: input.payment_method,
      notes: input.notes,
      payment_date: input.payment_date,
    });
  }

  /**
   * Get total payments for a date range
   */
  static async getTotalForPeriod(fromDate: string, toDate: string): Promise<number> {
    const payments = await this.getAll({ from: fromDate, to: toDate });
    return payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }
}

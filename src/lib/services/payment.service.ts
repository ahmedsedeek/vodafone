// ============================================
// Payment Service with FIFO Allocation
// ============================================

import { PaymentDB, ClientDB } from '@/lib/db';
import {
  Payment,
  CreatePaymentInput,
  PaymentAllocationResult,
} from '@/types';
import { generateUUID, nowISO, todayDate, validateRequired } from '@/lib/utils';
import { TransactionService } from './transaction.service';
import { ClientService } from './client.service';

export class PaymentService {
  /**
   * Get all payments with optional filters
   */
  static async getAll(filters: {
    client_id?: string;
    from?: string;
    to?: string;
  } = {}): Promise<Payment[]> {
    let payments = await PaymentDB.getAll();

    if (filters.client_id) {
      payments = payments.filter((p) => p.client_id === filters.client_id);
    }

    if (filters.from) {
      const fromDate = new Date(filters.from);
      payments = payments.filter(
        (p) => new Date(p.payment_date) >= fromDate
      );
    }

    if (filters.to) {
      const toDate = new Date(filters.to);
      toDate.setHours(23, 59, 59, 999);
      payments = payments.filter(
        (p) => new Date(p.payment_date) <= toDate
      );
    }

    // Enrich with client names
    const clients = await ClientDB.getAll();
    const clientMap = new Map(clients.map((c) => [c.client_id, c.client_name]));

    payments = payments.map((p) => ({
      ...p,
      client_name: clientMap.get(p.client_id) || '',
    }));

    // Sort by date (newest first)
    return payments.sort(
      (a, b) =>
        new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime()
    );
  }

  /**
   * Create payment with FIFO allocation
   * Allocates payment to oldest unpaid transactions first
   */
  static async create(input: CreatePaymentInput): Promise<PaymentAllocationResult> {
    // Validate
    const missing = validateRequired(input, ['client_id', 'amount']);
    if (missing.length > 0) {
      throw new Error(`الحقول المطلوبة: ${missing.join(', ')}`);
    }

    const client = await ClientDB.getById(input.client_id);
    if (!client) {
      throw new Error('العميل غير موجود');
    }

    const amount = input.amount;
    if (amount <= 0) {
      throw new Error('مبلغ الدفع يجب أن يكون رقماً موجباً');
    }

    // Get unpaid transactions sorted by date (FIFO)
    const unpaidTx = await TransactionService.getUnpaidByClient(input.client_id);

    if (unpaidTx.length === 0) {
      throw new Error('لا توجد معاملات غير مدفوعة لهذا العميل');
    }

    // FIFO allocation
    let remaining = amount;
    const allocations: Array<{
      transaction_id: string;
      amount: number;
      currentPaid: number;
    }> = [];

    for (const tx of unpaidTx) {
      if (remaining <= 0) break;

      const due = tx.amount_due || 0;
      const allocated = Math.min(due, remaining);

      allocations.push({
        transaction_id: tx.transaction_id,
        amount: allocated,
        currentPaid: tx.amount_paid || 0,
      });

      remaining -= allocated;
    }

    // Create payment records and update transactions
    const payments: Payment[] = [];

    for (const alloc of allocations) {
      const payment: Payment = {
        payment_id: generateUUID(),
        client_id: input.client_id,
        transaction_id: alloc.transaction_id,
        amount: alloc.amount,
        payment_method: input.payment_method || 'cash',
        notes: input.notes?.trim() || '',
        payment_date: input.payment_date || todayDate(),
        created_at: nowISO(),
      };

      await PaymentDB.create(payment);

      // Update transaction payment info
      const newPaid = alloc.currentPaid + alloc.amount;
      await TransactionService.updatePaymentInfo(alloc.transaction_id, newPaid);

      payments.push(payment);
    }

    // Update client total debt
    await ClientService.updateTotalDebt(input.client_id);

    return {
      payments,
      totalAllocated: amount - remaining,
      unallocated: remaining,
    };
  }

  /**
   * Get payments for a specific transaction
   */
  static async getByTransactionId(transactionId: string): Promise<Payment[]> {
    return PaymentDB.getByFilter((p) => p.transaction_id === transactionId);
  }

  /**
   * Get total payments for a date range
   */
  static async getTotalForPeriod(fromDate: string, toDate: string): Promise<number> {
    const payments = await this.getAll({ from: fromDate, to: toDate });
    return payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  }
}

// ============================================
// Transaction Service
// ============================================

import { TransactionDB, WalletDB, ClientDB, AttachmentDB } from '@/lib/db';
import {
  Transaction,
  CreateTransactionInput,
  TransactionFilters,
  ProfitReport,
  DebtAgingReport,
} from '@/types';
import {
  generateUUID,
  nowISO,
  todayDate,
  validateRequired,
  calculatePaymentStatus,
  daysDifference,
  formatDate,
  getWeekStart,
} from '@/lib/utils';
import { WalletService } from './wallet.service';
import { ClientService } from './client.service';

export class TransactionService {
  /**
   * Get transactions with optional filters
   */
  static async getAll(filters: TransactionFilters = {}): Promise<Transaction[]> {
    let transactions = await TransactionDB.getAll();

    // Apply filters
    if (filters.from) {
      const fromDate = new Date(filters.from);
      transactions = transactions.filter(
        (tx) => new Date(tx.transaction_date) >= fromDate
      );
    }

    if (filters.to) {
      const toDate = new Date(filters.to);
      toDate.setHours(23, 59, 59, 999);
      transactions = transactions.filter(
        (tx) => new Date(tx.transaction_date) <= toDate
      );
    }

    if (filters.wallet_id) {
      transactions = transactions.filter(
        (tx) => tx.wallet_id === filters.wallet_id
      );
    }

    if (filters.client_id) {
      transactions = transactions.filter(
        (tx) => tx.client_id === filters.client_id
      );
    }

    if (filters.payment_status) {
      transactions = transactions.filter(
        (tx) => tx.payment_status === filters.payment_status
      );
    }

    if (filters.transaction_type) {
      transactions = transactions.filter(
        (tx) => tx.transaction_type === filters.transaction_type
      );
    }

    // Enrich with related data
    const wallets = await WalletDB.getAll();
    const clients = await ClientDB.getAll();
    const attachments = await AttachmentDB.getAll();

    const walletMap = new Map(wallets.map((w) => [w.wallet_id, w.wallet_name]));
    const clientMap = new Map(clients.map((c) => [c.client_id, c.client_name]));
    const attachmentMap = new Map(
      attachments.map((a) => [a.transaction_id, a.file_url])
    );

    transactions = transactions.map((tx) => ({
      ...tx,
      wallet_name: walletMap.get(tx.wallet_id) || '',
      client_name: tx.client_id ? clientMap.get(tx.client_id) || '' : '',
      attachment_url: attachmentMap.get(tx.transaction_id) || '',
    }));

    // Sort by date (newest first)
    return transactions.sort(
      (a, b) =>
        new Date(b.transaction_date).getTime() -
        new Date(a.transaction_date).getTime()
    );
  }

  /**
   * Get transaction by ID
   */
  static async getById(transactionId: string): Promise<Transaction | null> {
    const tx = await TransactionDB.getById(transactionId);
    return tx || null;
  }

  /**
   * Create new transaction
   */
  static async create(input: CreateTransactionInput): Promise<Transaction> {
    // Validate required fields
    const missing = validateRequired(input, [
      'wallet_id',
      'transaction_type',
      'vc_amount',
    ]);
    if (missing.length > 0) {
      throw new Error(`الحقول المطلوبة: ${missing.join(', ')}`);
    }

    // Validate transaction type
    const validTypes = ['TRANSFER_OUT', 'TRANSFER_IN', 'DEPOSIT', 'WITHDRAW'];
    if (!validTypes.includes(input.transaction_type)) {
      throw new Error('نوع المعاملة غير صحيح');
    }

    // Validate wallet exists
    const wallet = await WalletDB.getById(input.wallet_id);
    if (!wallet) {
      throw new Error('المحفظة غير موجودة');
    }

    // Validate client if provided
    if (input.client_id) {
      const client = await ClientDB.getById(input.client_id);
      if (!client) {
        throw new Error('العميل غير موجود');
      }
    }

    // Calculate amounts
    const vcAmount = input.vc_amount;
    let cashAmount = input.cash_amount || 0;
    let feeAmount = input.fee_amount || 0;

    // Auto-calculate based on transaction type
    if (input.transaction_type === 'TRANSFER_OUT') {
      // Client pays cash = vc_amount + fee
      if (cashAmount === 0 && feeAmount > 0) {
        cashAmount = vcAmount + feeAmount;
      } else if (feeAmount === 0 && cashAmount > 0) {
        feeAmount = cashAmount - vcAmount;
      } else if (cashAmount === 0 && feeAmount === 0) {
        // Default: no fee
        cashAmount = vcAmount;
        feeAmount = 0;
      }
    } else if (input.transaction_type === 'TRANSFER_IN') {
      // You give cash = vc_amount - fee
      if (cashAmount === 0 && feeAmount > 0) {
        cashAmount = vcAmount - feeAmount;
      } else if (feeAmount === 0 && cashAmount > 0) {
        feeAmount = vcAmount - cashAmount;
      } else if (cashAmount === 0 && feeAmount === 0) {
        cashAmount = vcAmount;
        feeAmount = 0;
      }
    } else {
      // DEPOSIT / WITHDRAW
      cashAmount = vcAmount;
      feeAmount = 0;
    }

    // Validate amounts
    if (vcAmount < 0 || cashAmount < 0 || feeAmount < 0) {
      throw new Error('المبالغ يجب أن تكون أرقاماً موجبة');
    }

    // Determine payment status
    const amountPaid = input.amount_paid || 0;
    let paymentStatus = calculatePaymentStatus(cashAmount, amountPaid);

    // For DEPOSIT/WITHDRAW, always paid
    if (
      input.transaction_type === 'DEPOSIT' ||
      input.transaction_type === 'WITHDRAW'
    ) {
      paymentStatus = 'paid';
    }

    const now = nowISO();
    const transaction: Transaction = {
      transaction_id: generateUUID(),
      wallet_id: input.wallet_id,
      client_id: input.client_id || '',
      transaction_type: input.transaction_type,
      vc_amount: vcAmount,
      cash_amount: cashAmount,
      fee_amount: feeAmount,
      payment_status: paymentStatus,
      amount_paid: paymentStatus === 'paid' ? cashAmount : amountPaid,
      amount_due: paymentStatus === 'paid' ? 0 : cashAmount - amountPaid,
      recipient_phone: input.recipient_phone?.replace(/[\s\-]/g, '') || '',
      description: input.description?.trim() || '',
      attachment_id: '',
      transaction_date: input.transaction_date || todayDate(),
      created_at: now,
      updated_at: now,
    };

    await TransactionDB.create(transaction);

    // Update wallet balance
    await WalletService.recalculateBalance(input.wallet_id);

    // Update client debt if applicable
    if (input.client_id && paymentStatus !== 'paid') {
      await ClientService.updateTotalDebt(input.client_id);
    }

    return transaction;
  }

  /**
   * Update transaction payment info
   */
  static async updatePaymentInfo(
    transactionId: string,
    amountPaid: number
  ): Promise<void> {
    const tx = await TransactionDB.getById(transactionId);
    if (!tx) {
      throw new Error('المعاملة غير موجودة');
    }

    const cashAmount = tx.cash_amount || 0;
    const amountDue = Math.max(0, cashAmount - amountPaid);
    const paymentStatus = calculatePaymentStatus(cashAmount, amountPaid);

    await TransactionDB.updatePaymentInfo(
      transactionId,
      amountPaid,
      amountDue,
      paymentStatus
    );

    // Update client debt
    if (tx.client_id) {
      await ClientService.updateTotalDebt(tx.client_id);
    }
  }

  /**
   * Get profit report for date range
   */
  static async getProfitReport(
    fromDate: string,
    toDate: string
  ): Promise<ProfitReport> {
    const transactions = await this.getAll({ from: fromDate, to: toDate });

    const dailyProfit: Record<string, number> = {};
    const weeklyProfit: Record<string, number> = {};
    const monthlyProfit: Record<string, number> = {};

    for (const tx of transactions) {
      const date = tx.transaction_date;
      const fee = tx.fee_amount || 0;

      // Daily
      if (!dailyProfit[date]) dailyProfit[date] = 0;
      dailyProfit[date] += fee;

      // Weekly
      const weekStart = formatDate(getWeekStart(new Date(date)));
      if (!weeklyProfit[weekStart]) weeklyProfit[weekStart] = 0;
      weeklyProfit[weekStart] += fee;

      // Monthly
      const monthKey = date.substring(0, 7);
      if (!monthlyProfit[monthKey]) monthlyProfit[monthKey] = 0;
      monthlyProfit[monthKey] += fee;
    }

    const totalProfit = transactions.reduce(
      (sum, tx) => sum + (tx.fee_amount || 0),
      0
    );
    const totalVcAmount = transactions.reduce(
      (sum, tx) => sum + (tx.vc_amount || 0),
      0
    );

    return {
      fromDate,
      toDate,
      totalProfit,
      totalTransactions: transactions.length,
      totalVcAmount,
      dailyProfit,
      weeklyProfit,
      monthlyProfit,
    };
  }

  /**
   * Get debt aging report
   */
  static async getDebtAgingReport(): Promise<DebtAgingReport> {
    const allTx = await TransactionDB.getAll();
    const unpaidTx = allTx.filter(
      (tx) => tx.payment_status === 'debt' || tx.payment_status === 'partial'
    );

    const today = new Date();
    const buckets: DebtAgingReport['buckets'] = {
      '0-7': { transactions: [], total: 0 },
      '8-30': { transactions: [], total: 0 },
      '31-60': { transactions: [], total: 0 },
      '60+': { transactions: [], total: 0 },
    };

    for (const tx of unpaidTx) {
      const days = daysDifference(tx.transaction_date, today);
      const due = tx.amount_due || 0;

      let bucket: keyof typeof buckets;
      if (days <= 7) bucket = '0-7';
      else if (days <= 30) bucket = '8-30';
      else if (days <= 60) bucket = '31-60';
      else bucket = '60+';

      buckets[bucket].transactions.push(tx);
      buckets[bucket].total += due;
    }

    const totalDebt = Object.values(buckets).reduce((sum, b) => sum + b.total, 0);

    return {
      buckets,
      totalDebt,
      transactionCount: unpaidTx.length,
    };
  }

  /**
   * Get unpaid transactions for a client (sorted by date for FIFO)
   */
  static async getUnpaidByClient(clientId: string): Promise<Transaction[]> {
    const transactions = await TransactionDB.getByFilter(
      (tx) =>
        tx.client_id === clientId &&
        (tx.payment_status === 'debt' || tx.payment_status === 'partial')
    );

    // Sort by date ascending (oldest first for FIFO)
    return transactions.sort(
      (a, b) =>
        new Date(a.transaction_date).getTime() -
        new Date(b.transaction_date).getTime()
    );
  }
}

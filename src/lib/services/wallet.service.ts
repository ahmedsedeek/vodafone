// ============================================
// Wallet Service
// ============================================

import { WalletDB, TransactionDB } from '@/lib/db';
import { Wallet, CreateWalletInput, UpdateWalletInput } from '@/types';
import { generateUUID, nowISO, isValidEgyptianPhone, validateRequired } from '@/lib/utils';

export class WalletService {
  /**
   * Get all wallets
   */
  static async getAll(): Promise<Wallet[]> {
    const wallets = await WalletDB.getAll();
    // Sort by creation date (newest first)
    return wallets.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * Get wallet by ID
   */
  static async getById(walletId: string): Promise<Wallet | null> {
    const wallet = await WalletDB.getById(walletId);
    return wallet || null;
  }

  /**
   * Create new wallet
   */
  static async create(input: CreateWalletInput): Promise<Wallet> {
    // Validate required fields
    const missing = validateRequired(input, ['phone_number', 'wallet_name']);
    if (missing.length > 0) {
      throw new Error(`الحقول المطلوبة: ${missing.join(', ')}`);
    }

    // Validate phone number
    if (!isValidEgyptianPhone(input.phone_number)) {
      throw new Error('رقم الهاتف غير صحيح (يجب أن يبدأ بـ 01 ويتكون من 11 رقم)');
    }

    const initialBalance = input.initial_balance || 0;
    if (initialBalance < 0) {
      throw new Error('الرصيد الابتدائي يجب أن يكون رقماً موجباً');
    }

    const now = nowISO();
    const wallet: Wallet = {
      wallet_id: generateUUID(),
      phone_number: input.phone_number.replace(/[\s\-]/g, ''),
      wallet_name: input.wallet_name.trim(),
      initial_balance: initialBalance,
      current_balance: initialBalance,
      is_active: true,
      notes: input.notes?.trim() || '',
      created_at: now,
      updated_at: now,
    };

    return WalletDB.create(wallet);
  }

  /**
   * Update wallet
   */
  static async update(walletId: string, input: UpdateWalletInput): Promise<Wallet> {
    const existing = await WalletDB.getById(walletId);
    if (!existing) {
      throw new Error('المحفظة غير موجودة');
    }

    const updates: Partial<Wallet> = {
      updated_at: nowISO(),
    };

    if (input.wallet_name !== undefined) {
      updates.wallet_name = input.wallet_name.trim();
    }
    if (input.is_active !== undefined) {
      updates.is_active = input.is_active;
    }
    if (input.notes !== undefined) {
      updates.notes = input.notes.trim();
    }

    const updated = await WalletDB.update(walletId, updates);
    if (!updated) {
      throw new Error('فشل في تحديث المحفظة');
    }

    return updated;
  }

  /**
   * Calculate wallet balance from transactions
   */
  static async calculateBalance(walletId: string): Promise<number> {
    const wallet = await WalletDB.getById(walletId);
    if (!wallet) return 0;

    const transactions = await TransactionDB.getByFilter(
      (tx) => tx.wallet_id === walletId
    );

    let balance = wallet.initial_balance;

    for (const tx of transactions) {
      const vcAmount = tx.vc_amount || 0;
      switch (tx.transaction_type) {
        case 'TRANSFER_OUT':
        case 'WITHDRAW':
          balance -= vcAmount;
          break;
        case 'TRANSFER_IN':
        case 'DEPOSIT':
          balance += vcAmount;
          break;
      }
    }

    return balance;
  }

  /**
   * Recalculate and update wallet balance
   */
  static async recalculateBalance(walletId: string): Promise<number> {
    const newBalance = await this.calculateBalance(walletId);
    await WalletDB.updateBalance(walletId, newBalance);
    return newBalance;
  }

  /**
   * Recalculate all wallet balances
   */
  static async recalculateAllBalances(): Promise<void> {
    const wallets = await WalletDB.getAll();
    for (const wallet of wallets) {
      await this.recalculateBalance(wallet.wallet_id);
    }
  }

  /**
   * Get total balance across all wallets
   */
  static async getTotalBalance(): Promise<number> {
    const wallets = await WalletDB.getAll();
    return wallets.reduce((sum, w) => sum + (w.current_balance || 0), 0);
  }
}

// ============================================
// Wallet Service
// Uses Google Apps Script API in production
// ============================================

import { walletsApi } from '@/lib/api-production';
import { Wallet, CreateWalletInput, UpdateWalletInput } from '@/types';

export class WalletService {
  /**
   * Get all wallets
   */
  static async getAll(): Promise<Wallet[]> {
    const wallets = await walletsApi.getAll();
    // Sort by creation date (newest first)
    return wallets.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  /**
   * Get wallet by ID
   */
  static async getById(walletId: string): Promise<Wallet | null> {
    try {
      const wallet = await walletsApi.getById(walletId);
      return wallet || null;
    } catch {
      return null;
    }
  }

  /**
   * Create new wallet
   */
  static async create(input: CreateWalletInput): Promise<Wallet> {
    return walletsApi.create({
      phone_number: input.phone_number,
      wallet_name: input.wallet_name,
      initial_balance: input.initial_balance,
      notes: input.notes,
    });
  }

  /**
   * Update wallet
   */
  static async update(walletId: string, input: UpdateWalletInput): Promise<Wallet> {
    return walletsApi.update(walletId, {
      wallet_name: input.wallet_name,
      is_active: input.is_active,
      notes: input.notes,
    });
  }

  /**
   * Get total balance across all wallets
   */
  static async getTotalBalance(): Promise<number> {
    const wallets = await walletsApi.getAll();
    return wallets.reduce((sum, w) => sum + (w.current_balance || 0), 0);
  }
}

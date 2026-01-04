// ============================================
// Vodafone Cash Business Tracker - Type Definitions
// ============================================

// ==================== ENUMS ====================

export type TransactionType = 'TRANSFER_OUT' | 'TRANSFER_IN' | 'DEPOSIT' | 'WITHDRAW';
export type PaymentStatus = 'paid' | 'partial' | 'debt';
export type PaymentMethod = 'cash' | 'vc_transfer' | 'bank';

// ==================== BASE ENTITY ====================

export interface BaseEntity {
  created_at: string;
  updated_at: string;
}

// ==================== WALLET ====================

export interface Wallet extends BaseEntity {
  wallet_id: string;
  phone_number: string;
  wallet_name: string;
  initial_balance: number;
  current_balance: number;
  is_active: boolean;
  notes: string;
}

export interface CreateWalletInput {
  phone_number: string;
  wallet_name: string;
  initial_balance?: number;
  notes?: string;
}

export interface UpdateWalletInput {
  wallet_name?: string;
  is_active?: boolean;
  notes?: string;
}

// ==================== CLIENT ====================

export interface ClientPhone {
  phone_id: string;
  client_id: string;
  phone_number: string;
  is_primary: boolean;
  phone_label: string;
  created_at: string;
}

export interface Client extends BaseEntity {
  client_id: string;
  client_name: string;
  national_id: string;
  address: string;
  notes: string;
  total_debt: number;
  is_active: boolean;
  phones: ClientPhone[];
}

export interface CreateClientInput {
  client_name: string;
  phone_number?: string;
  national_id?: string;
  address?: string;
  notes?: string;
}

export interface AddPhoneInput {
  phone_number: string;
  is_primary?: boolean;
  phone_label?: string;
}

// ==================== TRANSACTION ====================

export interface Transaction extends BaseEntity {
  transaction_id: string;
  wallet_id: string;
  client_id: string;
  transaction_type: TransactionType;
  vc_amount: number;
  cash_amount: number;
  fee_amount: number;
  payment_status: PaymentStatus;
  amount_paid: number;
  amount_due: number;
  recipient_phone: string;
  description: string;
  attachment_id: string;
  transaction_date: string;
  // Joined fields (optional, populated on fetch)
  wallet_name?: string;
  client_name?: string;
  attachment_url?: string;
}

export interface CreateTransactionInput {
  wallet_id: string;
  client_id?: string;
  transaction_type: TransactionType;
  vc_amount: number;
  cash_amount?: number;
  fee_amount?: number;
  amount_paid?: number;
  recipient_phone?: string;
  description?: string;
  transaction_date?: string;
}

export interface TransactionFilters {
  from?: string;
  to?: string;
  wallet_id?: string;
  client_id?: string;
  payment_status?: PaymentStatus;
  transaction_type?: TransactionType;
}

// ==================== PAYMENT ====================

export interface Payment {
  payment_id: string;
  client_id: string;
  transaction_id: string;
  amount: number;
  payment_method: PaymentMethod;
  notes: string;
  payment_date: string;
  created_at: string;
  // Joined fields
  client_name?: string;
  transaction_description?: string;
}

export interface CreatePaymentInput {
  client_id: string;
  amount: number;
  payment_method?: PaymentMethod;
  notes?: string;
  payment_date?: string;
}

export interface PaymentAllocationResult {
  payments: Payment[];
  totalAllocated: number;
  unallocated: number;
}

// ==================== ATTACHMENT ====================

export interface Attachment {
  attachment_id: string;
  transaction_id: string;
  file_name: string;
  file_path: string;  // Local path for local dev
  file_url: string;   // URL for access
  mime_type: string;
  file_size: number;
  created_at: string;
}

export interface UploadAttachmentInput {
  transaction_id: string;
  file: File;
}

// ==================== REPORTS ====================

export interface DashboardKPIs {
  // Today
  todayProfit: number;
  todayVolume: number;
  todayTransactionCount: number;

  // Week
  weekProfit: number;
  weekTransactionCount: number;

  // Month
  monthProfit: number;
  monthTransactionCount: number;

  // Totals
  totalWalletBalance: number;
  totalDebts: number;
  totalClients: number;
  activeClients: number;
  totalWallets: number;

  // Debt aging
  debtAging: {
    '0-7': number;
    '8-30': number;
    '31-60': number;
    '60+': number;
  };
}

export interface ProfitReport {
  fromDate: string;
  toDate: string;
  totalProfit: number;
  totalTransactions: number;
  totalVcAmount: number;
  dailyProfit: Record<string, number>;
  weeklyProfit: Record<string, number>;
  monthlyProfit: Record<string, number>;
}

export interface ChartDataPoint {
  date: string;
  profit: number;
  volume?: number;
  transactions?: number;
}

export interface DebtAgingReport {
  buckets: {
    '0-7': { transactions: Transaction[]; total: number };
    '8-30': { transactions: Transaction[]; total: number };
    '31-60': { transactions: Transaction[]; total: number };
    '60+': { transactions: Transaction[]; total: number };
  };
  totalDebt: number;
  transactionCount: number;
}

export interface TopClient {
  client_id: string;
  client_name: string;
  volume: number;
  count: number;
  profit: number;
}

// ==================== CLIENT STATEMENT ====================

export interface ClientStatement {
  client: Client;
  fromDate: string;
  toDate: string;
  openingBalance: number;
  transactions: Transaction[];
  payments: Payment[];
  periodDebits: number;
  periodCredits: number;
  closingBalance: number;
}

// ==================== API RESPONSE ====================

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: {
    code: number;
    message: string;
  };
  timestamp: string;
}

// ==================== DATABASE STRUCTURE ====================

export interface Database {
  wallets: Wallet[];
  clients: Client[];
  client_phones: ClientPhone[];
  transactions: Transaction[];
  payments: Payment[];
  attachments: Attachment[];
}

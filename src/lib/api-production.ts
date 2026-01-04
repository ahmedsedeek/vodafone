// ============================================
// Production API Client
// Calls Google Apps Script Web App
// ============================================

import type {
  Wallet,
  Client,
  Transaction,
  Payment,
  Attachment,
  ClientStatement,
  DashboardKPIs,
  ProfitReport,
  DebtAgingReport,
} from '@/types';

// Environment variables (set in .env.production)
const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || '';
const API_KEY = process.env.APPS_SCRIPT_API_KEY || '';

// ============================================
// API Response Types
// ============================================

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: number;
    message: string;
  };
  timestamp: string;
}

interface PaymentAllocationResult {
  payments: Payment[];
  totalAllocated: number;
  unallocated: number;
}

interface ChartDataPoint {
  date: string;
  profit: number;
  transactions: number;
}

interface TopClient {
  clientId: string;
  clientName: string;
  totalVolume: number;
  totalFees: number;
  transactionCount: number;
  totalDebt: number;
}

// ============================================
// Core Fetch Function
// ============================================

async function apiFetch<T>(
  path: string,
  method: 'GET' | 'POST' = 'GET',
  body?: Record<string, unknown>,
  params?: Record<string, string>
): Promise<T> {
  // Build URL with query params
  const url = new URL(APPS_SCRIPT_URL);
  url.searchParams.set('path', path);
  url.searchParams.set('apiKey', API_KEY);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, value);
      }
    });
  }

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (method === 'POST' && body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), options);
  const data: ApiResponse<T> = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'API request failed');
  }

  return data.data as T;
}

// ============================================
// Auth API (handled differently - uses session token)
// ============================================

export const authApi = {
  async login(password: string): Promise<{ sessionToken: string; expiresAt: string }> {
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.set('path', 'auth/login');

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'Login failed');
    }

    return data.data;
  },

  async logout(sessionToken: string): Promise<void> {
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.set('path', 'auth/logout');

    await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken }),
    });
  },

  async check(sessionToken: string): Promise<boolean> {
    const url = new URL(APPS_SCRIPT_URL);
    url.searchParams.set('path', 'auth/check');
    url.searchParams.set('sessionToken', sessionToken);

    const response = await fetch(url.toString());
    const data = await response.json();

    return data.authenticated === true;
  },
};

// ============================================
// Wallets API
// ============================================

export const walletsApi = {
  async getAll(): Promise<Wallet[]> {
    return apiFetch<Wallet[]>('wallets');
  },

  async getById(walletId: string): Promise<Wallet> {
    return apiFetch<Wallet>(`wallets/${walletId}`);
  },

  async create(input: {
    phone_number: string;
    wallet_name: string;
    initial_balance?: number;
    notes?: string;
  }): Promise<Wallet> {
    return apiFetch<Wallet>('wallets', 'POST', input);
  },

  async update(
    walletId: string,
    input: {
      wallet_name?: string;
      is_active?: boolean;
      notes?: string;
    }
  ): Promise<Wallet> {
    return apiFetch<Wallet>(`wallets/${walletId}`, 'POST', input);
  },
};

// ============================================
// Clients API
// ============================================

export const clientsApi = {
  async getAll(): Promise<Client[]> {
    return apiFetch<Client[]>('clients');
  },

  async getById(clientId: string): Promise<Client> {
    return apiFetch<Client>(`clients/${clientId}`);
  },

  async create(input: {
    client_name: string;
    national_id?: string;
    address?: string;
    notes?: string;
    phone_number?: string;
    phone_label?: string;
  }): Promise<Client> {
    return apiFetch<Client>('clients', 'POST', input);
  },

  async addPhone(
    clientId: string,
    input: {
      phone_number: string;
      is_primary?: boolean;
      phone_label?: string;
    }
  ): Promise<{ phone_id: string }> {
    return apiFetch<{ phone_id: string }>(`clients/${clientId}/phones`, 'POST', input);
  },

  async getStatement(
    clientId: string,
    params?: { from?: string; to?: string }
  ): Promise<ClientStatement> {
    return apiFetch<ClientStatement>(`clients/${clientId}/statement`, 'GET', undefined, params);
  },
};

// ============================================
// Transactions API
// ============================================

export const transactionsApi = {
  async getAll(filters?: {
    from?: string;
    to?: string;
    wallet_id?: string;
    client_id?: string;
    payment_status?: string;
    transaction_type?: string;
  }): Promise<Transaction[]> {
    return apiFetch<Transaction[]>('transactions', 'GET', undefined, filters as Record<string, string>);
  },

  async create(input: {
    wallet_id: string;
    client_id?: string;
    transaction_type: 'TRANSFER_OUT' | 'TRANSFER_IN' | 'DEPOSIT' | 'WITHDRAW';
    vc_amount?: number;
    cash_amount?: number;
    fee_amount?: number;
    recipient_phone?: string;
    description?: string;
    transaction_date?: string;
  }): Promise<Transaction> {
    return apiFetch<Transaction>('transactions', 'POST', input);
  },
};

// ============================================
// Payments API
// ============================================

export const paymentsApi = {
  async getAll(filters?: {
    client_id?: string;
    from?: string;
    to?: string;
  }): Promise<Payment[]> {
    return apiFetch<Payment[]>('payments', 'GET', undefined, filters as Record<string, string>);
  },

  async create(input: {
    client_id: string;
    amount: number;
    payment_method?: 'cash' | 'vc_transfer' | 'bank';
    notes?: string;
    payment_date?: string;
  }): Promise<PaymentAllocationResult> {
    return apiFetch<PaymentAllocationResult>('payments', 'POST', input);
  },
};

// ============================================
// Attachments API
// ============================================

export const attachmentsApi = {
  async upload(
    transactionId: string,
    file: File
  ): Promise<Attachment> {
    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );

    return apiFetch<Attachment>('attachments', 'POST', {
      transaction_id: transactionId,
      file_data: base64,
      file_name: file.name,
      mime_type: file.type,
    });
  },
};

// ============================================
// Reports API
// ============================================

export const reportsApi = {
  async getDashboard(): Promise<DashboardKPIs> {
    return apiFetch<DashboardKPIs>('dashboard');
  },

  async getProfitChart(days: number = 30): Promise<ChartDataPoint[]> {
    return apiFetch<ChartDataPoint[]>('reports/chart', 'GET', undefined, { days: days.toString() });
  },

  async getProfitReport(params?: { from?: string; to?: string }): Promise<ProfitReport> {
    return apiFetch<ProfitReport>('reports/profit', 'GET', undefined, params);
  },

  async getDebtAging(): Promise<DebtAgingReport> {
    return apiFetch<DebtAgingReport>('reports/debt-aging');
  },

  async getTopClients(limit: number = 10): Promise<TopClient[]> {
    return apiFetch<TopClient[]>('reports/top-clients', 'GET', undefined, { limit: limit.toString() });
  },
};

// ============================================
// PDF API
// ============================================

export const pdfApi = {
  async getStatementPdf(
    clientId: string,
    params?: { from?: string; to?: string }
  ): Promise<{ pdf: string; filename: string }> {
    return apiFetch<{ pdf: string; filename: string }>(
      `clients/${clientId}/statement/pdf`,
      'GET',
      undefined,
      params
    );
  },

  downloadStatementPdf(base64Pdf: string, filename: string): void {
    // Convert base64 to blob
    const binaryString = atob(base64Pdf);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};

// ============================================
// Combined Export for Easy Switching
// ============================================

export const productionApi = {
  auth: authApi,
  wallets: walletsApi,
  clients: clientsApi,
  transactions: transactionsApi,
  payments: paymentsApi,
  attachments: attachmentsApi,
  reports: reportsApi,
  pdf: pdfApi,
};

export default productionApi;

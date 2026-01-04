// ============================================
// API Client for Frontend
// ============================================

import {
  ApiResponse,
  Wallet,
  Client,
  Transaction,
  Payment,
  Attachment,
  DashboardKPIs,
  ChartDataPoint,
  ProfitReport,
  DebtAgingReport,
  TopClient,
  ClientStatement,
  CreateWalletInput,
  CreateClientInput,
  CreateTransactionInput,
  CreatePaymentInput,
  AddPhoneInput,
  TransactionFilters,
  PaymentAllocationResult,
} from '@/types';

const API_BASE = '/api';

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data: ApiResponse<T> = await response.json();

  if (!data.success) {
    throw new Error(data.error?.message || data.message || 'حدث خطأ');
  }

  return data.data as T;
}

// ==================== WALLETS ====================

export const walletsApi = {
  getAll: () => fetchApi<Wallet[]>('/wallets'),

  getById: (id: string) => fetchApi<Wallet>(`/wallets/${id}`),

  create: (data: CreateWalletInput) =>
    fetchApi<Wallet>('/wallets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Wallet>) =>
    fetchApi<Wallet>(`/wallets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ==================== CLIENTS ====================

export const clientsApi = {
  getAll: () => fetchApi<Client[]>('/clients'),

  getById: (id: string) => fetchApi<Client>(`/clients/${id}`),

  create: (data: CreateClientInput) =>
    fetchApi<Client>('/clients', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  addPhone: (clientId: string, data: AddPhoneInput) =>
    fetchApi<any>(`/clients/${clientId}/phones`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getStatement: (clientId: string, from: string, to: string) =>
    fetchApi<ClientStatement>(
      `/clients/${clientId}/statement?from=${from}&to=${to}`
    ),
};

// ==================== TRANSACTIONS ====================

export const transactionsApi = {
  getAll: (filters: TransactionFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);
    if (filters.wallet_id) params.append('wallet_id', filters.wallet_id);
    if (filters.client_id) params.append('client_id', filters.client_id);
    if (filters.payment_status) params.append('payment_status', filters.payment_status);
    if (filters.transaction_type) params.append('transaction_type', filters.transaction_type);

    const query = params.toString();
    return fetchApi<Transaction[]>(`/transactions${query ? `?${query}` : ''}`);
  },

  create: (data: CreateTransactionInput) =>
    fetchApi<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ==================== PAYMENTS ====================

export const paymentsApi = {
  getAll: (filters: { client_id?: string; from?: string; to?: string } = {}) => {
    const params = new URLSearchParams();
    if (filters.client_id) params.append('client_id', filters.client_id);
    if (filters.from) params.append('from', filters.from);
    if (filters.to) params.append('to', filters.to);

    const query = params.toString();
    return fetchApi<Payment[]>(`/payments${query ? `?${query}` : ''}`);
  },

  create: (data: CreatePaymentInput) =>
    fetchApi<PaymentAllocationResult>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ==================== ATTACHMENTS ====================

export const attachmentsApi = {
  upload: async (transactionId: string, file: File): Promise<Attachment> => {
    const formData = new FormData();
    formData.append('transaction_id', transactionId);
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/attachments`, {
      method: 'POST',
      body: formData,
    });

    const data: ApiResponse<Attachment> = await response.json();

    if (!data.success) {
      throw new Error(data.error?.message || 'فشل في رفع الملف');
    }

    return data.data as Attachment;
  },
};

// ==================== DASHBOARD & REPORTS ====================

export const reportsApi = {
  getDashboard: () => fetchApi<DashboardKPIs>('/dashboard'),

  getProfitChart: (days: number = 30) =>
    fetchApi<ChartDataPoint[]>(`/reports/chart?days=${days}`),

  getProfitReport: (from: string, to: string) =>
    fetchApi<ProfitReport>(`/reports/profit?from=${from}&to=${to}`),

  getDebtAging: () => fetchApi<DebtAgingReport>('/reports/debt-aging'),

  getTopClients: (limit: number = 10) =>
    fetchApi<TopClient[]>(`/reports/top-clients?limit=${limit}`),
};

// ==================== SEED ====================

export const seedApi = {
  seed: (reset: boolean = false) =>
    fetchApi<any>(`/seed${reset ? '?reset=true' : ''}`, {
      method: 'POST',
    }),

  reset: () =>
    fetchApi<any>('/seed', {
      method: 'DELETE',
    }),
};

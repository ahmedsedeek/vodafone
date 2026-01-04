// ============================================
// Local JSON Database
// ============================================

import { promises as fs } from 'fs';
import path from 'path';
import {
  Database,
  Wallet,
  Client,
  ClientPhone,
  Transaction,
  Payment,
  Attachment,
} from '@/types';

const DB_PATH = path.join(process.cwd(), 'src/data/db.json');

// ==================== DATABASE INITIALIZATION ====================

const emptyDatabase: Database = {
  wallets: [],
  clients: [],
  client_phones: [],
  transactions: [],
  payments: [],
  attachments: [],
};

async function ensureDbExists(): Promise<void> {
  try {
    await fs.access(DB_PATH);
  } catch {
    // File doesn't exist, create it
    const dir = path.dirname(DB_PATH);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(emptyDatabase, null, 2), 'utf-8');
  }
}

// ==================== READ/WRITE OPERATIONS ====================

export async function readDatabase(): Promise<Database> {
  await ensureDbExists();
  const data = await fs.readFile(DB_PATH, 'utf-8');
  return JSON.parse(data) as Database;
}

export async function writeDatabase(db: Database): Promise<void> {
  await ensureDbExists();
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

// ==================== GENERIC CRUD HELPERS ====================

type EntityType = Wallet | Client | ClientPhone | Transaction | Payment | Attachment;
type TableName = keyof Database;

export async function getAll<T extends EntityType>(table: TableName): Promise<T[]> {
  const db = await readDatabase();
  return db[table] as T[];
}

export async function getById<T extends EntityType>(
  table: TableName,
  idField: string,
  id: string
): Promise<T | undefined> {
  const db = await readDatabase();
  const items = db[table] as unknown as Array<Record<string, unknown>>;
  return items.find((item) => item[idField] === id) as T | undefined;
}

export async function create<T extends EntityType>(
  table: TableName,
  item: T
): Promise<T> {
  const db = await readDatabase();
  (db[table] as T[]).push(item);
  await writeDatabase(db);
  return item;
}

export async function update<T extends EntityType>(
  table: TableName,
  idField: string,
  id: string,
  updates: Partial<T>
): Promise<T | undefined> {
  const db = await readDatabase();
  const items = db[table] as unknown as Array<Record<string, unknown>>;
  const index = items.findIndex((item) => item[idField] === id);

  if (index === -1) return undefined;

  const updated = { ...items[index], ...updates };
  items[index] = updated;
  await writeDatabase(db);
  return updated as unknown as T;
}

export async function remove(
  table: TableName,
  idField: string,
  id: string
): Promise<boolean> {
  const db = await readDatabase();
  const items = db[table] as unknown as Array<Record<string, unknown>>;
  const index = items.findIndex((item) => item[idField] === id);

  if (index === -1) return false;

  items.splice(index, 1);
  await writeDatabase(db);
  return true;
}

export async function findByFilter<T extends EntityType>(
  table: TableName,
  filterFn: (item: T) => boolean
): Promise<T[]> {
  const db = await readDatabase();
  const items = db[table] as T[];
  return items.filter(filterFn);
}

// ==================== WALLET OPERATIONS ====================

export const WalletDB = {
  async getAll(): Promise<Wallet[]> {
    return getAll<Wallet>('wallets');
  },

  async getById(walletId: string): Promise<Wallet | undefined> {
    return getById<Wallet>('wallets', 'wallet_id', walletId);
  },

  async create(wallet: Wallet): Promise<Wallet> {
    return create<Wallet>('wallets', wallet);
  },

  async update(walletId: string, updates: Partial<Wallet>): Promise<Wallet | undefined> {
    return update<Wallet>('wallets', 'wallet_id', walletId, updates);
  },

  async updateBalance(walletId: string, newBalance: number): Promise<void> {
    await update<Wallet>('wallets', 'wallet_id', walletId, {
      current_balance: newBalance,
      updated_at: new Date().toISOString(),
    });
  },
};

// ==================== CLIENT OPERATIONS ====================

export const ClientDB = {
  async getAll(): Promise<Client[]> {
    const clients = await getAll<Client>('clients');
    const phones = await getAll<ClientPhone>('client_phones');

    return clients.map((client) => ({
      ...client,
      phones: phones.filter((p) => p.client_id === client.client_id),
    }));
  },

  async getById(clientId: string): Promise<Client | undefined> {
    const client = await getById<Client>('clients', 'client_id', clientId);
    if (!client) return undefined;

    const phones = await findByFilter<ClientPhone>(
      'client_phones',
      (p) => p.client_id === clientId
    );

    return { ...client, phones };
  },

  async create(client: Client): Promise<Client> {
    const created = await create<Client>('clients', { ...client, phones: [] });
    return { ...created, phones: [] };
  },

  async update(clientId: string, updates: Partial<Client>): Promise<Client | undefined> {
    const { phones, ...updateData } = updates;
    return update<Client>('clients', 'client_id', clientId, updateData);
  },

  async updateTotalDebt(clientId: string, totalDebt: number): Promise<void> {
    await update<Client>('clients', 'client_id', clientId, {
      total_debt: totalDebt,
      updated_at: new Date().toISOString(),
    });
  },

  async addPhone(phone: ClientPhone): Promise<ClientPhone> {
    return create<ClientPhone>('client_phones', phone);
  },
};

// ==================== TRANSACTION OPERATIONS ====================

export const TransactionDB = {
  async getAll(): Promise<Transaction[]> {
    return getAll<Transaction>('transactions');
  },

  async getById(transactionId: string): Promise<Transaction | undefined> {
    return getById<Transaction>('transactions', 'transaction_id', transactionId);
  },

  async getByFilter(
    filterFn: (tx: Transaction) => boolean
  ): Promise<Transaction[]> {
    return findByFilter<Transaction>('transactions', filterFn);
  },

  async create(transaction: Transaction): Promise<Transaction> {
    return create<Transaction>('transactions', transaction);
  },

  async update(
    transactionId: string,
    updates: Partial<Transaction>
  ): Promise<Transaction | undefined> {
    return update<Transaction>('transactions', 'transaction_id', transactionId, updates);
  },

  async updatePaymentInfo(
    transactionId: string,
    amountPaid: number,
    amountDue: number,
    paymentStatus: 'paid' | 'partial' | 'debt'
  ): Promise<void> {
    await update<Transaction>('transactions', 'transaction_id', transactionId, {
      amount_paid: amountPaid,
      amount_due: amountDue,
      payment_status: paymentStatus,
      updated_at: new Date().toISOString(),
    });
  },
};

// ==================== PAYMENT OPERATIONS ====================

export const PaymentDB = {
  async getAll(): Promise<Payment[]> {
    return getAll<Payment>('payments');
  },

  async getByFilter(filterFn: (p: Payment) => boolean): Promise<Payment[]> {
    return findByFilter<Payment>('payments', filterFn);
  },

  async create(payment: Payment): Promise<Payment> {
    return create<Payment>('payments', payment);
  },
};

// ==================== ATTACHMENT OPERATIONS ====================

export const AttachmentDB = {
  async getAll(): Promise<Attachment[]> {
    return getAll<Attachment>('attachments');
  },

  async getById(attachmentId: string): Promise<Attachment | undefined> {
    return getById<Attachment>('attachments', 'attachment_id', attachmentId);
  },

  async getByTransactionId(transactionId: string): Promise<Attachment | undefined> {
    const attachments = await findByFilter<Attachment>(
      'attachments',
      (a) => a.transaction_id === transactionId
    );
    return attachments[0];
  },

  async create(attachment: Attachment): Promise<Attachment> {
    return create<Attachment>('attachments', attachment);
  },
};

// ==================== DATABASE RESET ====================

export async function resetDatabase(): Promise<void> {
  await writeDatabase(emptyDatabase);
}

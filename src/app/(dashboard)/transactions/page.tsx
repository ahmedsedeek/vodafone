'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  ArrowsRightLeftIcon,
  FunnelIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import Header from '@/components/layout/Header';
import { DataTable, Modal, Badge, LoadingSpinner, EmptyState, DateRangePicker } from '@/components/ui';
import { TransactionForm, FileUpload } from '@/components/forms';
import { AR, TRANSACTION_TYPE_COLORS, PAYMENT_STATUS_COLORS } from '@/lib/constants';
import { transactionsApi, walletsApi, clientsApi, attachmentsApi } from '@/lib/api';
import { Transaction, Wallet, Client, CreateTransactionInput, TransactionFilters } from '@/types';
import { formatCurrency, formatDate, getMonthStart, todayDate } from '@/lib/utils';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);

  // Filters
  const [filters, setFilters] = useState<TransactionFilters>({
    from: getMonthStart(),
    to: todayDate(),
  });
  const [showFilters, setShowFilters] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [txData, walletData, clientData] = await Promise.all([
        transactionsApi.getAll(filters),
        walletsApi.getAll(),
        clientsApi.getAll(),
      ]);
      setTransactions(txData);
      setWallets(walletData);
      setClients(clientData);
    } catch (error) {
      toast.error(AR.messages.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleCreate = async (data: CreateTransactionInput) => {
    try {
      setFormLoading(true);
      await transactionsApi.create(data);
      toast.success(AR.messages.transactionCreated);
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : AR.messages.error);
      throw error;
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    if (!selectedTransaction) return;
    try {
      setUploadLoading(true);
      await attachmentsApi.upload(selectedTransaction.transaction_id, file);
      toast.success(AR.messages.proofUploaded);
      setIsUploadModalOpen(false);
      setSelectedTransaction(null);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : AR.messages.error);
      throw error;
    } finally {
      setUploadLoading(false);
    }
  };

  const openUploadModal = (tx: Transaction) => {
    setSelectedTransaction(tx);
    setIsUploadModalOpen(true);
  };

  const columns = [
    {
      key: 'transaction_date',
      header: AR.transactions.transactionDate,
      sortable: true,
      render: (tx: Transaction) => (
        <span className="text-gray-600">{formatDate(tx.transaction_date, 'dd/MM/yyyy')}</span>
      ),
    },
    {
      key: 'transaction_type',
      header: AR.transactions.transactionType,
      render: (tx: Transaction) => (
        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${TRANSACTION_TYPE_COLORS[tx.transaction_type]}`}>
          {AR.transactions.types[tx.transaction_type]}
        </span>
      ),
    },
    {
      key: 'wallet_name',
      header: AR.wallets.wallet,
      render: (tx: Transaction) => (
        <span className="text-gray-700">{tx.wallet_name || '-'}</span>
      ),
    },
    {
      key: 'client_name',
      header: AR.clients.client,
      render: (tx: Transaction) => (
        <span className="text-gray-700">{tx.client_name || '-'}</span>
      ),
    },
    {
      key: 'vc_amount',
      header: AR.transactions.vcAmount,
      sortable: true,
      render: (tx: Transaction) => (
        <span className="font-medium">{formatCurrency(tx.vc_amount)} ج.م</span>
      ),
    },
    {
      key: 'fee_amount',
      header: AR.transactions.feeAmount,
      render: (tx: Transaction) => (
        <span className="text-green-600 font-medium">{formatCurrency(tx.fee_amount)} ج.م</span>
      ),
    },
    {
      key: 'payment_status',
      header: AR.transactions.paymentStatus,
      render: (tx: Transaction) => (
        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${PAYMENT_STATUS_COLORS[tx.payment_status]}`}>
          {AR.transactions.status[tx.payment_status]}
        </span>
      ),
    },
    {
      key: 'amount_due',
      header: AR.transactions.amountDue,
      render: (tx: Transaction) => (
        <span className={tx.amount_due > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
          {formatCurrency(tx.amount_due)} ج.م
        </span>
      ),
    },
    {
      key: 'proof',
      header: AR.transactions.proof,
      render: (tx: Transaction) => (
        tx.attachment_url ? (
          <a
            href={tx.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm"
          >
            عرض الإثبات
          </a>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              openUploadModal(tx);
            }}
            className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1"
          >
            <PhotoIcon className="w-4 h-4" />
            رفع
          </button>
        )
      ),
    },
  ];

  // Calculate totals
  const totalVolume = transactions.reduce((sum, tx) => sum + (tx.vc_amount || 0), 0);
  const totalProfit = transactions.reduce((sum, tx) => sum + (tx.fee_amount || 0), 0);
  const totalDebt = transactions.reduce((sum, tx) => sum + (tx.amount_due || 0), 0);

  return (
    <div>
      <Header
        title={AR.transactions.title}
        subtitle={`${transactions.length} ${AR.transactions.transaction}`}
        action={{
          label: AR.transactions.addTransaction,
          onClick: () => setIsModalOpen(true),
        }}
      />

      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="text-sm text-gray-500">عدد المعاملات</div>
            <div className="text-2xl font-bold text-gray-900">{transactions.length}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500">حجم التداول</div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalVolume)} ج.م
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500">إجمالي العمولات</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalProfit)} ج.م
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500">الديون المتبقية</div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalDebt)} ج.م
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 space-y-4">
          <div className="flex items-center justify-between">
            <DateRangePicker
              from={filters.from || getMonthStart()}
              to={filters.to || todayDate()}
              onChange={(from, to) => setFilters({ ...filters, from, to })}
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
            >
              <FunnelIcon className="w-5 h-5 ml-2" />
              {AR.actions.filter}
            </button>
          </div>

          {showFilters && (
            <div className="card animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="form-label">{AR.wallets.wallet}</label>
                  <select
                    value={filters.wallet_id || ''}
                    onChange={(e) => setFilters({ ...filters, wallet_id: e.target.value || undefined })}
                    className="form-select"
                  >
                    <option value="">الكل</option>
                    {wallets.map((w) => (
                      <option key={w.wallet_id} value={w.wallet_id}>
                        {w.wallet_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">{AR.clients.client}</label>
                  <select
                    value={filters.client_id || ''}
                    onChange={(e) => setFilters({ ...filters, client_id: e.target.value || undefined })}
                    className="form-select"
                  >
                    <option value="">الكل</option>
                    {clients.map((c) => (
                      <option key={c.client_id} value={c.client_id}>
                        {c.client_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">{AR.transactions.transactionType}</label>
                  <select
                    value={filters.transaction_type || ''}
                    onChange={(e) => setFilters({ ...filters, transaction_type: e.target.value as any || undefined })}
                    className="form-select"
                  >
                    <option value="">الكل</option>
                    <option value="TRANSFER_OUT">{AR.transactions.types.TRANSFER_OUT}</option>
                    <option value="TRANSFER_IN">{AR.transactions.types.TRANSFER_IN}</option>
                    <option value="DEPOSIT">{AR.transactions.types.DEPOSIT}</option>
                    <option value="WITHDRAW">{AR.transactions.types.WITHDRAW}</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">{AR.transactions.paymentStatus}</label>
                  <select
                    value={filters.payment_status || ''}
                    onChange={(e) => setFilters({ ...filters, payment_status: e.target.value as any || undefined })}
                    className="form-select"
                  >
                    <option value="">الكل</option>
                    <option value="paid">{AR.transactions.status.paid}</option>
                    <option value="partial">{AR.transactions.status.partial}</option>
                    <option value="debt">{AR.transactions.status.debt}</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setFilters({ from: getMonthStart(), to: todayDate() })}
                  className="btn btn-ghost text-sm"
                >
                  إعادة تعيين
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <LoadingSpinner />
        ) : transactions.length === 0 ? (
          <EmptyState
            title={AR.transactions.noTransactions}
            description="لا توجد معاملات في الفترة المحددة"
            icon={<ArrowsRightLeftIcon className="w-full h-full" />}
            action={{
              label: AR.transactions.addTransaction,
              onClick: () => setIsModalOpen(true),
            }}
          />
        ) : (
          <div className="card p-0 overflow-hidden">
            <DataTable
              columns={columns}
              data={transactions}
              keyField="transaction_id"
            />
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={AR.transactions.addTransaction}
        size="lg"
      >
        <TransactionForm
          wallets={wallets}
          clients={clients}
          onSubmit={handleCreate}
          onCancel={() => setIsModalOpen(false)}
          loading={formLoading}
        />
      </Modal>

      {/* Upload Proof Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setSelectedTransaction(null);
        }}
        title={AR.transactions.uploadProof}
        size="md"
      >
        <FileUpload
          onUpload={handleUpload}
          loading={uploadLoading}
        />
      </Modal>
    </div>
  );
}

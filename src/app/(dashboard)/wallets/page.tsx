'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { PlusIcon, WalletIcon } from '@heroicons/react/24/outline';
import Header from '@/components/layout/Header';
import { DataTable, Modal, Badge, LoadingSpinner, EmptyState } from '@/components/ui';
import { WalletForm } from '@/components/forms';
import { AR } from '@/lib/constants';
import { walletsApi } from '@/lib/api';
import { Wallet, CreateWalletInput } from '@/types';
import { formatCurrency, formatPhone, formatDateTime } from '@/lib/utils';

export default function WalletsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const data = await walletsApi.getAll();
      setWallets(data);
    } catch (error) {
      toast.error(AR.messages.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const handleCreate = async (data: CreateWalletInput) => {
    try {
      setFormLoading(true);
      await walletsApi.create(data);
      toast.success(AR.messages.walletCreated);
      setIsModalOpen(false);
      fetchWallets();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : AR.messages.error);
      throw error;
    } finally {
      setFormLoading(false);
    }
  };

  const columns = [
    {
      key: 'wallet_name',
      header: AR.wallets.walletName,
      sortable: true,
      render: (wallet: Wallet) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <WalletIcon className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{wallet.wallet_name}</div>
            <div className="text-sm text-gray-500" dir="ltr">
              {formatPhone(wallet.phone_number)}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'initial_balance',
      header: AR.wallets.initialBalance,
      sortable: true,
      render: (wallet: Wallet) => (
        <span className="text-gray-600">
          {formatCurrency(wallet.initial_balance)} ج.م
        </span>
      ),
    },
    {
      key: 'current_balance',
      header: AR.wallets.currentBalance,
      sortable: true,
      render: (wallet: Wallet) => (
        <span className={`font-semibold ${wallet.current_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatCurrency(wallet.current_balance)} ج.م
        </span>
      ),
    },
    {
      key: 'is_active',
      header: AR.wallets.isActive,
      render: (wallet: Wallet) => (
        <Badge variant={wallet.is_active ? 'success' : 'gray'}>
          {wallet.is_active ? 'نشطة' : 'غير نشطة'}
        </Badge>
      ),
    },
    {
      key: 'notes',
      header: AR.wallets.notes,
      render: (wallet: Wallet) => (
        <span className="text-gray-500 text-sm truncate max-w-xs block">
          {wallet.notes || '-'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: AR.dates.createdAt,
      sortable: true,
      render: (wallet: Wallet) => (
        <span className="text-gray-500 text-sm">
          {formatDateTime(wallet.created_at)}
        </span>
      ),
    },
  ];

  // Calculate totals
  const totalBalance = wallets.reduce((sum, w) => sum + (w.current_balance || 0), 0);
  const activeCount = wallets.filter((w) => w.is_active).length;

  return (
    <div>
      <Header
        title={AR.wallets.title}
        subtitle={`${wallets.length} ${AR.wallets.wallet}`}
        action={{
          label: AR.wallets.addWallet,
          onClick: () => setIsModalOpen(true),
        }}
      />

      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card">
            <div className="text-sm text-gray-500">إجمالي المحافظ</div>
            <div className="text-2xl font-bold text-gray-900">{wallets.length}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500">المحافظ النشطة</div>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500">{AR.wallets.totalBalance}</div>
            <div className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalBalance)} ج.م
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <LoadingSpinner />
        ) : wallets.length === 0 ? (
          <EmptyState
            title={AR.wallets.noWallets}
            description="ابدأ بإضافة محفظة جديدة لتتبع أرصدتك ومعاملاتك"
            icon={<WalletIcon className="w-full h-full" />}
            action={{
              label: AR.wallets.addWallet,
              onClick: () => setIsModalOpen(true),
            }}
          />
        ) : (
          <div className="card p-0 overflow-hidden">
            <DataTable
              columns={columns}
              data={wallets}
              keyField="wallet_id"
            />
          </div>
        )}
      </div>

      {/* Add Wallet Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={AR.wallets.addWallet}
        size="md"
      >
        <WalletForm
          onSubmit={handleCreate}
          onCancel={() => setIsModalOpen(false)}
          loading={formLoading}
        />
      </Modal>
    </div>
  );
}

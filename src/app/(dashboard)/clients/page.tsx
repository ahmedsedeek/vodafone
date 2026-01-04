'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { PlusIcon, UsersIcon, PhoneIcon } from '@heroicons/react/24/outline';
import Header from '@/components/layout/Header';
import { DataTable, Modal, Badge, LoadingSpinner, EmptyState } from '@/components/ui';
import { ClientForm } from '@/components/forms';
import { AR } from '@/lib/constants';
import { clientsApi } from '@/lib/api';
import { Client, CreateClientInput } from '@/types';
import { formatCurrency, formatPhone, formatDateTime } from '@/lib/utils';

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchClients = async () => {
    try {
      setLoading(true);
      const data = await clientsApi.getAll();
      setClients(data);
    } catch (error) {
      toast.error(AR.messages.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreate = async (data: CreateClientInput) => {
    try {
      setFormLoading(true);
      await clientsApi.create(data);
      toast.success(AR.messages.clientCreated);
      setIsModalOpen(false);
      fetchClients();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : AR.messages.error);
      throw error;
    } finally {
      setFormLoading(false);
    }
  };

  const handleRowClick = (client: Client) => {
    router.push(`/clients/${client.client_id}`);
  };

  // Filter clients by search term
  const filteredClients = clients.filter((client) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      client.client_name.toLowerCase().includes(term) ||
      client.phones?.some((p) => p.phone_number.includes(term)) ||
      client.national_id?.includes(term)
    );
  });

  const columns = [
    {
      key: 'client_name',
      header: AR.clients.clientName,
      sortable: true,
      render: (client: Client) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <UsersIcon className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">{client.client_name}</div>
            {client.phones && client.phones.length > 0 && (
              <div className="flex items-center gap-1 text-sm text-gray-500" dir="ltr">
                <PhoneIcon className="w-3 h-3" />
                {formatPhone(client.phones[0].phone_number)}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'phones',
      header: AR.clients.phones,
      render: (client: Client) => (
        <div className="flex flex-wrap gap-1">
          {client.phones && client.phones.length > 0 ? (
            client.phones.map((p) => (
              <Badge key={p.phone_id} variant="gray">
                {formatPhone(p.phone_number)}
              </Badge>
            ))
          ) : (
            <span className="text-gray-400">-</span>
          )}
        </div>
      ),
    },
    {
      key: 'total_debt',
      header: AR.clients.totalDebt,
      sortable: true,
      render: (client: Client) => (
        <span
          className={`font-semibold ${
            client.total_debt > 0 ? 'text-red-600' : 'text-green-600'
          }`}
        >
          {formatCurrency(client.total_debt)} ج.م
        </span>
      ),
    },
    {
      key: 'is_active',
      header: AR.clients.isActive,
      render: (client: Client) => (
        <Badge variant={client.is_active ? 'success' : 'gray'}>
          {client.is_active ? 'نشط' : 'غير نشط'}
        </Badge>
      ),
    },
    {
      key: 'address',
      header: AR.clients.address,
      render: (client: Client) => (
        <span className="text-gray-500 text-sm truncate max-w-xs block">
          {client.address || '-'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: AR.dates.createdAt,
      sortable: true,
      render: (client: Client) => (
        <span className="text-gray-500 text-sm">
          {formatDateTime(client.created_at)}
        </span>
      ),
    },
  ];

  // Calculate totals
  const totalDebt = clients.reduce((sum, c) => sum + (c.total_debt || 0), 0);
  const clientsWithDebt = clients.filter((c) => c.total_debt > 0).length;

  return (
    <div>
      <Header
        title={AR.clients.title}
        subtitle={`${clients.length} ${AR.clients.client}`}
        action={{
          label: AR.clients.addClient,
          onClick: () => setIsModalOpen(true),
        }}
      />

      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="card">
            <div className="text-sm text-gray-500">إجمالي العملاء</div>
            <div className="text-2xl font-bold text-gray-900">{clients.length}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500">عملاء عليهم ديون</div>
            <div className="text-2xl font-bold text-yellow-600">{clientsWithDebt}</div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500">{AR.clients.totalDebt}</div>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalDebt)} ج.م
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="بحث باسم العميل أو رقم الهاتف..."
            className="form-input max-w-md"
          />
        </div>

        {/* Table */}
        {loading ? (
          <LoadingSpinner />
        ) : clients.length === 0 ? (
          <EmptyState
            title={AR.clients.noClients}
            description="ابدأ بإضافة عميل جديد لتتبع معاملاتهم وديونهم"
            icon={<UsersIcon className="w-full h-full" />}
            action={{
              label: AR.clients.addClient,
              onClick: () => setIsModalOpen(true),
            }}
          />
        ) : (
          <div className="card p-0 overflow-hidden">
            <DataTable
              columns={columns}
              data={filteredClients}
              keyField="client_id"
              onRowClick={handleRowClick}
              emptyMessage="لا يوجد عملاء مطابقين للبحث"
            />
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={AR.clients.addClient}
        size="md"
      >
        <ClientForm
          onSubmit={handleCreate}
          onCancel={() => setIsModalOpen(false)}
          loading={formLoading}
        />
      </Modal>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { PlusIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import Header from '@/components/layout/Header';
import { DataTable, Modal, Badge, LoadingSpinner, EmptyState, DateRangePicker } from '@/components/ui';
import { PaymentForm } from '@/components/forms';
import { AR } from '@/lib/constants';
import { paymentsApi, clientsApi } from '@/lib/api';
import { Payment, Client, CreatePaymentInput } from '@/types';
import { formatCurrency, formatDate, getMonthStart, todayDate } from '@/lib/utils';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Filters
  const [dateFrom, setDateFrom] = useState(getMonthStart());
  const [dateTo, setDateTo] = useState(todayDate());
  const [selectedClientId, setSelectedClientId] = useState<string>('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [paymentData, clientData] = await Promise.all([
        paymentsApi.getAll({
          from: dateFrom,
          to: dateTo,
          client_id: selectedClientId || undefined,
        }),
        clientsApi.getAll(),
      ]);
      setPayments(paymentData);
      setClients(clientData);
    } catch (error) {
      toast.error(AR.messages.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo, selectedClientId]);

  const handleCreate = async (data: CreatePaymentInput) => {
    try {
      setFormLoading(true);
      const result = await paymentsApi.create(data);

      if (result.unallocated > 0) {
        toast.success(
          `تم تسجيل ${formatCurrency(result.totalAllocated)} ج.م. متبقي ${formatCurrency(result.unallocated)} ج.م لم يُخصص (لا يوجد ديون كافية)`
        );
      } else {
        toast.success(AR.messages.paymentRecorded);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : AR.messages.error);
      throw error;
    } finally {
      setFormLoading(false);
    }
  };

  const columns = [
    {
      key: 'payment_date',
      header: AR.payments.paymentDate,
      sortable: true,
      render: (p: Payment) => (
        <span className="text-gray-600">{formatDate(p.payment_date, 'dd/MM/yyyy')}</span>
      ),
    },
    {
      key: 'client_name',
      header: AR.clients.client,
      render: (p: Payment) => (
        <span className="font-medium text-gray-900">{p.client_name || '-'}</span>
      ),
    },
    {
      key: 'amount',
      header: AR.payments.amount,
      sortable: true,
      render: (p: Payment) => (
        <span className="font-bold text-green-600">{formatCurrency(p.amount)} ج.م</span>
      ),
    },
    {
      key: 'payment_method',
      header: AR.payments.paymentMethod,
      render: (p: Payment) => (
        <Badge variant="gray">{AR.payments.methods[p.payment_method]}</Badge>
      ),
    },
    {
      key: 'notes',
      header: AR.payments.notes,
      render: (p: Payment) => (
        <span className="text-gray-500 text-sm truncate max-w-xs block">
          {p.notes || '-'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: AR.dates.createdAt,
      render: (p: Payment) => (
        <span className="text-gray-500 text-sm">
          {formatDate(p.created_at, 'dd/MM/yyyy HH:mm')}
        </span>
      ),
    },
  ];

  // Calculate totals
  const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const paymentsByMethod = {
    cash: payments.filter((p) => p.payment_method === 'cash').reduce((s, p) => s + p.amount, 0),
    vc_transfer: payments.filter((p) => p.payment_method === 'vc_transfer').reduce((s, p) => s + p.amount, 0),
    bank: payments.filter((p) => p.payment_method === 'bank').reduce((s, p) => s + p.amount, 0),
  };

  // Clients with debt for the form
  const clientsWithDebt = clients.filter((c) => c.total_debt > 0);

  return (
    <div>
      <Header
        title={AR.payments.title}
        subtitle={`${payments.length} ${AR.payments.payment}`}
        action={{
          label: AR.payments.addPayment,
          onClick: () => setIsModalOpen(true),
        }}
      />

      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="text-sm text-gray-500">إجمالي المدفوعات</div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalPayments)} ج.م
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500">{AR.payments.methods.cash}</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(paymentsByMethod.cash)} ج.م
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500">{AR.payments.methods.vc_transfer}</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(paymentsByMethod.vc_transfer)} ج.م
            </div>
          </div>
          <div className="card">
            <div className="text-sm text-gray-500">{AR.payments.methods.bank}</div>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(paymentsByMethod.bank)} ج.م
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onChange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
            }}
          />
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">{AR.clients.client}:</label>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="form-select w-48"
            >
              <option value="">جميع العملاء</option>
              {clients.map((c) => (
                <option key={c.client_id} value={c.client_id}>
                  {c.client_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Info about clients with debt */}
        {clientsWithDebt.length > 0 && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-yellow-800">
                يوجد {clientsWithDebt.length} عميل عليهم ديون مستحقة
              </span>
              <button
                onClick={() => setIsModalOpen(true)}
                className="btn btn-sm btn-success"
              >
                <BanknotesIcon className="w-4 h-4 ml-1" />
                تسجيل دفعة
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <LoadingSpinner />
        ) : payments.length === 0 ? (
          <EmptyState
            title={AR.payments.noPayments}
            description="لا توجد مدفوعات في الفترة المحددة"
            icon={<BanknotesIcon className="w-full h-full" />}
            action={
              clientsWithDebt.length > 0
                ? {
                    label: AR.payments.addPayment,
                    onClick: () => setIsModalOpen(true),
                  }
                : undefined
            }
          />
        ) : (
          <div className="card p-0 overflow-hidden">
            <DataTable
              columns={columns}
              data={payments}
              keyField="payment_id"
            />
          </div>
        )}
      </div>

      {/* Add Payment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={AR.payments.addPayment}
        size="md"
      >
        {clientsWithDebt.length === 0 ? (
          <div className="text-center py-8">
            <BanknotesIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">لا يوجد عملاء عليهم ديون مستحقة</p>
            <button
              onClick={() => setIsModalOpen(false)}
              className="btn btn-secondary mt-4"
            >
              {AR.actions.close}
            </button>
          </div>
        ) : (
          <PaymentForm
            clients={clients}
            onSubmit={handleCreate}
            onCancel={() => setIsModalOpen(false)}
            loading={formLoading}
          />
        )}
      </Modal>
    </div>
  );
}

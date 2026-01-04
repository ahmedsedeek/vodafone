'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ArrowRightIcon,
  PhoneIcon,
  MapPinIcon,
  IdentificationIcon,
  DocumentArrowDownIcon,
  PlusIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import Header from '@/components/layout/Header';
import { DataTable, Badge, LoadingSpinner, Modal, DateRangePicker } from '@/components/ui';
import { PaymentForm } from '@/components/forms';
import { AR, PAYMENT_STATUS_COLORS, TRANSACTION_TYPE_COLORS } from '@/lib/constants';
import { clientsApi, transactionsApi, paymentsApi } from '@/lib/api';
import { Client, Transaction, Payment, CreatePaymentInput, ClientStatement } from '@/types';
import { formatCurrency, formatPhone, formatDateTime, formatDate, getMonthStart, todayDate } from '@/lib/utils';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Statement date range
  const [statementFrom, setStatementFrom] = useState(getMonthStart());
  const [statementTo, setStatementTo] = useState(todayDate());
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clientData, txData, paymentData] = await Promise.all([
        clientsApi.getById(clientId),
        transactionsApi.getAll({ client_id: clientId }),
        paymentsApi.getAll({ client_id: clientId }),
      ]);
      setClient(clientData);
      setTransactions(txData);
      setPayments(paymentData);
    } catch (error) {
      toast.error(AR.messages.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [clientId]);

  const handlePayment = async (data: CreatePaymentInput) => {
    try {
      setFormLoading(true);
      await paymentsApi.create(data);
      toast.success(AR.messages.paymentRecorded);
      setIsPaymentModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : AR.messages.error);
      throw error;
    } finally {
      setFormLoading(false);
    }
  };

  const handleGeneratePdf = async () => {
    try {
      setGeneratingPdf(true);
      const statement = await clientsApi.getStatement(clientId, statementFrom, statementTo);

      // Generate PDF client-side
      const { generateStatementPdf } = await import('@/lib/pdf-generator');
      await generateStatementPdf(statement);

      toast.success(AR.messages.pdfGenerated);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : AR.messages.error);
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSpinner />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">العميل غير موجود</p>
          <button onClick={() => router.back()} className="btn btn-secondary mt-4">
            رجوع
          </button>
        </div>
      </div>
    );
  }

  const transactionColumns = [
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
        <Badge variant="info" className={TRANSACTION_TYPE_COLORS[tx.transaction_type]}>
          {AR.transactions.types[tx.transaction_type]}
        </Badge>
      ),
    },
    {
      key: 'vc_amount',
      header: AR.transactions.vcAmount,
      render: (tx: Transaction) => (
        <span className="font-medium">{formatCurrency(tx.vc_amount)} ج.م</span>
      ),
    },
    {
      key: 'cash_amount',
      header: AR.transactions.cashAmount,
      render: (tx: Transaction) => (
        <span className="font-medium">{formatCurrency(tx.cash_amount)} ج.م</span>
      ),
    },
    {
      key: 'amount_due',
      header: AR.transactions.amountDue,
      render: (tx: Transaction) => (
        <span className={tx.amount_due > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
          {formatCurrency(tx.amount_due)} ج.م
        </span>
      ),
    },
    {
      key: 'payment_status',
      header: AR.transactions.paymentStatus,
      render: (tx: Transaction) => (
        <Badge
          variant={
            tx.payment_status === 'paid'
              ? 'success'
              : tx.payment_status === 'partial'
              ? 'warning'
              : 'danger'
          }
        >
          {AR.transactions.status[tx.payment_status]}
        </Badge>
      ),
    },
  ];

  const paymentColumns = [
    {
      key: 'payment_date',
      header: AR.payments.paymentDate,
      render: (p: Payment) => (
        <span className="text-gray-600">{formatDate(p.payment_date, 'dd/MM/yyyy')}</span>
      ),
    },
    {
      key: 'amount',
      header: AR.payments.amount,
      render: (p: Payment) => (
        <span className="font-medium text-green-600">{formatCurrency(p.amount)} ج.م</span>
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
        <span className="text-gray-500 text-sm">{p.notes || '-'}</span>
      ),
    },
  ];

  return (
    <div>
      <Header
        title={client.client_name}
        subtitle={`${AR.clients.client} - ${client.is_active ? 'نشط' : 'غير نشط'}`}
      />

      <div className="p-6 space-y-6">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowRightIcon className="w-4 h-4" />
          <span>رجوع للعملاء</span>
        </button>

        {/* Client Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Contact Info */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">بيانات الاتصال</h3>
            <div className="space-y-3">
              {client.phones && client.phones.map((phone) => (
                <div key={phone.phone_id} className="flex items-center gap-2 text-gray-600">
                  <PhoneIcon className="w-4 h-4" />
                  <span dir="ltr">{formatPhone(phone.phone_number)}</span>
                  {phone.is_primary && (
                    <Badge variant="success" size="sm">رئيسي</Badge>
                  )}
                </div>
              ))}
              {client.address && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPinIcon className="w-4 h-4" />
                  <span>{client.address}</span>
                </div>
              )}
              {client.national_id && (
                <div className="flex items-center gap-2 text-gray-600">
                  <IdentificationIcon className="w-4 h-4" />
                  <span dir="ltr">{client.national_id}</span>
                </div>
              )}
            </div>
          </div>

          {/* Debt Summary */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">ملخص الحساب</h3>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">
                {formatCurrency(client.total_debt)} ج.م
              </div>
              <div className="text-sm text-gray-500">إجمالي الدين المستحق</div>
              {client.total_debt > 0 && (
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="btn btn-success mt-4 w-full"
                >
                  <BanknotesIcon className="w-5 h-5 ml-2" />
                  {AR.payments.addPayment}
                </button>
              )}
            </div>
          </div>

          {/* Statement Export */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">{AR.clients.statement}</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">{AR.reports.from}</label>
                  <input
                    type="date"
                    value={statementFrom}
                    onChange={(e) => setStatementFrom(e.target.value)}
                    className="form-input text-sm"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">{AR.reports.to}</label>
                  <input
                    type="date"
                    value={statementTo}
                    onChange={(e) => setStatementTo(e.target.value)}
                    className="form-input text-sm"
                    dir="ltr"
                  />
                </div>
              </div>
              <button
                onClick={handleGeneratePdf}
                disabled={generatingPdf}
                className="btn btn-primary w-full"
              >
                <DocumentArrowDownIcon className="w-5 h-5 ml-2" />
                {generatingPdf ? 'جاري الإنشاء...' : AR.clients.downloadStatement}
              </button>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{AR.transactions.title}</h3>
            <span className="text-sm text-gray-500">{transactions.length} معاملة</span>
          </div>
          {transactions.length > 0 ? (
            <DataTable
              columns={transactionColumns}
              data={transactions}
              keyField="transaction_id"
            />
          ) : (
            <p className="text-gray-500 text-center py-8">{AR.transactions.noTransactions}</p>
          )}
        </div>

        {/* Payments */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">{AR.payments.title}</h3>
            <span className="text-sm text-gray-500">{payments.length} دفعة</span>
          </div>
          {payments.length > 0 ? (
            <DataTable
              columns={paymentColumns}
              data={payments}
              keyField="payment_id"
            />
          ) : (
            <p className="text-gray-500 text-center py-8">{AR.payments.noPayments}</p>
          )}
        </div>

        {/* Notes */}
        {client.notes && (
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-2">{AR.wallets.notes}</h3>
            <p className="text-gray-600">{client.notes}</p>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={AR.payments.addPayment}
        size="md"
      >
        <PaymentForm
          clients={[client]}
          preselectedClientId={client.client_id}
          onSubmit={handlePayment}
          onCancel={() => setIsPaymentModalOpen(false)}
          loading={formLoading}
        />
      </Modal>
    </div>
  );
}

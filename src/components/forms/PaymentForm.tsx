'use client';

import { useState } from 'react';
import { AR } from '@/lib/constants';
import { CreatePaymentInput, Client, PaymentMethod } from '@/types';
import { todayDate, formatCurrency } from '@/lib/utils';

interface PaymentFormProps {
  clients: Client[];
  preselectedClientId?: string;
  onSubmit: (data: CreatePaymentInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function PaymentForm({
  clients,
  preselectedClientId,
  onSubmit,
  onCancel,
  loading,
}: PaymentFormProps) {
  const [formData, setFormData] = useState<CreatePaymentInput>({
    client_id: preselectedClientId || '',
    amount: 0,
    payment_method: 'cash',
    notes: '',
    payment_date: todayDate(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedClient = clients.find((c) => c.client_id === formData.client_id);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.client_id) {
      newErrors.client_id = AR.validation.selectClient;
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = AR.validation.invalidAmount;
    }

    if (selectedClient && selectedClient.total_debt <= 0) {
      newErrors.client_id = AR.validation.noDebts;
    }

    if (selectedClient && formData.amount > selectedClient.total_debt) {
      newErrors.amount = AR.validation.amountExceedsDebt;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      await onSubmit(formData);
    } catch (error) {
      // Error handling is done in parent
    }
  };

  const paymentMethods: { value: PaymentMethod; label: string }[] = [
    { value: 'cash', label: AR.payments.methods.cash },
    { value: 'vc_transfer', label: AR.payments.methods.vc_transfer },
    { value: 'bank', label: AR.payments.methods.bank },
  ];

  // Filter clients with debt
  const clientsWithDebt = clients.filter((c) => c.total_debt > 0);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Client Selection */}
      <div className="form-group">
        <label className="form-label">{AR.clients.client} *</label>
        <select
          value={formData.client_id}
          onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
          className={`form-select ${errors.client_id ? 'border-red-500' : ''}`}
          disabled={!!preselectedClientId}
        >
          <option value="">{AR.placeholders.selectClient}</option>
          {clientsWithDebt.map((c) => (
            <option key={c.client_id} value={c.client_id}>
              {c.client_name} - دين: {formatCurrency(c.total_debt)} ج.م
            </option>
          ))}
        </select>
        {errors.client_id && <p className="form-error">{errors.client_id}</p>}
      </div>

      {/* Show client debt info */}
      {selectedClient && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-yellow-800">إجمالي الدين المستحق:</span>
            <span className="font-bold text-yellow-900">
              {formatCurrency(selectedClient.total_debt)} ج.م
            </span>
          </div>
          <p className="text-xs text-yellow-700 mt-2">{AR.payments.fifoNote}</p>
        </div>
      )}

      {/* Amount */}
      <div className="form-group">
        <label className="form-label">{AR.payments.amount} *</label>
        <input
          type="number"
          min="0"
          max={selectedClient?.total_debt || undefined}
          step="0.01"
          value={formData.amount || ''}
          onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
          className={`form-input ${errors.amount ? 'border-red-500' : ''}`}
          placeholder={AR.placeholders.enterAmount}
          dir="ltr"
        />
        {errors.amount && <p className="form-error">{errors.amount}</p>}
        {selectedClient && (
          <button
            type="button"
            onClick={() => setFormData({ ...formData, amount: selectedClient.total_debt })}
            className="text-sm text-red-600 hover:underline mt-1"
          >
            سداد كامل الدين
          </button>
        )}
      </div>

      {/* Payment Method */}
      <div className="form-group">
        <label className="form-label">{AR.payments.paymentMethod}</label>
        <div className="flex items-center gap-4">
          {paymentMethods.map((method) => (
            <label key={method.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="payment_method"
                value={method.value}
                checked={formData.payment_method === method.value}
                onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as PaymentMethod })}
                className="w-4 h-4 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-gray-700">{method.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Date */}
      <div className="form-group">
        <label className="form-label">{AR.payments.paymentDate}</label>
        <input
          type="date"
          value={formData.payment_date}
          onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
          className="form-input"
          dir="ltr"
        />
      </div>

      {/* Notes */}
      <div className="form-group">
        <label className="form-label">{AR.payments.notes}</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="form-input"
          rows={2}
          placeholder={AR.placeholders.enterNotes}
        />
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
          disabled={loading}
        >
          {AR.actions.cancel}
        </button>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? AR.messages.saving : AR.actions.save}
        </button>
      </div>
    </form>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { AR } from '@/lib/constants';
import { CreateTransactionInput, Wallet, Client, TransactionType } from '@/types';
import { isValidEgyptianPhone, todayDate } from '@/lib/utils';

interface TransactionFormProps {
  wallets: Wallet[];
  clients: Client[];
  onSubmit: (data: CreateTransactionInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function TransactionForm({
  wallets,
  clients,
  onSubmit,
  onCancel,
  loading,
}: TransactionFormProps) {
  const [formData, setFormData] = useState<CreateTransactionInput>({
    wallet_id: '',
    client_id: '',
    transaction_type: 'TRANSFER_OUT',
    vc_amount: 0,
    cash_amount: 0,
    fee_amount: 0,
    amount_paid: 0,
    recipient_phone: '',
    description: '',
    transaction_date: todayDate(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [payNow, setPayNow] = useState(true);

  // Auto-calculate amounts
  useEffect(() => {
    const vcAmount = formData.vc_amount || 0;
    const feeAmount = formData.fee_amount || 0;

    if (formData.transaction_type === 'TRANSFER_OUT') {
      // Client pays: VC + fee
      setFormData((prev) => ({
        ...prev,
        cash_amount: vcAmount + feeAmount,
        amount_paid: payNow ? vcAmount + feeAmount : prev.amount_paid,
      }));
    } else if (formData.transaction_type === 'TRANSFER_IN') {
      // You give: VC - fee
      setFormData((prev) => ({
        ...prev,
        cash_amount: Math.max(0, vcAmount - feeAmount),
        amount_paid: payNow ? Math.max(0, vcAmount - feeAmount) : prev.amount_paid,
      }));
    } else {
      // DEPOSIT / WITHDRAW
      setFormData((prev) => ({
        ...prev,
        cash_amount: vcAmount,
        fee_amount: 0,
        amount_paid: vcAmount,
      }));
    }
  }, [formData.vc_amount, formData.fee_amount, formData.transaction_type, payNow]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.wallet_id) {
      newErrors.wallet_id = AR.validation.selectWallet;
    }

    if (!formData.transaction_type) {
      newErrors.transaction_type = AR.validation.selectType;
    }

    if (!formData.vc_amount || formData.vc_amount <= 0) {
      newErrors.vc_amount = AR.validation.invalidAmount;
    }

    if (
      formData.recipient_phone &&
      !isValidEgyptianPhone(formData.recipient_phone)
    ) {
      newErrors.recipient_phone = AR.validation.invalidPhone;
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

  const transactionTypes: { value: TransactionType; label: string; desc: string }[] = [
    { value: 'TRANSFER_OUT', label: AR.transactions.types.TRANSFER_OUT, desc: AR.transactions.typeDescriptions.TRANSFER_OUT },
    { value: 'TRANSFER_IN', label: AR.transactions.types.TRANSFER_IN, desc: AR.transactions.typeDescriptions.TRANSFER_IN },
    { value: 'DEPOSIT', label: AR.transactions.types.DEPOSIT, desc: AR.transactions.typeDescriptions.DEPOSIT },
    { value: 'WITHDRAW', label: AR.transactions.types.WITHDRAW, desc: AR.transactions.typeDescriptions.WITHDRAW },
  ];

  const isTransferType = formData.transaction_type === 'TRANSFER_OUT' || formData.transaction_type === 'TRANSFER_IN';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Transaction Type */}
      <div className="form-group">
        <label className="form-label">{AR.transactions.transactionType} *</label>
        <div className="grid grid-cols-2 gap-2">
          {transactionTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => setFormData({ ...formData, transaction_type: type.value })}
              className={`p-3 rounded-lg border-2 text-right transition-all ${
                formData.transaction_type === type.value
                  ? 'border-red-600 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium text-sm">{type.label}</div>
              <div className="text-xs text-gray-500 mt-1">{type.desc}</div>
            </button>
          ))}
        </div>
        {errors.transaction_type && <p className="form-error">{errors.transaction_type}</p>}
      </div>

      {/* Wallet */}
      <div className="form-group">
        <label className="form-label">{AR.wallets.wallet} *</label>
        <select
          value={formData.wallet_id}
          onChange={(e) => setFormData({ ...formData, wallet_id: e.target.value })}
          className={`form-select ${errors.wallet_id ? 'border-red-500' : ''}`}
        >
          <option value="">{AR.placeholders.selectWallet}</option>
          {wallets.map((w) => (
            <option key={w.wallet_id} value={w.wallet_id}>
              {w.wallet_name} ({w.phone_number})
            </option>
          ))}
        </select>
        {errors.wallet_id && <p className="form-error">{errors.wallet_id}</p>}
      </div>

      {/* Client (optional for transfers) */}
      {isTransferType && (
        <div className="form-group">
          <label className="form-label">{AR.clients.client}</label>
          <select
            value={formData.client_id}
            onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
            className="form-select"
          >
            <option value="">{AR.placeholders.selectClient}</option>
            {clients.map((c) => (
              <option key={c.client_id} value={c.client_id}>
                {c.client_name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Amounts */}
      <div className="grid grid-cols-2 gap-4">
        <div className="form-group">
          <label className="form-label">{AR.transactions.vcAmount} *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={formData.vc_amount || ''}
            onChange={(e) => setFormData({ ...formData, vc_amount: parseFloat(e.target.value) || 0 })}
            className={`form-input ${errors.vc_amount ? 'border-red-500' : ''}`}
            placeholder={AR.placeholders.enterAmount}
            dir="ltr"
          />
          {errors.vc_amount && <p className="form-error">{errors.vc_amount}</p>}
        </div>

        {isTransferType && (
          <div className="form-group">
            <label className="form-label">{AR.transactions.feeAmount}</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.fee_amount || ''}
              onChange={(e) => setFormData({ ...formData, fee_amount: parseFloat(e.target.value) || 0 })}
              className="form-input"
              placeholder="0"
              dir="ltr"
            />
          </div>
        )}
      </div>

      {/* Calculated Cash Amount */}
      {isTransferType && (
        <div className="form-group">
          <label className="form-label">{AR.transactions.cashAmount}</label>
          <input
            type="number"
            value={formData.cash_amount || 0}
            className="form-input bg-gray-100"
            disabled
            dir="ltr"
          />
          <p className="form-hint">
            {formData.transaction_type === 'TRANSFER_OUT'
              ? 'المبلغ الذي يدفعه العميل = مبلغ VC + العمولة'
              : 'المبلغ الذي تعطيه للعميل = مبلغ VC - العمولة'}
          </p>
        </div>
      )}

      {/* Payment Now */}
      {isTransferType && formData.client_id && (
        <div className="form-group">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={payNow}
              onChange={(e) => setPayNow(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">العميل دفع المبلغ كاملاً الآن</span>
          </label>
          {!payNow && (
            <div className="mt-3">
              <label className="form-label">{AR.transactions.amountPaid}</label>
              <input
                type="number"
                min="0"
                max={formData.cash_amount}
                step="0.01"
                value={formData.amount_paid || ''}
                onChange={(e) => setFormData({ ...formData, amount_paid: parseFloat(e.target.value) || 0 })}
                className="form-input"
                dir="ltr"
              />
            </div>
          )}
        </div>
      )}

      {/* Recipient Phone */}
      {isTransferType && (
        <div className="form-group">
          <label className="form-label">{AR.transactions.recipientPhone}</label>
          <input
            type="tel"
            value={formData.recipient_phone}
            onChange={(e) => setFormData({ ...formData, recipient_phone: e.target.value })}
            className={`form-input ${errors.recipient_phone ? 'border-red-500' : ''}`}
            placeholder="01xxxxxxxxx"
            dir="ltr"
          />
          {errors.recipient_phone && <p className="form-error">{errors.recipient_phone}</p>}
        </div>
      )}

      {/* Date */}
      <div className="form-group">
        <label className="form-label">{AR.transactions.transactionDate}</label>
        <input
          type="date"
          value={formData.transaction_date}
          onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
          className="form-input"
          dir="ltr"
        />
      </div>

      {/* Description */}
      <div className="form-group">
        <label className="form-label">{AR.transactions.description}</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="form-input"
          rows={2}
          placeholder={AR.placeholders.enterDescription}
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

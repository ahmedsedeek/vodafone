'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { AR } from '@/lib/constants';
import { CreateWalletInput } from '@/types';
import { isValidEgyptianPhone } from '@/lib/utils';

interface WalletFormProps {
  onSubmit: (data: CreateWalletInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function WalletForm({ onSubmit, onCancel, loading }: WalletFormProps) {
  const [formData, setFormData] = useState<CreateWalletInput>({
    wallet_name: '',
    phone_number: '',
    initial_balance: 0,
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.wallet_name.trim()) {
      newErrors.wallet_name = AR.validation.required;
    }

    if (!formData.phone_number) {
      newErrors.phone_number = AR.validation.required;
    } else if (!isValidEgyptianPhone(formData.phone_number)) {
      newErrors.phone_number = AR.validation.invalidPhone;
    }

    if (formData.initial_balance !== undefined && formData.initial_balance < 0) {
      newErrors.initial_balance = AR.validation.invalidAmount;
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="form-group">
        <label className="form-label">{AR.wallets.walletName} *</label>
        <input
          type="text"
          value={formData.wallet_name}
          onChange={(e) => setFormData({ ...formData, wallet_name: e.target.value })}
          className={`form-input ${errors.wallet_name ? 'border-red-500' : ''}`}
          placeholder={AR.placeholders.enterName}
        />
        {errors.wallet_name && <p className="form-error">{errors.wallet_name}</p>}
      </div>

      <div className="form-group">
        <label className="form-label">{AR.wallets.phoneNumber} *</label>
        <input
          type="tel"
          value={formData.phone_number}
          onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
          className={`form-input ${errors.phone_number ? 'border-red-500' : ''}`}
          placeholder="01xxxxxxxxx"
          dir="ltr"
        />
        {errors.phone_number && <p className="form-error">{errors.phone_number}</p>}
      </div>

      <div className="form-group">
        <label className="form-label">{AR.wallets.initialBalance}</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={formData.initial_balance}
          onChange={(e) => setFormData({ ...formData, initial_balance: parseFloat(e.target.value) || 0 })}
          className={`form-input ${errors.initial_balance ? 'border-red-500' : ''}`}
          dir="ltr"
        />
        {errors.initial_balance && <p className="form-error">{errors.initial_balance}</p>}
      </div>

      <div className="form-group">
        <label className="form-label">{AR.wallets.notes}</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="form-input"
          rows={3}
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

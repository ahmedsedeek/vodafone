'use client';

import { useState } from 'react';
import { AR } from '@/lib/constants';
import { CreateClientInput } from '@/types';
import { isValidEgyptianPhone } from '@/lib/utils';

interface ClientFormProps {
  onSubmit: (data: CreateClientInput) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function ClientForm({ onSubmit, onCancel, loading }: ClientFormProps) {
  const [formData, setFormData] = useState<CreateClientInput>({
    client_name: '',
    phone_number: '',
    national_id: '',
    address: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.client_name.trim()) {
      newErrors.client_name = AR.validation.required;
    }

    if (formData.phone_number && !isValidEgyptianPhone(formData.phone_number)) {
      newErrors.phone_number = AR.validation.invalidPhone;
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
        <label className="form-label">{AR.clients.clientName} *</label>
        <input
          type="text"
          value={formData.client_name}
          onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
          className={`form-input ${errors.client_name ? 'border-red-500' : ''}`}
          placeholder={AR.placeholders.enterName}
        />
        {errors.client_name && <p className="form-error">{errors.client_name}</p>}
      </div>

      <div className="form-group">
        <label className="form-label">{AR.clients.phones}</label>
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
        <label className="form-label">{AR.clients.nationalId}</label>
        <input
          type="text"
          value={formData.national_id}
          onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
          className="form-input"
          placeholder="الرقم القومي (اختياري)"
          dir="ltr"
        />
      </div>

      <div className="form-group">
        <label className="form-label">{AR.clients.address}</label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          className="form-input"
          placeholder="العنوان (اختياري)"
        />
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

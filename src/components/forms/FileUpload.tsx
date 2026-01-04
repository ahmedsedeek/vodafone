'use client';

import { useState, useRef } from 'react';
import { PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { AR, MAX_FILE_SIZE, ALLOWED_FILE_TYPES } from '@/lib/constants';

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  loading?: boolean;
  currentUrl?: string;
}

export default function FileUpload({ onUpload, loading, currentUrl }: FileUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): boolean => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      setError('نوع الملف غير مدعوم. الأنواع المسموحة: JPEG, PNG, GIF, WebP');
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت');
      return false;
    }

    return true;
  };

  const handleFile = async (file: File) => {
    setError(null);

    if (!validateFile(file)) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل في رفع الملف');
      setPreview(null);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      await handleFile(file);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleFile(file);
    }
  };

  const clearFile = () => {
    setPreview(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="form-group">
      <label className="form-label">{AR.transactions.proof}</label>

      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-48 object-cover rounded-lg border border-gray-200"
          />
          <button
            type="button"
            onClick={clearFile}
            className="absolute top-2 left-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
            ${dragOver ? 'border-red-500 bg-red-50' : 'border-gray-300 hover:border-gray-400'}
            ${loading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          <PhotoIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            {loading ? 'جاري الرفع...' : 'اسحب الصورة هنا أو اضغط للاختيار'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            PNG, JPG, GIF, WebP حتى 5 ميجابايت
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_FILE_TYPES.join(',')}
        onChange={handleChange}
        className="hidden"
      />

      {error && <p className="form-error mt-2">{error}</p>}
    </div>
  );
}

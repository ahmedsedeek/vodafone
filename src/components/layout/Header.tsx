'use client';

import { useState } from 'react';
import { MagnifyingGlassIcon, BellIcon, PlusIcon } from '@heroicons/react/24/outline';
import { AR } from '@/lib/constants';

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function Header({ title, subtitle, action }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-4">
          {/* Search (optional) */}
          {/* <div className="relative">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={AR.placeholders.search}
              className="form-input pr-10 w-64"
            />
          </div> */}

          {/* Action button */}
          {action && (
            <button onClick={action.onClick} className="btn btn-primary">
              <PlusIcon className="w-5 h-5 ml-2" />
              {action.label}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

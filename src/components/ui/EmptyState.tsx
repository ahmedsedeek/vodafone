'use client';

import { FolderIcon, PlusIcon } from '@heroicons/react/24/outline';
import { AR } from '@/lib/constants';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        {icon || <FolderIcon className="w-full h-full" />}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {description && <p className="empty-state-description">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="btn btn-primary mt-4">
          <PlusIcon className="w-5 h-5 ml-2" />
          {action.label}
        </button>
      )}
    </div>
  );
}

import React from 'react';
import { PackageOpen } from 'lucide-react';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-zinc-50/60 rounded-lg border border-dashed border-zinc-200 ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 mb-3">
        {icon || <PackageOpen className="w-5 h-5 text-zinc-400" />}
      </div>
      <h4 className="text-sm font-medium text-zinc-800">{title}</h4>
      {description && <p className="text-xs text-zinc-500 mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

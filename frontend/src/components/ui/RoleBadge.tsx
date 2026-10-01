import React from 'react';
import type { UserRole } from '../../types/auth';

interface RoleBadgeProps {
  role: UserRole;
  className?: string;
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, className = '' }) => {
  const isManager = role === 'manager';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-md border tracking-wide uppercase transition-colors ${
        isManager
          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
          : 'bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-700'
      } ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${isManager ? 'bg-emerald-600' : 'bg-zinc-500'}`}
        aria-hidden="true"
      />
      <span>{isManager ? 'Manager' : 'Staff'}</span>
    </span>
  );
};

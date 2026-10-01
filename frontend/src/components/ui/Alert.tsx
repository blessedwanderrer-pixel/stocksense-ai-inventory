import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  onClose,
  className = '',
}) => {
  const variantStyles = {
    info: 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-950/30 dark:text-sky-200 dark:border-sky-800',
    success: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800',
    error: 'bg-red-50 text-red-900 border-red-200 dark:bg-red-950/30 dark:text-red-200 dark:border-red-800',
  };

  const icons = {
    info: <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
    error: <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />,
  };

  return (
    <div
      role="alert"
      className={`border rounded-lg p-3 text-sm flex gap-3 items-start ${variantStyles[variant]} ${className}`}
    >
      {icons[variant]}
      <div className="flex-1">
        {title && <h5 className="font-semibold mb-0.5">{title}</h5>}
        <div className="text-xs leading-relaxed">{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss alert"
          className="text-zinc-500 hover:text-zinc-700 transition-colors p-0.5"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

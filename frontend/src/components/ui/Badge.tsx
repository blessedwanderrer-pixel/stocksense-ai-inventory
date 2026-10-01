import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  className = '',
  children,
  ...props
}) => {
  const variantStyles = {
    neutral: 'bg-zinc-100 text-zinc-700 border-zinc-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-sky-50 text-sky-800 border-sky-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded-md ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};

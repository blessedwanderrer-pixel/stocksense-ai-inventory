import React, { forwardRef } from 'react';
import { Spinner } from './Spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled = false,
      leftIcon,
      rightIcon,
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer';

    const variantStyles = {
      primary:
        'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500 shadow-xs',
      secondary:
        'bg-zinc-800 text-white hover:bg-zinc-900 active:bg-black focus-visible:ring-zinc-600 shadow-xs',
      outline:
        'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 focus-visible:ring-emerald-500 shadow-2xs',
      ghost:
        'text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 focus-visible:ring-zinc-500',
      danger:
        'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500 shadow-xs',
    };

    const sizeStyles = {
      sm: 'text-xs px-2.5 py-1.5 rounded-md gap-1.5',
      md: 'text-sm px-4 py-2 rounded-lg gap-2',
      lg: 'text-base px-5 py-2.5 rounded-lg gap-2.5',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading && <Spinner size="sm" />}
        {!isLoading && leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
        <span>{children}</span>
        {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

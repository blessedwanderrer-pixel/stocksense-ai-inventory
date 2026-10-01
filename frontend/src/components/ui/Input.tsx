import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error = false, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full px-3 py-2 text-sm text-zinc-900 bg-white border rounded-lg transition-colors placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:bg-zinc-100 disabled:cursor-not-allowed ${
          error
            ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
            : 'border-zinc-300 focus:border-emerald-600 focus:ring-emerald-200'
        } ${className}`}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

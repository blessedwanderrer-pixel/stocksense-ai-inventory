import React, { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: boolean;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className = '', error = false, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    return (
      <div className="relative w-full">
        <input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          className={`w-full pl-3 pr-10 py-2 text-sm text-zinc-900 bg-white border rounded-lg transition-colors placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:bg-zinc-100 disabled:cursor-not-allowed ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
              : 'border-zinc-300 focus:border-emerald-600 focus:ring-emerald-200'
          } ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 focus:outline-none focus:text-zinc-700 transition-colors"
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

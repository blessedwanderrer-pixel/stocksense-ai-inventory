import React from 'react';

export interface FormFieldProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  required,
  error,
  hint,
  children,
  className = '',
}) => {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-zinc-700">
          {label}
          {required && <span className="ml-1 text-red-500" aria-hidden="true">*</span>}
        </label>
      </div>

      <div>{children}</div>

      {hint && !error && (
        <p id={hintId} className="text-xs text-zinc-500">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

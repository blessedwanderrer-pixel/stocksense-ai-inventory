import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { LoginForm } from '../features/auth/LoginForm';
import { validateRequiredConfig } from '../lib/supabase/config';
import { Alert } from '../components/ui/Alert';
import { Warehouse, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const configValidation = validateRequiredConfig();

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'manager') {
        navigate('/manager', { replace: true });
      } else if (user.role === 'staff') {
        navigate('/staff', { replace: true });
      }
    }
  }, [user, isLoading, navigate]);

  return (
    <div className="min-h-screen bg-zinc-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        {/* Brand Icon */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-lg mb-4">
          <Warehouse className="w-8 h-8" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
          StockSense
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Retail inventory intelligence & authoritative operations
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm border border-zinc-200/80 rounded-2xl sm:px-10">
          {!configValidation.valid && (
            <Alert
              variant="warning"
              title="Configuration Required"
              className="mb-6"
            >
              Supabase authentication credentials are required. Ensure{' '}
              <code className="bg-zinc-100 px-1 py-0.5 rounded text-[11px] font-mono">
                VITE_SUPABASE_URL
              </code>{' '}
              and{' '}
              <code className="bg-zinc-100 px-1 py-0.5 rounded text-[11px] font-mono">
                VITE_SUPABASE_PUBLISHABLE_KEY
              </code>{' '}
              are configured.
            </Alert>
          )}

          <div className="mb-6">
            <h2 className="text-base font-semibold text-zinc-900">
              Sign In
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Enter your credentials to access your authorized workspace.
            </p>
          </div>

          <LoginForm
            onSuccess={(role) => {
              if (role === 'manager') {
                navigate('/manager', { replace: true });
              } else {
                navigate('/staff', { replace: true });
              }
            }}
          />

          <div className="mt-6 pt-5 border-t border-zinc-100 flex items-center justify-center gap-2 text-xs text-zinc-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Authoritative backend role routing enforced</span>
          </div>
        </div>
      </div>
    </div>
  );
};

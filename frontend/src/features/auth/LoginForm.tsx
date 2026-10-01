import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PasswordInput } from '../../components/ui/PasswordInput';
import { FormField } from '../../components/ui/FormField';
import { Alert } from '../../components/ui/Alert';
import { Lock, LogIn } from 'lucide-react';

interface LoginFormProps {
  onSuccess?: (role: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const { login, isServiceUnavailable, isUnauthorizedProfile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFormError('Please enter your email address.');
      return;
    }
    if (!password) {
      setFormError('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const profile = await login(trimmedEmail, password);
      onSuccess?.(profile.role);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : 'Invalid credentials or login failed';
      setFormError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {isUnauthorizedProfile && (
        <Alert
          variant="error"
          title="Unauthorized StockSense Profile"
          className="mb-4"
        >
          Your account is authenticated, but does not have an authorized Manager or Staff role assigned in StockSense. Contact your administrator.
        </Alert>
      )}

      {isServiceUnavailable && !isUnauthorizedProfile && (
        <Alert
          variant="warning"
          title="Service Unavailable"
          className="mb-4"
        >
          The StockSense authentication service is currently unavailable. Please verify backend connectivity and try again.
        </Alert>
      )}

      {formError && !isUnauthorizedProfile && !isServiceUnavailable && (
        <Alert variant="error" title="Sign In Failed" className="mb-4">
          {formError}
        </Alert>
      )}

      <FormField id="email" label="Work Email" required error={undefined}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          required
        />
      </FormField>

      <FormField id="password" label="Password" required error={undefined}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isSubmitting}
          required
        />
      </FormField>

      <Button
        type="submit"
        variant="primary"
        size="md"
        className="w-full mt-2"
        isLoading={isSubmitting}
        leftIcon={<LogIn className="w-4 h-4" />}
      >
        Sign In to StockSense
      </Button>

      <p className="text-center text-xs text-zinc-500 pt-2">
        <Lock className="w-3.5 h-3.5 inline mr-1 text-zinc-400 -mt-0.5" />
        Role-authoritative access (Manager / Staff)
      </p>
    </form>
  );
};

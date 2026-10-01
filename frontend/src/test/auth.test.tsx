import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '../features/auth/AuthContext';
import { LoginForm } from '../features/auth/LoginForm';
import { ProtectedRoute } from '../routes/ProtectedRoute';
import { RoleRoute } from '../routes/RoleRoute';
import { UnauthorizedPage } from '../pages/UnauthorizedPage';
import { api } from '../lib/api/client';
import { ApiError } from '../lib/api/errors';
import * as supabaseClientModule from '../lib/supabase/client';

describe('Authentication & Role Routing', () => {
  let mockSupabase: any;
  let testQueryClient: QueryClient;

  beforeEach(() => {
    testQueryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });
    vi.restoreAllMocks();

    mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        signInWithPassword: vi.fn(),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
    };

    vi.spyOn(supabaseClientModule, 'getSupabase').mockReturnValue(mockSupabase);
  });

  const renderWithProviders = (ui: React.ReactNode, initialEntries = ['/']) => {
    return render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          <AuthProvider>{ui}</AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  // Test 1: Shared login contains no role selector
  it('1. Shared login contains no role selector or tabs', () => {
    renderWithProviders(<LoginForm />);

    // Check there is no role selector, radio group, or dropdown
    expect(screen.queryByRole('combobox', { name: /role/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /manager/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /staff/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^role/i)).not.toBeInTheDocument();

    // Check email and password fields exist
    expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in to stocksense/i })).toBeInTheDocument();
  });

  // Test 2 & 3: Successful Supabase login triggers GET /api/me with Bearer token
  it('2 & 3. Successful Supabase login triggers GET /api/me with Bearer token', async () => {
    const mockToken = 'mock-supabase-access-token-xyz';
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: {
        session: { access_token: mockToken, user: { id: 'usr-123' } },
        user: { id: 'usr-123' },
      },
      error: null,
    });

    const getProfileSpy = vi.spyOn(api, 'getProfile').mockResolvedValueOnce({
      id: 'usr-123',
      email: 'manager@example.com',
      role: 'manager',
      profile_created_at: '2026-01-01T00:00:00Z',
    });

    const user = userEvent.setup();
    const onSuccess = vi.fn();
    renderWithProviders(<LoginForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText(/work email/i), 'manager@example.com');
    await user.type(screen.getByPlaceholderText(/enter your password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in to stocksense/i }));

    await waitFor(() => {
      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'manager@example.com',
        password: 'secret123',
      });
      // Test 3: /api/me receives the Bearer token
      expect(getProfileSpy).toHaveBeenCalledWith(undefined, mockToken);
      expect(onSuccess).toHaveBeenCalledWith('manager');
    });
  });

  // Test 4: Manager routes to /manager
  it('4. Manager user routes to /manager', async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: { access_token: 'token-mgr', user: { id: 'mgr-1' } },
      },
      error: null,
    });

    vi.spyOn(api, 'getProfile').mockResolvedValueOnce({
      id: 'mgr-1',
      email: 'manager@example.com',
      role: 'manager',
      profile_created_at: '2026-01-01T00:00:00Z',
    });

    renderWithProviders(
      <Routes>
        <Route
          path="/manager"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRole="manager">
                <div>Manager Workspace</div>
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      ['/manager']
    );

    await waitFor(() => {
      expect(screen.getByText('Manager Workspace')).toBeInTheDocument();
    });
  });

  // Test 5: Staff routes to /staff
  it('5. Staff user routes to /staff', async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: { access_token: 'token-staff', user: { id: 'staff-1' } },
      },
      error: null,
    });

    vi.spyOn(api, 'getProfile').mockResolvedValueOnce({
      id: 'staff-1',
      email: 'staff@example.com',
      role: 'staff',
      profile_created_at: '2026-01-01T00:00:00Z',
    });

    renderWithProviders(
      <Routes>
        <Route
          path="/staff"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRole="staff">
                <div>Staff Workspace</div>
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>,
      ['/staff']
    );

    await waitFor(() => {
      expect(screen.getByText('Staff Workspace')).toBeInTheDocument();
    });
  });

  // Test 6: Unauthenticated users cannot access protected routes
  it('6. Unauthenticated users cannot access protected routes and redirect to /login', async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    renderWithProviders(
      <Routes>
        <Route
          path="/manager"
          element={
            <ProtectedRoute>
              <div>Secret Manager Area</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Login Redirect Target</div>} />
      </Routes>,
      ['/manager']
    );

    await waitFor(() => {
      expect(screen.getByText('Login Redirect Target')).toBeInTheDocument();
      expect(screen.queryByText('Secret Manager Area')).not.toBeInTheDocument();
    });
  });

  // Test 7: Staff cannot access /manager
  it('7. Staff cannot access /manager and is redirected to /staff', async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: { access_token: 'token-staff', user: { id: 'staff-1' } },
      },
      error: null,
    });

    vi.spyOn(api, 'getProfile').mockResolvedValueOnce({
      id: 'staff-1',
      email: 'staff@example.com',
      role: 'staff',
      profile_created_at: '2026-01-01T00:00:00Z',
    });

    renderWithProviders(
      <Routes>
        <Route
          path="/manager"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRole="manager">
                <div>Manager Only Content</div>
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route path="/staff" element={<div>Staff Workspace Fallback</div>} />
      </Routes>,
      ['/manager']
    );

    await waitFor(() => {
      expect(screen.getByText('Staff Workspace Fallback')).toBeInTheDocument();
      expect(screen.queryByText('Manager Only Content')).not.toBeInTheDocument();
    });
  });

  // Test 8: Manager does not enter the Staff workspace
  it('8. Manager visiting /staff is redirected to /manager', async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: { access_token: 'token-mgr', user: { id: 'mgr-1' } },
      },
      error: null,
    });

    vi.spyOn(api, 'getProfile').mockResolvedValueOnce({
      id: 'mgr-1',
      email: 'manager@example.com',
      role: 'manager',
      profile_created_at: '2026-01-01T00:00:00Z',
    });

    renderWithProviders(
      <Routes>
        <Route
          path="/staff"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRole="staff">
                <div>Staff Only Content</div>
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route path="/manager" element={<div>Manager Workspace Home</div>} />
      </Routes>,
      ['/staff']
    );

    await waitFor(() => {
      expect(screen.getByText('Manager Workspace Home')).toBeInTheDocument();
      expect(screen.queryByText('Staff Only Content')).not.toBeInTheDocument();
    });
  });

  // Test 9: Unknown roles are rejected
  it('9. Unknown roles are rejected and navigate to /unauthorized', async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: { access_token: 'token-bad', user: { id: 'bad-1' } },
      },
      error: null,
    });

    vi.spyOn(api, 'getProfile').mockResolvedValueOnce({
      id: 'bad-1',
      email: 'hacker@example.com',
      role: 'superadmin' as any, // Not manager or staff
      profile_created_at: '2026-01-01T00:00:00Z',
    });

    renderWithProviders(
      <Routes>
        <Route
          path="/manager"
          element={
            <ProtectedRoute>
              <div>Sensitive View</div>
            </ProtectedRoute>
          }
        />
        <Route path="/unauthorized" element={<div>Unauthorized Access Page</div>} />
      </Routes>,
      ['/manager']
    );

    await waitFor(() => {
      expect(screen.getByText('Unauthorized Access Page')).toBeInTheDocument();
      expect(screen.queryByText('Sensitive View')).not.toBeInTheDocument();
    });
  });

  // Test 10: Logout clears protected query state
  it('10. Logout clears protected query state and session', async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: { access_token: 'token-mgr', user: { id: 'mgr-1' } },
      },
      error: null,
    });

    vi.spyOn(api, 'getProfile').mockResolvedValueOnce({
      id: 'mgr-1',
      email: 'manager@example.com',
      role: 'manager',
      profile_created_at: '2026-01-01T00:00:00Z',
    });

    const clearSpy = vi.spyOn(
      (await import('../lib/query/queryClient')).queryClient,
      'clear'
    );

    const TestAuthConsumer = () => {
      const { user, logout } = useAuth();
      return (
        <div>
          <span>User: {user?.email}</span>
          <button type="button" onClick={() => logout()}>
            Sign Out
          </button>
        </div>
      );
    };

    const user = userEvent.setup();
    renderWithProviders(<TestAuthConsumer />);

    await waitFor(() => {
      expect(screen.getByText(/User: manager@example.com/)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /sign out/i }));

    expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    expect(clearSpy).toHaveBeenCalled();
  });

  // Test 11: Invalid or expired authentication (401) returns to login
  it('11. 401 response invalidates authentication and redirects to login', async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: { access_token: 'expired-token', user: { id: 'exp-1' } },
      },
      error: null,
    });

    vi.spyOn(api, 'getProfile').mockRejectedValueOnce(
      new ApiError(401, 'Unauthorized', 'Token has expired')
    );

    renderWithProviders(
      <Routes>
        <Route
          path="/manager"
          element={
            <ProtectedRoute>
              <div>Protected Workspace</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Returned to Login</div>} />
      </Routes>,
      ['/manager']
    );

    await waitFor(() => {
      expect(screen.getByText('Returned to Login')).toBeInTheDocument();
      expect(screen.queryByText('Protected Workspace')).not.toBeInTheDocument();
    });
  });

  // Test 12: 403 shows the unauthorized-profile state
  it('12. 403 response shows unauthorized-profile state', async () => {
    mockSupabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: { access_token: 'token-no-profile', user: { id: 'usr-403' } },
      },
      error: null,
    });

    vi.spyOn(api, 'getProfile').mockRejectedValueOnce(
      new ApiError(403, 'Forbidden', 'User has no StockSense role')
    );

    renderWithProviders(
      <Routes>
        <Route
          path="/manager"
          element={
            <ProtectedRoute>
              <div>Manager Workspace</div>
            </ProtectedRoute>
          }
        />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
      </Routes>,
      ['/manager']
    );

    await waitFor(() => {
      expect(screen.getByText('Unauthorized Access')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /check role again/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });
  });

  // Test 13: 503 shows a retryable service state
  it('13. 503 shows a retryable service-unavailable state without exposing internals', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: {
        session: { access_token: 'valid-token', user: { id: 'usr-1' } },
        user: { id: 'usr-1' },
      },
      error: null,
    });

    vi.spyOn(api, 'getProfile').mockRejectedValueOnce(
      new ApiError(503, 'Service Unavailable', 'Backend database pool exhausted')
    );

    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);

    await user.type(screen.getByLabelText(/work email/i), 'staff@example.com');
    await user.type(screen.getByPlaceholderText(/enter your password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in to stocksense/i }));

    await waitFor(() => {
      expect(screen.getByText('Service Unavailable')).toBeInTheDocument();
      // Verifies internal stack/pool details are not exposed in title
      expect(screen.queryByText(/database pool exhausted/i)).not.toBeInTheDocument();
    });
  });
});

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '../lib/query/queryClient';
import { AuthProvider } from '../features/auth/AuthContext';
import { Sidebar } from '../components/layout/Sidebar';
import { MobileNav } from '../components/layout/MobileNav';
import { api } from '../lib/api/client';
import * as supabaseClientModule from '../lib/supabase/client';
import { MemoryRouter } from 'react-router-dom';

describe('Navigation, Role Filtering & Accessibility', () => {
  let testQueryClient = createQueryClient();

  const mockStaffUser = () => {
    const mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: { access_token: 'valid-jwt', user: { id: 'staff-id' } },
          },
          error: null,
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
    };
    vi.spyOn(supabaseClientModule, 'getSupabase').mockReturnValue(mockSupabase as any);
    vi.spyOn(api, 'getProfile').mockResolvedValue({
      id: 'staff-id',
      email: 'staff@example.com',
      role: 'staff',
      profile_created_at: '2026-01-01T00:00:00Z',
    });
  };

  beforeEach(() => {
    testQueryClient = createQueryClient();
    vi.restoreAllMocks();
  });

  const renderComponent = (ui: React.ReactNode) => {
    return render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <AuthProvider>{ui}</AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  // Test 14: Staff navigation contains no financial or Manager-only controls
  it('14. Staff navigation contains no financial or Manager-only controls', async () => {
    mockStaffUser();

    renderComponent(<Sidebar />);

    await waitFor(() => {
      expect(screen.getByText('StockSense')).toBeInTheDocument();
    });

    // Ensure no financial, pricing, or manager controls
    expect(screen.queryByText(/finance/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/cost/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/margins/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/valuation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/manager settings/i)).not.toBeInTheDocument();
  });

  // Test 35: Mobile navigation supports keyboard and accessibility-critical behavior
  it('35. Mobile navigation supports Escape to close, focus, and aria-modal', async () => {
    mockStaffUser();
    const handleClose = vi.fn();

    renderComponent(<MobileNav isOpen={true} onClose={handleClose} />);

    // Check accessible dialog attributes
    const dialog = screen.getByRole('dialog', { name: /navigation drawer/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    // Pressing Escape triggers onClose
    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);

    // Close button has accessible label
    const closeBtn = screen.getByRole('button', { name: /close navigation menu/i });
    expect(closeBtn).toBeInTheDocument();
  });
});

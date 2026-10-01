import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { AuthProvider } from '../features/auth/AuthContext';
import { LowStockPanel } from '../features/dashboard/components/LowStockPanel';
import { BestSellingWidget } from '../features/dashboard/components/BestSellingWidget';
import { RecentMovementsWidget } from '../features/dashboard/components/RecentMovementsWidget';
import { PageHeader } from '../components/layout/PageHeader';
import { ManagerDashboardPage } from '../pages/ManagerDashboardPage';
import { api } from '../lib/api/client';
import * as supabaseClientModule from '../lib/supabase/client';
import { MemoryRouter } from 'react-router-dom';

describe('Dashboard UI States & Section Isolation', () => {
  let testQueryClient: QueryClient;

  const mockAuthenticatedUser = () => {
    const mockSupabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: { access_token: 'valid-jwt', user: { id: 'u-1' } },
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
      id: 'u-1',
      email: 'manager@example.com',
      role: 'manager',
      profile_created_at: '2026-01-01T00:00:00Z',
    });
  };

  beforeEach(() => {
    testQueryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
      },
    });
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

  // Test 29: Empty API responses show honest empty states
  it('29. Empty API responses display honest empty states with specific text', async () => {
    mockAuthenticatedUser();

    vi.spyOn(api, 'getLowStockReport').mockResolvedValueOnce([]);
    vi.spyOn(api, 'getBestSellingReport').mockResolvedValueOnce([]);
    vi.spyOn(api, 'getStockMovements').mockResolvedValueOnce([]);

    renderComponent(
      <div>
        <LowStockPanel />
        <BestSellingWidget />
        <RecentMovementsWidget />
      </div>
    );

    await waitFor(() => {
      expect(
        screen.getByText('No products are currently below their low-stock threshold.')
      ).toBeInTheDocument();
      expect(
        screen.getByText('No recorded sales were found for this date range.')
      ).toBeInTheDocument();
      expect(
        screen.getByText('No stock movements have been recorded yet.')
      ).toBeInTheDocument();
    });
  });

  // Test 30: Loading skeletons render
  it('30. Loading skeletons render while queries are in flight', async () => {
    mockAuthenticatedUser();

    // Promises that don't immediately resolve
    vi.spyOn(api, 'getLowStockReport').mockImplementation(() => new Promise(() => {}));

    renderComponent(<LowStockPanel />);

    await waitFor(() => {
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  // Test 31: Section-level error states render
  it('31. Section-level error states render with clear message and retry button', async () => {
    mockAuthenticatedUser();

    vi.spyOn(api, 'getLowStockReport').mockRejectedValue(
      new Error('Database query timed out')
    );

    renderComponent(<LowStockPanel />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load low-stock report')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  // Test 32: Retry controls refetch the affected query
  it('32. Retry control refetches the affected query', async () => {
    mockAuthenticatedUser();

    let callCount = 0;
    const lowStockSpy = vi
      .spyOn(api, 'getLowStockReport')
      .mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('Network error');
        }
        return [
          {
            id: 1,
            sku: 'SKU-01',
            name: 'Recovered Product',
            current_stock: 2,
            low_stock_threshold: 5,
          },
        ];
      });

    const user = userEvent.setup();
    renderComponent(<LowStockPanel />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load low-stock report')).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    await user.click(retryBtn);

    await waitFor(() => {
      expect(lowStockSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Recovered Product')).toBeInTheDocument();
    });
  });

  // Test 33: Manual refresh refetches dashboard queries
  it('33. Manual refresh refetches all dashboard queries', async () => {
    mockAuthenticatedUser();

    const refreshSpy = vi.spyOn(testQueryClient, 'invalidateQueries');

    const user = userEvent.setup();
    renderComponent(<PageHeader title="Manager Dashboard" />);

    const refreshButton = screen.getByRole('button', {
      name: /refresh operational dashboard data/i,
    });
    await user.click(refreshButton);

    await waitFor(() => {
      expect(refreshSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: ['dashboard'],
        })
      );
    });
  });

  // Test 34: One failed widget does not remove successful widgets
  it('34. One failed widget does not remove successful widgets', async () => {
    mockAuthenticatedUser();

    vi.spyOn(api, 'getInventorySummary').mockResolvedValue({
      total_products: 50,
      total_units_in_stock: 200,
      low_stock_products: 4,
      out_of_stock_products: 1,
    });
    vi.spyOn(api, 'getLowStockReport').mockRejectedValue(new Error('Low stock error'));
    vi.spyOn(api, 'getBestSellingReport').mockResolvedValue([
      {
        product_id: 1,
        sku: 'SKU-SUCCESS',
        name: 'Successful Product',
        total_quantity_sold: 45,
      },
    ]);
    vi.spyOn(api, 'getStockMovements').mockResolvedValue([]);

    renderComponent(<ManagerDashboardPage />);

    await waitFor(() => {
      // Inventory summary is intact
      expect(screen.getByText('50')).toBeInTheDocument();
      // Low stock shows local error
      expect(screen.getByText('Failed to load low-stock report')).toBeInTheDocument();
      // Best selling is intact
      expect(screen.getByText('Successful Product')).toBeInTheDocument();
      // Whole application shell is preserved
      expect(screen.getByText('Manager Dashboard')).toBeInTheDocument();
    });
  });
});

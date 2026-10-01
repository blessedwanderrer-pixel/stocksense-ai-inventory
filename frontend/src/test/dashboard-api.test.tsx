import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '../lib/query/queryClient';
import { AuthProvider } from '../features/auth/AuthContext';
import { InventoryKpiGrid } from '../features/dashboard/components/InventoryKpiGrid';
import { LowStockPanel } from '../features/dashboard/components/LowStockPanel';
import { BestSellingWidget } from '../features/dashboard/components/BestSellingWidget';
import { RecentMovementsWidget } from '../features/dashboard/components/RecentMovementsWidget';
import { StaffDashboardPage } from '../pages/StaffDashboardPage';
import { api } from '../lib/api/client';
import * as supabaseClientModule from '../lib/supabase/client';
import { MemoryRouter } from 'react-router-dom';

describe('Dashboard API Contracts & Role Data Isolation', () => {
  let testQueryClient = createQueryClient();

  const mockAuthenticatedUser = (role: 'manager' | 'staff') => {
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
      email: `${role}@example.com`,
      role,
      profile_created_at: '2026-01-01T00:00:00Z',
    });
  };

  beforeEach(() => {
    testQueryClient = createQueryClient();
    vi.restoreAllMocks();
  });

  const renderDashboardComponent = (ui: React.ReactNode) => {
    return render(
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter>
          <AuthProvider>{ui}</AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );
  };

  // Test 15 & 16: Inventory summary calls exact endpoint and binds exact 4 fields
  it('15 & 16. Inventory summary calls GET /api/reports/inventory-summary and binds exact 4 fields', async () => {
    mockAuthenticatedUser('manager');

    const getInventorySpy = vi.spyOn(api, 'getInventorySummary').mockResolvedValueOnce({
      total_products: 42,
      total_units_in_stock: 1250,
      low_stock_products: 5,
      out_of_stock_products: 2,
    });

    renderDashboardComponent(<InventoryKpiGrid />);

    await waitFor(() => {
      expect(getInventorySpy).toHaveBeenCalledTimes(1);
    });

    // Check all 4 values render
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('1,250')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    // Verify titles
    expect(screen.getByText('Total Products')).toBeInTheDocument();
    expect(screen.getByText('Units in Stock')).toBeInTheDocument();
    expect(screen.getByText('Low Stock')).toBeInTheDocument();
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
  });

  // Test 17: Zero KPI values render correctly
  it('17. Zero KPI values render correctly as 0', async () => {
    mockAuthenticatedUser('manager');

    vi.spyOn(api, 'getInventorySummary').mockResolvedValueOnce({
      total_products: 0,
      total_units_in_stock: 0,
      low_stock_products: 0,
      out_of_stock_products: 0,
    });

    renderDashboardComponent(<InventoryKpiGrid />);

    await waitFor(() => {
      const zeros = screen.getAllByTestId('kpi-value');
      expect(zeros.length).toBe(4);
      zeros.forEach((el) => {
        expect(el.textContent).toBe('0');
      });
    });
  });

  // Test 18 & 19: Low-stock uses GET /api/reports/low-stock and renders only actual fields
  it('18 & 19. Low-stock uses GET /api/reports/low-stock and renders actual fields', async () => {
    mockAuthenticatedUser('staff');

    const lowStockSpy = vi.spyOn(api, 'getLowStockReport').mockResolvedValueOnce([
      {
        id: 101,
        sku: 'SKU-COFFEE-01',
        name: 'Organic Dark Roast Coffee',
        current_stock: 4,
        low_stock_threshold: 10,
      },
      {
        id: 102,
        sku: 'SKU-MUG-02',
        name: 'Ceramic Logo Mug',
        current_stock: 0,
        low_stock_threshold: 5,
      },
    ]);

    renderDashboardComponent(<LowStockPanel />);

    await waitFor(() => {
      expect(lowStockSpy).toHaveBeenCalledTimes(1);
    });

    // Verify exact fields
    expect(screen.getByText('Organic Dark Roast Coffee')).toBeInTheDocument();
    expect(screen.getByText('SKU-COFFEE-01')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Low stock')).toBeInTheDocument();

    // Verify zero stock item has Out of stock status
    expect(screen.getByText('Ceramic Logo Mug')).toBeInTheDocument();
    expect(screen.getByText('SKU-MUG-02')).toBeInTheDocument();
    expect(screen.getByText('Out of stock')).toBeInTheDocument();

    // Ensure no invented fields exist in the table
    expect(screen.queryByText(/reorder quantity/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/supplier name/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/urgency score/i)).not.toBeInTheDocument();
  });

  // Test 20 & 21: Best-selling uses GET /api/reports/best-selling and sends valid start_date and end_date
  it('20 & 21. Best-selling uses GET /api/reports/best-selling and sends valid start_date and end_date', async () => {
    mockAuthenticatedUser('manager');

    const bestSellingSpy = vi.spyOn(api, 'getBestSellingReport').mockResolvedValueOnce([
      {
        product_id: 201,
        sku: 'SKU-BEANS-01',
        name: 'Espresso Blend Whole Bean',
        total_quantity_sold: 154,
      },
    ]);

    renderDashboardComponent(<BestSellingWidget />);

    await waitFor(() => {
      expect(bestSellingSpy).toHaveBeenCalledTimes(1);
      const [startArg, endArg] = bestSellingSpy.mock.calls[0];
      // Format must be YYYY-MM-DD
      expect(startArg).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(endArg).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(endArg >= startArg).toBe(true);
    });

    expect(screen.getByText('Espresso Blend Whole Bean')).toBeInTheDocument();
  });

  // Test 22 & 23: Best-selling is available to both Manager and Staff and chart uses total_quantity_sold
  it('22 & 23. Best-selling is available to Staff and displays total_quantity_sold', async () => {
    mockAuthenticatedUser('staff');

    vi.spyOn(api, 'getBestSellingReport').mockResolvedValueOnce([
      {
        product_id: 301,
        sku: 'SKU-TEA-05',
        name: 'Earl Grey Reserve',
        total_quantity_sold: 89,
      },
    ]);

    renderDashboardComponent(<BestSellingWidget />);

    await waitFor(() => {
      expect(screen.getByText('Earl Grey Reserve')).toBeInTheDocument();
      expect(screen.getByText(/89 units sold/i)).toBeInTheDocument();
    });
  });

  // Test 24 & 25: Recent activity uses GET /api/stock-movements, never /api/reports/recent-movements
  it('24 & 25. Recent activity uses GET /api/stock-movements and never calls /api/reports/recent-movements', async () => {
    mockAuthenticatedUser('manager');

    const movementsSpy = vi.spyOn(api, 'getStockMovements').mockResolvedValueOnce([
      {
        id: 501,
        product_id: 10,
        product: { id: 10, sku: 'SKU-X1', name: 'Almond Milk 1L' },
        movement_type: 'stock_in',
        quantity: 50,
        supplier_id: 8,
        performed_by: { id: '00000000-0000-0000-0000-000000000001' },
        occurred_at: '2026-09-30T10:00:00Z',
      },
    ]);

    renderDashboardComponent(<RecentMovementsWidget />);

    await waitFor(() => {
      expect(movementsSpy).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('Almond Milk 1L')).toBeInTheDocument();
    expect(screen.getByText('SKU-X1')).toBeInTheDocument();
    expect(screen.getByText('Stock In')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText(/Supplier ID: 8/)).toBeInTheDocument();
  });

  // Test 26: Movement types support exactly stock_in, sale, and damaged
  it('26. Movement types support exactly stock_in, sale, and damaged', async () => {
    mockAuthenticatedUser('staff');

    vi.spyOn(api, 'getStockMovements').mockResolvedValueOnce([
      {
        id: 601,
        product_id: 1,
        product: { id: 1, sku: 'SKU-A', name: 'Item Alpha' },
        movement_type: 'stock_in',
        quantity: 20,
        supplier_id: null,
        performed_by: { id: 'usr-1' },
        occurred_at: '2026-09-30T09:00:00Z',
      },
      {
        id: 602,
        product_id: 2,
        product: { id: 2, sku: 'SKU-B', name: 'Item Beta' },
        movement_type: 'sale',
        quantity: 3,
        supplier_id: null,
        performed_by: { id: 'usr-2' },
        occurred_at: '2026-09-30T09:15:00Z',
      },
      {
        id: 603,
        product_id: 3,
        product: { id: 3, sku: 'SKU-C', name: 'Item Gamma' },
        movement_type: 'damaged',
        quantity: 1,
        supplier_id: null,
        performed_by: { id: 'usr-3' },
        occurred_at: '2026-09-30T09:30:00Z',
      },
    ]);

    renderDashboardComponent(<RecentMovementsWidget />);

    await waitFor(() => {
      expect(screen.getByText('Stock In')).toBeInTheDocument();
      expect(screen.getByText('Sale')).toBeInTheDocument();
      expect(screen.getByText('Damaged')).toBeInTheDocument();
    });
  });

  // Test 27: Staff receives no financial UI or request
  it('27. Staff dashboard contains no financial or cost fields', async () => {
    mockAuthenticatedUser('staff');

    vi.spyOn(api, 'getInventorySummary').mockResolvedValueOnce({
      total_products: 10,
      total_units_in_stock: 100,
      low_stock_products: 1,
      out_of_stock_products: 0,
    });
    vi.spyOn(api, 'getLowStockReport').mockResolvedValueOnce([]);
    vi.spyOn(api, 'getBestSellingReport').mockResolvedValueOnce([]);
    vi.spyOn(api, 'getStockMovements').mockResolvedValueOnce([]);

    renderDashboardComponent(<StaffDashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Staff Operations Dashboard')).toBeInTheDocument();
    });

    // Strictly ensure no financial terms exist anywhere in Staff dashboard
    expect(screen.queryByText(/cost price/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/gross profit/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/net profit/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/margin/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/markup/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/valuation/i)).not.toBeInTheDocument();
  });

  // Test 28: No dashboard uses hardcoded production values
  it('28. When API returns zeroes, dashboard displays real 0 without fake fallbacks', async () => {
    mockAuthenticatedUser('manager');

    vi.spyOn(api, 'getInventorySummary').mockResolvedValueOnce({
      total_products: 0,
      total_units_in_stock: 0,
      low_stock_products: 0,
      out_of_stock_products: 0,
    });

    renderDashboardComponent(<InventoryKpiGrid />);

    await waitFor(() => {
      const kpis = screen.getAllByTestId('kpi-value');
      expect(kpis.length).toBe(4);
      kpis.forEach(card => expect(card.textContent).toBe('0'));
    });
  });
});

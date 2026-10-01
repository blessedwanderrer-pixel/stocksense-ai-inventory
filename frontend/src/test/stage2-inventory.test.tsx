import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../features/auth/AuthContext';
import { createQueryClient } from '../lib/query/queryClient';
import { api } from '../lib/api/client';
import { ApiError } from '../lib/api/errors';
import * as supabaseClientModule from '../lib/supabase/client';
import { InventoryPage } from '../pages/InventoryPage';
import { MovementsPage } from '../pages/MovementsPage';
import { ReportsPage } from '../pages/ReportsPage';
import { deriveStockStatus, type ProductResponse } from '../types/inventory';

const product: ProductResponse = {
  id: 7,
  category_id: 3,
  sku: 'CABLE-C-01',
  name: 'Type-C Cable',
  description: 'Braided charging cable',
  current_stock: 5,
  low_stock_threshold: 2,
  selling_price: '12.00',
  cost_price: '7.50',
  created_at: '2026-09-30T10:00:00Z',
};

describe('Compressed Stage 2 inventory operations', () => {
  let queryClient = createQueryClient();

  beforeEach(() => {
    vi.restoreAllMocks();
    queryClient = createQueryClient();
  });

  const authenticate = (role: 'manager' | 'staff') => {
    const supabase = {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: `${role}-token`, user: { id: `${role}-1` } } },
          error: null,
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
      },
    };
    vi.spyOn(supabaseClientModule, 'getSupabase').mockReturnValue(supabase as never);
    vi.spyOn(api, 'getProfile').mockResolvedValue({
      id: `${role}-1`,
      email: `${role}@example.test`,
      role,
      profile_created_at: '2026-09-30T08:00:00Z',
    });
  };

  const renderAuthenticated = (ui: React.ReactNode) =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthProvider>{ui}</AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

  it('derives Out of Stock, Low Stock, and In Stock only from stock and threshold', () => {
    expect(deriveStockStatus(0, 4)).toBe('out_of_stock');
    expect(deriveStockStatus(4, 4)).toBe('low_stock');
    expect(deriveStockStatus(5, 4)).toBe('in_stock');
  });

  it('renders the real catalog and Manager-only cost/create/edit controls', async () => {
    authenticate('manager');
    vi.spyOn(api, 'getProducts').mockResolvedValue([product]);

    renderAuthenticated(<InventoryPage />);

    expect((await screen.findAllByText('Type-C Cable')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('CABLE-C-01').length).toBeGreaterThan(0);
    expect(screen.getAllByText('7.50').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /add product/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /edit type-c cable/i })).toBeInTheDocument();
  });

  it('sanitizes Staff catalog data and exposes no Manager product controls', async () => {
    authenticate('staff');
    vi.spyOn(api, 'getProducts').mockResolvedValue([product]);
    const createSpy = vi.spyOn(api, 'createProduct');
    const updateSpy = vi.spyOn(api, 'updateProduct');

    renderAuthenticated(<InventoryPage />);

    expect((await screen.findAllByText('Type-C Cable')).length).toBeGreaterThan(0);
    expect(screen.queryByText('7.50')).not.toBeInTheDocument();
    expect(screen.queryByText(/cost price/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /add product/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit type-c cable/i })).not.toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('serializes only the exact supported product-create contract', async () => {
    const payload = {
      category_id: 3,
      sku: 'NEW-01',
      name: 'New Item',
      description: null,
      low_stock_threshold: 0,
      selling_price: '20.00',
      cost_price: '11.00',
    };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ...product, ...payload, id: 8, current_stock: 0 }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.spyOn(supabaseClientModule, 'getSupabase').mockReturnValue({
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'manager-token' } } }) },
    } as never);

    await api.createProduct(payload);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, request] = fetchSpy.mock.calls[0];
    expect(String(url)).toBe('http://localhost:8000/api/products');
    expect(request?.method).toBe('POST');
    expect(JSON.parse(String(request?.body))).toEqual(payload);
    expect(JSON.parse(String(request?.body))).not.toHaveProperty('current_stock');
  });

  it('serializes a partial product update without stock or unsupported fields', async () => {
    const payload = { name: 'Type-C Cable Pro' };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ...product, ...payload }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.spyOn(supabaseClientModule, 'getSupabase').mockReturnValue({
      auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'manager-token' } } }) },
    } as never);

    await api.updateProduct(7, payload);

    const [url, request] = fetchSpy.mock.calls[0];
    expect(String(url)).toBe('http://localhost:8000/api/products/7');
    expect(request?.method).toBe('PATCH');
    expect(JSON.parse(String(request?.body))).toEqual(payload);
    expect(JSON.parse(String(request?.body))).not.toHaveProperty('current_stock');
  });

  it.each([
    ['stock_in', 'Stock In', { supplier_id: 9 }],
    ['sale', 'Sale', {}],
    ['damaged', 'Damaged', {}],
  ] as const)('submits the exact %s stock-movement contract', async (movementType, label, extra) => {
    authenticate('staff');
    vi.spyOn(api, 'getProducts').mockResolvedValue([product]);
    const movementSpy = vi.spyOn(api, 'createStockMovement').mockResolvedValue({
      id: 31,
      product_id: product.id,
      product: { id: product.id, sku: product.sku, name: product.name },
      movement_type: movementType,
      quantity: 2,
      supplier_id: movementType === 'stock_in' ? 9 : null,
      performed_by: { id: 'staff-1' },
      occurred_at: '2026-09-30T11:00:00Z',
    });
    const user = userEvent.setup();

    renderAuthenticated(<InventoryPage />);
    await screen.findAllByText('Type-C Cable');
    await user.click(screen.getByRole('button', { name: /record movement for type-c cable/i }));
    const dialog = screen.getByRole('dialog', { name: /record stock movement/i });
    await user.click(within(dialog).getByRole('radio', { name: label }));
    await user.type(within(dialog).getByLabelText(/^quantity/i), '2');
    if (movementType === 'stock_in') {
      await user.type(within(dialog).getByLabelText(/supplier id/i), '9');
    }
    await user.click(within(dialog).getByRole('button', { name: /submit movement/i }));
    if (movementType !== 'stock_in') {
      await user.click(within(dialog).getByRole('button', { name: /confirm & submit/i }));
    }

    await waitFor(() => expect(movementSpy).toHaveBeenCalledTimes(1));
    expect(movementSpy).toHaveBeenCalledWith({
      product_id: 7,
      movement_type: movementType,
      quantity: 2,
      ...extra,
    });
    expect(movementSpy.mock.calls[0][0]).not.toHaveProperty('performed_by');
    expect(movementSpy.mock.calls[0][0]).not.toHaveProperty('occurred_at');
  });

  it('shows an insufficient-stock rejection without a negative or false success state', async () => {
    authenticate('staff');
    const productsSpy = vi.spyOn(api, 'getProducts').mockResolvedValue([product]);
    vi.spyOn(api, 'createStockMovement').mockRejectedValue(
      new ApiError(409, 'Conflict', 'Insufficient stock for this movement')
    );
    const user = userEvent.setup();

    renderAuthenticated(<InventoryPage />);
    await screen.findAllByText('Type-C Cable');
    await user.click(screen.getByRole('button', { name: /record movement for type-c cable/i }));
    const dialog = screen.getByRole('dialog', { name: /record stock movement/i });
    await user.click(within(dialog).getByRole('radio', { name: 'Sale' }));
    await user.type(within(dialog).getByLabelText(/^quantity/i), '8');

    expect(within(dialog).getByText(/would be rejected — no stock change/i)).toBeInTheDocument();
    expect(within(dialog).queryByText(/5 → -3/)).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: /submit movement/i }));
    await user.click(within(dialog).getByRole('button', { name: /confirm & submit/i }));

    expect(await within(dialog).findByText('Insufficient stock for this movement')).toBeInTheDocument();
    expect(within(dialog).queryByText(/movement recorded/i)).not.toBeInTheDocument();
    await waitFor(() => expect(productsSpy.mock.calls.length).toBeGreaterThan(1));
    expect(screen.getAllByText('5').length).toBeGreaterThan(0);
  });

  it('renders movement history using only returned IDs and operational fields', async () => {
    authenticate('staff');
    vi.spyOn(api, 'getStockMovements').mockResolvedValue([
      {
        id: 44,
        product_id: 7,
        product: { id: 7, sku: 'CABLE-C-01', name: 'Type-C Cable' },
        movement_type: 'stock_in',
        quantity: 10,
        supplier_id: 9,
        performed_by: { id: '00000000-0000-4000-8000-000000000009' },
        occurred_at: '2026-09-30T11:00:00Z',
      },
    ]);

    renderAuthenticated(<MovementsPage />);

    expect((await screen.findAllByText('Type-C Cable')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('CABLE-C-01').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/supplier id: 9/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/by: 00000000/i)).toBeInTheDocument();
    expect(screen.queryByText(/ali traders/i)).not.toBeInTheDocument();
  });

  it('binds the reports workspace only to existing operational report APIs', async () => {
    authenticate('staff');
    const summary = vi.spyOn(api, 'getInventorySummary').mockResolvedValue({
      total_products: 1,
      total_units_in_stock: 5,
      low_stock_products: 0,
      out_of_stock_products: 0,
    });
    const lowStock = vi.spyOn(api, 'getLowStockReport').mockResolvedValue([]);
    const bestSelling = vi.spyOn(api, 'getBestSellingReport').mockResolvedValue([]);

    renderAuthenticated(<ReportsPage />);

    await waitFor(() => {
      expect(summary).toHaveBeenCalledTimes(1);
      expect(lowStock).toHaveBeenCalledTimes(1);
      expect(bestSelling).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText(/profit|margin|valuation|revenue/i)).not.toBeInTheDocument();
  });
});

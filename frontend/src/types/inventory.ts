import type { UserRole } from './auth';

export interface ProductResponse {
  id: number;
  category_id: number;
  sku: string;
  name: string;
  description: string | null;
  current_stock: number;
  low_stock_threshold: number;
  selling_price: string;
  created_at: string;
  cost_price?: string;
}

export type ProductListResponse = ProductResponse[];

// Staff view model strictly omits cost_price
export interface StaffProductViewModel {
  id: number;
  category_id: number;
  sku: string;
  name: string;
  description: string | null;
  current_stock: number;
  low_stock_threshold: number;
  selling_price: string;
  created_at: string;
}

export type StockStatus = 'out_of_stock' | 'low_stock' | 'in_stock';

export function deriveStockStatus(currentStock: number, lowStockThreshold: number): StockStatus {
  if (currentStock === 0) return 'out_of_stock';
  if (currentStock <= lowStockThreshold) return 'low_stock';
  return 'in_stock';
}

export interface ProductCreateRequest {
  category_id: number;
  sku: string;
  name: string;
  description?: string | null;
  low_stock_threshold?: number;
  selling_price: string;
  cost_price?: string;
}

export interface ProductUpdateRequest {
  category_id?: number;
  sku?: string;
  name?: string;
  description?: string | null;
  low_stock_threshold?: number;
  selling_price?: string;
  cost_price?: string;
}

// Sanitizes a product response according to the user's role
export function sanitizeProductForRole<T extends ProductResponse>(
  product: T,
  role: UserRole
): T | StaffProductViewModel {
  if (role === 'staff') {
    const { cost_price: _removed, ...staffProduct } = product;
    return staffProduct as StaffProductViewModel;
  }
  return product;
}

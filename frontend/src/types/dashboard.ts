// Exact inventory summary response from GET /api/reports/inventory-summary
export interface InventorySummaryResponse {
  total_products: number;
  total_units_in_stock: number;
  low_stock_products: number;
  out_of_stock_products: number;
}

// Exact operational product stock response from GET /api/reports/low-stock
export interface OperationalProductStock {
  id: number;
  sku: string;
  name: string;
  current_stock: number;
  low_stock_threshold: number;
}

export type LowStockResponse = OperationalProductStock[];

// Exact best-selling product response from GET /api/reports/best-selling?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
export interface BestSellingProduct {
  product_id: number;
  sku: string;
  name: string;
  total_quantity_sold: number;
}

export type BestSellingResponse = BestSellingProduct[];

export type DatePreset = 'today' | 'this_week' | 'last_7_days' | 'this_month' | 'custom';

export interface DateRange {
  startDate: string;
  endDate: string;
  preset: DatePreset;
}

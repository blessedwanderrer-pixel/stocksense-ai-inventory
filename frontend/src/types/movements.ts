export type StockMovementType = 'stock_in' | 'sale' | 'damaged';

// Exact response from GET /api/stock-movements
export interface StockMovementResponse {
  id: number;
  product_id: number;
  product: {
    id: number;
    sku: string;
    name: string;
  };
  movement_type: StockMovementType;
  quantity: number;
  supplier_id: number | null;
  performed_by: {
    id: string;
  };
  occurred_at: string;
}

export type StockMovementHistoryResponse = StockMovementResponse[];

export interface StockMovementCreateRequest {
  product_id: number;
  movement_type: StockMovementType;
  quantity: number;
  supplier_id?: number | null;
}

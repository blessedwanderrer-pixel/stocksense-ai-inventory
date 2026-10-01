import React from 'react';
import type { OperationalProductStock } from '../../types/dashboard';

interface LowStockComparisonChartProps {
  products: OperationalProductStock[];
}

export const LowStockComparisonChart: React.FC<LowStockComparisonChartProps> = ({ products }) => {
  if (products.length === 0) return null;

  // Take up to top 6 items for clean responsive display
  const displayItems = products.slice(0, 6);

  return (
    <div className="pt-2 space-y-3" aria-label="Low stock comparison chart">
      <div className="flex items-center justify-between text-xs text-zinc-500 pb-1 border-b border-zinc-100">
        <span className="font-medium text-zinc-700">Product (SKU)</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block" /> Current Stock
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-zinc-300 inline-block" /> Threshold
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {displayItems.map((item) => {
          const maxVal = Math.max(item.low_stock_threshold, item.current_stock, 10);
          const currentPct = Math.min(100, Math.round((item.current_stock / maxVal) * 100));
          const thresholdPct = Math.min(100, Math.round((item.low_stock_threshold / maxVal) * 100));

          return (
            <div key={item.id} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-zinc-800 truncate max-w-[200px]" title={item.name}>
                  {item.name} <span className="text-zinc-400 font-mono text-[11px]">({item.sku})</span>
                </span>
                <span className="text-zinc-600 font-mono">
                  {item.current_stock} / {item.low_stock_threshold}
                </span>
              </div>
              <div className="w-full bg-zinc-100 rounded-full h-2 relative overflow-hidden">
                {/* Threshold indicator line */}
                <div
                  className="absolute top-0 bottom-0 bg-zinc-300 w-full"
                  style={{ width: `${thresholdPct}%` }}
                />
                {/* Current stock progress */}
                <div
                  className={`absolute top-0 bottom-0 ${
                    item.current_stock === 0 ? 'bg-red-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${currentPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

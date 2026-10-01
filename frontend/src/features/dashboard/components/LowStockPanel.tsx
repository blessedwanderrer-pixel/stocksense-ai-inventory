import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { LowStockComparisonChart } from '../../../components/charts/LowStockComparisonChart';
import { useLowStockReport } from '../hooks/useDashboardQueries';
import { AlertTriangle, BarChart3, ListFilter } from 'lucide-react';

export const LowStockPanel: React.FC = () => {
  const { data: products, isLoading, isError, refetch } = useLowStockReport();
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <CardTitle>Low Stock Alerts</CardTitle>
          </div>
          <CardDescription>
            Products with current stock at or below configured threshold
          </CardDescription>
        </div>

        {products && products.length > 0 && (
          <div className="flex items-center bg-zinc-100 p-0.5 rounded-lg border border-zinc-200">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              aria-label="Table view"
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              Table
            </button>
            <button
              type="button"
              onClick={() => setViewMode('chart')}
              aria-label="Chart view"
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                viewMode === 'chart'
                  ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
              Chart
            </button>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 pt-3">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        )}

        {isError && (
          <ErrorState
            title="Failed to load low-stock report"
            message="Could not retrieve low-stock items from the server."
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !isError && products && products.length === 0 && (
          <EmptyState
            title="No low-stock products"
            description="No products are currently below their low-stock threshold."
          />
        )}

        {!isLoading && !isError && products && products.length > 0 && (
          <>
            {viewMode === 'chart' ? (
              <LowStockComparisonChart products={products} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-semibold">
                      <th scope="col" className="pb-2 pl-1">Product</th>
                      <th scope="col" className="pb-2">SKU</th>
                      <th scope="col" className="pb-2 text-right">Current</th>
                      <th scope="col" className="pb-2 text-right">Threshold</th>
                      <th scope="col" className="pb-2 text-right pr-1">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {products.map((item) => {
                      const isOutOfStock = item.current_stock === 0;
                      return (
                        <tr key={item.id} className="hover:bg-zinc-50/80 transition-colors">
                          <td className="py-2.5 pl-1 font-medium text-zinc-900 max-w-[180px] truncate" title={item.name}>
                            {item.name}
                          </td>
                          <td className="py-2.5 font-mono text-zinc-500">
                            {item.sku}
                          </td>
                          <td className="py-2.5 text-right font-mono font-semibold text-zinc-900">
                            {item.current_stock}
                          </td>
                          <td className="py-2.5 text-right font-mono text-zinc-500">
                            {item.low_stock_threshold}
                          </td>
                          <td className="py-2.5 text-right pr-1">
                            {isOutOfStock ? (
                              <Badge variant="danger">Out of stock</Badge>
                            ) : (
                              <Badge variant="warning">Low stock</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

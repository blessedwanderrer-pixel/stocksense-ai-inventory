import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { useStockMovements } from '../hooks/useDashboardQueries';
import type { StockMovementType } from '../../../types/movements';
import { ArrowDownLeft, ArrowUpRight, AlertOctagon, History } from 'lucide-react';

export const RecentMovementsWidget: React.FC = () => {
  const { data: movements, isLoading, isError, refetch } = useStockMovements();

  // Show recent subset (up to 8 items) while cache retains all
  const recentSubset = movements ? movements.slice(0, 8) : [];

  const getMovementBadge = (type: StockMovementType) => {
    switch (type) {
      case 'stock_in':
        return (
          <Badge variant="success" className="gap-1">
            <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
            Stock In
          </Badge>
        );
      case 'sale':
        return (
          <Badge variant="neutral" className="gap-1">
            <ArrowUpRight className="w-3 h-3 text-zinc-600" />
            Sale
          </Badge>
        );
      case 'damaged':
        return (
          <Badge variant="danger" className="gap-1">
            <AlertOctagon className="w-3 h-3 text-red-600" />
            Damaged
          </Badge>
        );
    }
  };

  const formatTimestamp = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return isoString;
    }
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-700" />
            <CardTitle>Recent Stock Activity</CardTitle>
          </div>
          <CardDescription>
            Audit history of operational stock receipts, sales, and adjustments
          </CardDescription>
        </div>
        {movements && movements.length > 0 && (
          <span className="text-xs text-zinc-400 font-mono">
            Showing {recentSubset.length} of {movements.length}
          </span>
        )}
      </CardHeader>

      <CardContent className="flex-1 pt-3">
        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        )}

        {isError && (
          <ErrorState
            title="Failed to load stock movements"
            message="Could not retrieve recent stock movement history."
            onRetry={() => refetch()}
          />
        )}

        {!isLoading && !isError && movements && movements.length === 0 && (
          <EmptyState
            title="No movements recorded"
            description="No stock movements have been recorded yet."
          />
        )}

        {!isLoading && !isError && recentSubset.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-semibold">
                  <th scope="col" className="pb-2 pl-1">Product</th>
                  <th scope="col" className="pb-2">SKU</th>
                  <th scope="col" className="pb-2">Type</th>
                  <th scope="col" className="pb-2 text-right">Quantity</th>
                  <th scope="col" className="pb-2">Details</th>
                  <th scope="col" className="pb-2 text-right pr-1">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {recentSubset.map((movement) => (
                  <tr key={movement.id} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-2.5 pl-1 font-medium text-zinc-900 max-w-[160px] truncate" title={movement.product.name}>
                      {movement.product.name}
                    </td>
                    <td className="py-2.5 font-mono text-zinc-500">
                      {movement.product.sku}
                    </td>
                    <td className="py-2.5">
                      {getMovementBadge(movement.movement_type)}
                    </td>
                    <td className="py-2.5 text-right font-mono font-semibold text-zinc-900">
                      {movement.quantity}
                    </td>
                    <td className="py-2.5 text-zinc-500 text-[11px] max-w-[160px] truncate">
                      {movement.supplier_id !== null && (
                        <span className="mr-2">Supplier ID: {movement.supplier_id}</span>
                      )}
                      <span title={`Performed by: ${movement.performed_by.id}`}>
                        By: {movement.performed_by.id.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="py-2.5 text-right pr-1 font-mono text-zinc-400 text-[11px] whitespace-nowrap">
                      {formatTimestamp(movement.occurred_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

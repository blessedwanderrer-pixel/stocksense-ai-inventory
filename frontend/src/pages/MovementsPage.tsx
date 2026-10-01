import React, { useState, useMemo } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/feedback/EmptyState';
import { ErrorState } from '../components/feedback/ErrorState';
import { StockOperationModal } from '../features/inventory/components/StockOperationModal';
import { useStockMovementsHistory } from '../features/inventory/hooks/useInventoryQueries';
import {
  ArrowDownLeft,
  ArrowUpRight,
  AlertOctagon,
  ArrowLeftRight,
  Search,
  X,
  History,
} from 'lucide-react';
import type { StockMovementType } from '../types/movements';

export const MovementsPage: React.FC = () => {
  const { data: movements, isLoading, isError, refetch } = useStockMovementsHistory();

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | StockMovementType>('all');

  const filteredMovements = useMemo(() => {
    if (!movements) return [];

    return movements.filter((m) => {
      // Type filter
      if (typeFilter !== 'all' && m.movement_type !== typeFilter) {
        return false;
      }

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = m.product.name.toLowerCase().includes(q);
      const matchSku = m.product.sku.toLowerCase().includes(q);

      return matchName || matchSku;
    });
  }, [movements, typeFilter, searchQuery]);

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

  const formatTimestamp = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Stock Movement History"
        description="Complete immutable audit trail of inventory receipts, customer sales, and damage adjustments."
        showRefresh={true}
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsMovementModalOpen(true)}
            leftIcon={<ArrowLeftRight className="w-4 h-4" />}
          >
            Record Movement
          </Button>
        }
      />

      {/* Movements Table Card */}
      <Card className="flex flex-col">
        <CardHeader className="p-4 space-y-3 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <label htmlFor="movement-search" className="sr-only">
                Search movements by product name or SKU
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  id="movement-search"
                  type="text"
                  placeholder="Search by product name or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 py-1.5 text-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Movement Type Filter */}
            <div
              role="group"
              aria-label="Filter by movement type"
              className="flex items-center self-start sm:self-auto bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 text-xs"
            >
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors ${
                  typeFilter === 'all'
                    ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('stock_in')}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors ${
                  typeFilter === 'stock_in'
                    ? 'bg-white text-emerald-800 shadow-2xs font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Stock In
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('sale')}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors ${
                  typeFilter === 'sale'
                    ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Sale
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('damaged')}
                className={`px-2.5 py-1 font-medium rounded-md transition-colors ${
                  typeFilter === 'damaged'
                    ? 'bg-white text-red-800 shadow-2xs font-semibold'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Damaged
              </button>
            </div>
          </div>

          {/* Counts */}
          {movements && (
            <div className="flex items-center justify-between text-xs text-zinc-500 pt-1 border-t border-zinc-100">
              <span>
                Showing <strong className="text-zinc-800">{filteredMovements.length}</strong> of{' '}
                {movements.length} logged transactions
              </span>
            </div>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {isLoading && (
            <div className="p-5 space-y-3">
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          )}

          {isError && (
            <div className="p-6">
              <ErrorState
                title="Failed to load stock movements"
                message="Could not retrieve transaction history from the server."
                onRetry={() => refetch()}
              />
            </div>
          )}

          {!isLoading && !isError && movements && movements.length === 0 && (
            <div className="p-6">
              <EmptyState
                title="No stock movements recorded"
                description="No stock movements have been recorded yet. Use the Record Movement button above to log your first transaction."
                icon={<History className="w-6 h-6 text-zinc-400" />}
              />
            </div>
          )}

          {!isLoading && !isError && movements && movements.length > 0 && filteredMovements.length === 0 && (
            <div className="p-6">
              <EmptyState
                title="No matching transactions"
                description="No stock movements match the specified search query or type filter."
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setTypeFilter('all');
                    }}
                  >
                    Clear Filters
                  </Button>
                }
              />
            </div>
          )}

          {!isLoading && !isError && filteredMovements.length > 0 && (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-semibold bg-zinc-50/60">
                      <th scope="col" className="py-3 px-4">Product Name</th>
                      <th scope="col" className="py-3 px-3">SKU</th>
                      <th scope="col" className="py-3 px-3">Type</th>
                      <th scope="col" className="py-3 px-3 text-right">Quantity</th>
                      <th scope="col" className="py-3 px-3">Details</th>
                      <th scope="col" className="py-3 px-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredMovements.map((movement) => (
                      <tr key={movement.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-3 px-4 font-medium text-zinc-900 max-w-[200px] truncate" title={movement.product.name}>
                          {movement.product.name}
                        </td>
                        <td className="py-3 px-3 font-mono text-zinc-600">
                          {movement.product.sku}
                        </td>
                        <td className="py-3 px-3">
                          {getMovementBadge(movement.movement_type)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-zinc-900">
                          {movement.quantity}
                        </td>
                        <td className="py-3 px-3 text-[11px] text-zinc-500 font-mono">
                          {movement.supplier_id !== null && (
                            <span className="mr-3 bg-zinc-100 px-1.5 py-0.5 rounded text-zinc-700">
                              Supplier ID: {movement.supplier_id}
                            </span>
                          )}
                          <span title={`Performed by: ${movement.performed_by.id}`}>
                            By: {movement.performed_by.id.slice(0, 8)}...
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-zinc-500 text-[11px] whitespace-nowrap">
                          {formatTimestamp(movement.occurred_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-zinc-100">
                {filteredMovements.map((movement) => (
                  <div key={movement.id} className="p-4 space-y-2 hover:bg-zinc-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold text-zinc-900">{movement.product.name}</h4>
                        <p className="font-mono text-xs text-zinc-500">SKU: {movement.product.sku}</p>
                      </div>
                      <div>{getMovementBadge(movement.movement_type)}</div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-zinc-500">Quantity:</span>
                      <span className="font-mono font-bold text-zinc-900 text-sm">
                        {movement.quantity} units
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono pt-1 border-t border-zinc-100">
                      <span>
                        {movement.supplier_id !== null ? `Supplier ID: ${movement.supplier_id}` : `ID: ${movement.id}`}
                      </span>
                      <span>{formatTimestamp(movement.occurred_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stock Operation Modal */}
      <StockOperationModal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
};

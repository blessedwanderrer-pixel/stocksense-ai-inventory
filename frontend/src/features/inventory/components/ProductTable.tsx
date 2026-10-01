import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Skeleton } from '../../../components/ui/Skeleton';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { StockStatusBadge } from './StockStatusBadge';
import { deriveStockStatus, type ProductResponse } from '../../../types/inventory';
import { useAuth } from '../../auth/AuthContext';
import { Search, X, Eye, Edit2, ArrowLeftRight, PackageOpen, Filter } from 'lucide-react';

interface ProductTableProps {
  products: ProductResponse[] | undefined;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onViewProduct: (product: ProductResponse) => void;
  onEditProduct?: (product: ProductResponse) => void;
  onRecordMovement?: (product: ProductResponse) => void;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  isLoading,
  isError,
  onRetry,
  onViewProduct,
  onEditProduct,
  onRecordMovement,
}) => {
  const { user } = useAuth();
  const isManager = user?.role === 'manager';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');

  // Client-side search and filtering
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    return products.filter((p) => {
      // Status filter
      if (statusFilter !== 'all') {
        const status = deriveStockStatus(p.current_stock, p.low_stock_threshold);
        if (status !== statusFilter) return false;
      }

      // Search query (name, sku, description)
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchName = p.name.toLowerCase().includes(q);
      const matchSku = p.sku.toLowerCase().includes(q);
      const matchDesc = p.description ? p.description.toLowerCase().includes(q) : false;

      return matchName || matchSku || matchDesc;
    });
  }, [products, searchQuery, statusFilter]);

  return (
    <Card className="flex flex-col">
      {/* Search & Filter Header */}
      <CardHeader className="p-4 space-y-3 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Client-side Search */}
          <div className="relative flex-1 max-w-md">
            <label htmlFor="inventory-search" className="sr-only">
              Search inventory by name, SKU, or description
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                id="inventory-search"
                type="text"
                placeholder="Search products by name, SKU, description..."
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

          {/* Status Filter Segmented Control */}
          <div
            role="group"
            aria-label="Filter by stock status"
            className="flex items-center self-start sm:self-auto bg-zinc-100 p-0.5 rounded-lg border border-zinc-200 text-xs"
          >
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white text-zinc-900 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('in_stock')}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors ${
                statusFilter === 'in_stock'
                  ? 'bg-white text-emerald-800 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              In Stock
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('low_stock')}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors ${
                statusFilter === 'low_stock'
                  ? 'bg-white text-amber-800 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Low Stock
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('out_of_stock')}
              className={`px-2.5 py-1 font-medium rounded-md transition-colors ${
                statusFilter === 'out_of_stock'
                  ? 'bg-white text-red-800 shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Out of Stock
            </button>
          </div>
        </div>

        {/* Results Count Summary */}
        {products && (
          <div className="flex items-center justify-between text-xs text-zinc-500 pt-1 border-t border-zinc-100">
            <span>
              Showing <strong className="text-zinc-800">{filteredProducts.length}</strong> of{' '}
              {products.length} products
            </span>
            {searchQuery && (
              <span className="text-[11px] text-zinc-400">
                Filtered by &quot;{searchQuery}&quot;
              </span>
            )}
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
              title="Failed to load product catalog"
              message="Could not retrieve products from the server."
              onRetry={onRetry}
            />
          </div>
        )}

        {/* Empty Catalog */}
        {!isLoading && !isError && products && products.length === 0 && (
          <div className="p-6">
            <EmptyState
              title="No products in catalog"
              description="Your inventory catalog is currently empty. Managers can add new items using the button above."
              icon={<PackageOpen className="w-6 h-6 text-zinc-400" />}
            />
          </div>
        )}

        {/* Search No Results */}
        {!isLoading && !isError && products && products.length > 0 && filteredProducts.length === 0 && (
          <div className="p-6">
            <EmptyState
              title="No matching products"
              description={`No products matched the current search or status filter.`}
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              }
            />
          </div>
        )}

        {/* Desktop Table View (hidden on small mobile screens) */}
        {!isLoading && !isError && filteredProducts.length > 0 && (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500 uppercase tracking-wider font-semibold bg-zinc-50/60">
                    <th scope="col" className="py-3 px-4">Product Name</th>
                    <th scope="col" className="py-3 px-3">SKU</th>
                    <th scope="col" className="py-3 px-3">Cat ID</th>
                    <th scope="col" className="py-3 px-3 text-right">Stock</th>
                    <th scope="col" className="py-3 px-3">Status</th>
                    <th scope="col" className="py-3 px-3 text-right">Selling price</th>
                    {isManager && (
                      <th scope="col" className="py-3 px-3 text-right">Cost price</th>
                    )}
                    <th scope="col" className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="hover:bg-zinc-50/80 transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="font-medium text-zinc-900 max-w-[220px] truncate" title={product.name}>
                          {product.name}
                        </div>
                        {product.description && (
                          <div className="text-[11px] text-zinc-400 truncate max-w-[220px]">
                            {product.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-600">
                        {product.sku}
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-500">
                        {product.category_id}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-zinc-900">
                        {product.current_stock}
                      </td>
                      <td className="py-3 px-3">
                        <StockStatusBadge
                          currentStock={product.current_stock}
                          lowStockThreshold={product.low_stock_threshold}
                        />
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-zinc-800">
                        {product.selling_price}
                      </td>
                      {isManager && (
                        <td className="py-3 px-3 text-right font-mono text-emerald-800 font-medium">
                          {product.cost_price !== undefined ? product.cost_price : '—'}
                        </td>
                      )}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => onViewProduct(product)}
                            aria-label={`View details for ${product.name}`}
                            className="p-1 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {onRecordMovement && (
                            <button
                              type="button"
                              onClick={() => onRecordMovement(product)}
                              aria-label={`Record movement for ${product.name}`}
                              className="p-1 text-zinc-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                              title="Record stock movement"
                            >
                              <ArrowLeftRight className="w-4 h-4" />
                            </button>
                          )}

                          {isManager && onEditProduct && (
                            <button
                              type="button"
                              onClick={() => onEditProduct(product)}
                              aria-label={`Edit ${product.name}`}
                              className="p-1 text-zinc-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                              title="Edit product"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Product Card List */}
            <div className="md:hidden divide-y divide-zinc-100">
              {filteredProducts.map((product) => (
                <div key={product.id} className="p-4 space-y-2 hover:bg-zinc-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-900">{product.name}</h4>
                      <p className="font-mono text-xs text-zinc-500">SKU: {product.sku}</p>
                    </div>
                    <StockStatusBadge
                      currentStock={product.current_stock}
                      lowStockThreshold={product.low_stock_threshold}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-1">
                    <div>
                      <span className="text-zinc-500">Stock Level:</span>
                      <p className="font-mono font-bold text-zinc-900">{product.current_stock} units</p>
                    </div>
                    <div>
                      <span className="text-zinc-500">Selling price:</span>
                      <p className="font-mono font-medium text-zinc-900">{product.selling_price}</p>
                    </div>
                    {isManager && 'cost_price' in product && (
                      <div>
                        <span className="text-zinc-500">Cost price:</span>
                        <p className="font-mono font-medium text-emerald-800">
                          {product.cost_price || '—'}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-zinc-500">Category ID:</span>
                      <p className="font-mono text-zinc-700">{product.category_id}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onViewProduct(product)}
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                    >
                      Details
                    </Button>

                    {onRecordMovement && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onRecordMovement(product)}
                        leftIcon={<ArrowLeftRight className="w-3.5 h-3.5" />}
                      >
                        Movement
                      </Button>
                    )}

                    {isManager && onEditProduct && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => onEditProduct(product)}
                        leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

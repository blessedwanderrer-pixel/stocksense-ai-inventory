import React from 'react';
import { Dialog } from '../../../components/ui/Dialog';
import { Button } from '../../../components/ui/Button';
import { StockStatusBadge } from './StockStatusBadge';
import { useAuth } from '../../auth/AuthContext';
import { useProduct } from '../hooks/useInventoryQueries';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ErrorState } from '../../../components/feedback/ErrorState';
import { Edit2, ArrowLeftRight, Layers, Tag, Calendar, FileText } from 'lucide-react';
import type { ProductResponse } from '../../../types/inventory';

interface ProductDetailModalProps {
  productId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (product: ProductResponse) => void;
  onRecordMovement?: (product: ProductResponse) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  productId,
  isOpen,
  onClose,
  onEdit,
  onRecordMovement,
}) => {
  const { user } = useAuth();
  const isManager = user?.role === 'manager';
  const { data: product, isLoading, isError, refetch } = useProduct(productId || undefined);

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
    <Dialog
      isOpen={isOpen && productId !== null}
      onClose={onClose}
      title={product ? product.name : 'Product Details'}
      description={product ? `SKU: ${product.sku}` : 'Loading item catalog specification...'}
      maxWidth="lg"
    >
      {isLoading && (
        <div className="space-y-4 py-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      )}

      {isError && (
        <ErrorState
          title="Failed to load product details"
          message="Could not retrieve the item profile from the server."
          onRetry={() => refetch()}
        />
      )}

      {!isLoading && !isError && product && (
        <div className="space-y-6">
          {/* Header Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-zinc-400" />
                Current Stock
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-xl font-bold font-mono text-zinc-900">
                  {product.current_stock}
                </span>
                <StockStatusBadge
                  currentStock={product.current_stock}
                  lowStockThreshold={product.low_stock_threshold}
                />
              </div>
            </div>

            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Low-Stock Threshold
              </span>
              <div className="mt-1 text-xl font-bold font-mono text-zinc-700">
                {product.low_stock_threshold}
              </div>
            </div>

            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg col-span-2 sm:col-span-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-zinc-400" />
                Category ID
              </span>
              <div className="mt-1 text-xl font-bold font-mono text-zinc-700">
                {product.category_id}
              </div>
            </div>
          </div>

          {/* Pricing Section */}
          <div className="p-4 bg-zinc-50/70 border border-zinc-200 rounded-lg space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-700">
              Pricing Specification
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-zinc-500 block">Selling price</span>
                <span className="text-lg font-bold font-mono text-zinc-900">
                  {product.selling_price}
                </span>
              </div>

              {/* Cost Price visible ONLY to Manager */}
              {isManager && 'cost_price' in product && (
                <div>
                  <span className="text-xs text-zinc-500 block">Cost price</span>
                  <span className="text-lg font-bold font-mono text-emerald-800">
                    {product.cost_price !== undefined ? product.cost_price : 'Not configured'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-zinc-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-zinc-400" />
                Description
              </span>
              <p className="text-xs text-zinc-600 leading-relaxed bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                {product.description}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Created {formatTimestamp(product.created_at)}
            </span>
            <span>ID: {product.id}</span>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-zinc-100 flex flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>

            {onRecordMovement && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onRecordMovement(product as ProductResponse);
                }}
                leftIcon={<ArrowLeftRight className="w-3.5 h-3.5" />}
              >
                Record Movement
              </Button>
            )}

            {isManager && onEdit && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onEdit(product as ProductResponse);
                }}
                leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              >
                Edit Product
              </Button>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
};

import React from 'react';
import { Package, Layers, AlertTriangle, AlertOctagon } from 'lucide-react';
import { KpiCard } from './KpiCard';
import { useInventorySummary } from '../hooks/useDashboardQueries';

export const InventoryKpiGrid: React.FC = () => {
  const { data, isLoading, isError, refetch } = useInventorySummary();

  return (
    <section aria-label="Inventory Overview Key Metrics" className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 tracking-wide uppercase">
          Inventory Summary
        </h2>
        <span className="text-xs text-zinc-500">Live operational counts</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Products"
          value={data?.total_products}
          icon={<Package className="w-4 h-4 text-zinc-700" />}
          subtitle="Catalog SKU count"
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          accentColor="neutral"
        />

        <KpiCard
          title="Units in Stock"
          value={data?.total_units_in_stock}
          icon={<Layers className="w-4 h-4 text-emerald-700" />}
          subtitle="Total physical items"
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          accentColor="success"
        />

        <KpiCard
          title="Low Stock"
          value={data?.low_stock_products}
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          subtitle="At or below threshold"
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          accentColor="warning"
        />

        <KpiCard
          title="Out of Stock"
          value={data?.out_of_stock_products}
          icon={<AlertOctagon className="w-4 h-4 text-red-600" />}
          subtitle="0 units available"
          isLoading={isLoading}
          isError={isError}
          onRetry={() => refetch()}
          accentColor="danger"
        />
      </div>
    </section>
  );
};

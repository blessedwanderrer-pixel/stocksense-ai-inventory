import React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { InventoryKpiGrid } from '../features/dashboard/components/InventoryKpiGrid';
import { LowStockPanel } from '../features/dashboard/components/LowStockPanel';
import { BestSellingWidget } from '../features/dashboard/components/BestSellingWidget';
import { RecentMovementsWidget } from '../features/dashboard/components/RecentMovementsWidget';

export const ManagerDashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Manager Dashboard"
        description="Comprehensive operational metrics, catalog stock health, and sales volume velocity."
      />

      {/* 4 Inventory KPI Cards */}
      <InventoryKpiGrid />

      {/* Two-column operational reporting grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <LowStockPanel />
        <BestSellingWidget />
      </div>

      {/* Full-width audit activity */}
      <div className="w-full">
        <RecentMovementsWidget />
      </div>
    </div>
  );
};

import React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { InventoryKpiGrid } from '../features/dashboard/components/InventoryKpiGrid';
import { LowStockPanel } from '../features/dashboard/components/LowStockPanel';
import { BestSellingWidget } from '../features/dashboard/components/BestSellingWidget';
import { RecentMovementsWidget } from '../features/dashboard/components/RecentMovementsWidget';

export const StaffDashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Operations Dashboard"
        description="Daily retail floor tracking, operational stock thresholds, and physical inventory movement history."
      />

      {/* 4 Inventory KPI Cards */}
      <InventoryKpiGrid />

      {/* Operational panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <LowStockPanel />
        <BestSellingWidget />
      </div>

      {/* Audit activity */}
      <div className="w-full">
        <RecentMovementsWidget />
      </div>
    </div>
  );
};

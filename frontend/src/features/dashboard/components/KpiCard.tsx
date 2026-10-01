import React from 'react';
import { Skeleton } from '../../../components/ui/Skeleton';
import { Card } from '../../../components/ui/Card';
import { RetryControl } from '../../../components/feedback/RetryControl';

export interface KpiCardProps {
  title: string;
  value: number | undefined;
  icon: React.ReactNode;
  subtitle?: string;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  accentColor?: 'neutral' | 'warning' | 'danger' | 'success';
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  isLoading = false,
  isError = false,
  onRetry,
  accentColor = 'neutral',
}) => {
  const accentBorder = {
    neutral: 'border-l-zinc-400',
    success: 'border-l-emerald-500',
    warning: 'border-l-amber-500',
    danger: 'border-l-red-500',
  }[accentColor];

  if (isLoading) {
    return (
      <Card className="p-5 border-l-4 border-l-zinc-200">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="mt-3">
          <Skeleton className="h-9 w-20" />
          {subtitle && <Skeleton className="h-3 w-36 mt-2" />}
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="p-5 border-l-4 border-l-red-400 bg-red-50/20">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-600">{title}</span>
        </div>
        <div className="mt-3">
          <p className="text-xs text-red-600 font-medium mb-2">Failed to load metric</p>
          {onRetry && <RetryControl onRetry={onRetry} size="sm" />}
        </div>
      </Card>
    );
  }

  const formattedValue = value !== undefined ? new Intl.NumberFormat().format(value) : '0';

  return (
    <Card
      className={`p-5 border-l-4 ${accentBorder} hover:shadow-xs transition-shadow flex flex-col justify-between`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          {title}
        </span>
        <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
          {icon}
        </div>
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight text-zinc-900" data-testid="kpi-value">
          {formattedValue}
        </div>
        {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
      </div>
    </Card>
  );
};

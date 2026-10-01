import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded bg-zinc-200/80 dark:bg-zinc-800 ${className}`}
      {...props}
    />
  );
};

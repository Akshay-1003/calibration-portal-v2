import React from 'react';
import { cn } from '../../../lib/utils';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Loader: React.FC<LoaderProps> = ({ size = 'md', className }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-gray-300 border-t-blue-600',
        sizeClasses[size],
        className
      )}
    />
  );
};

interface TableLoaderProps {
  colSpan?: number;
  className?: string;
}

export const TableLoader: React.FC<TableLoaderProps> = ({ 
  colSpan = 1, 
  className 
}) => {
  return (
    <tr>
      <td 
        colSpan={colSpan} 
        className={cn(
          'text-center py-8',
          className
        )}
      >
        <div className="flex items-center justify-center space-x-2">
          <Loader size="md" />
          <span className="text-gray-500">Loading...</span>
        </div>
      </td>
    </tr>
  );
};

interface PageLoaderProps {
  message?: string;
  className?: string;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ 
  message = 'Loading...', 
  className 
}) => {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center min-h-[200px] space-y-4',
      className
    )}>
      <Loader size="lg" />
      <p className="text-gray-500">{message}</p>
    </div>
  );
};

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({ 
  rows = 5, 
  cols = 4, 
  className 
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-2">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div
              key={colIndex}
              className="h-4 bg-gray-200 rounded animate-pulse flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
};

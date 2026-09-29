/**
 * High-Performance Virtualized Table Component
 * Optimized for large datasets (>100 items) with smooth scrolling
 */

import { useMemo, useRef, useCallback, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

// Types
interface VirtualizedTableProps<T> {
  data: T[];
  columns: ColumnConfig<T>[];
  rowHeight?: number | ((index: number) => number);
  height?: number;
  className?: string;
  onRowClick?: (item: T, index: number) => void;
  isLoading?: boolean;
  emptyMessage?: string;
}

export interface ColumnConfig<T> {
  key: keyof T;
  label: string;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  render?: (value: T[keyof T], item: T, index: number) => React.ReactNode;
}

// Memoized row component to prevent re-renders
interface VirtualizedRowProps<T> {
  index: number;
  style: React.CSSProperties;
  data: T[];
  columns: ColumnConfig<T>[];
  onRowClick?: (item: T, index: number) => void;
}

function VirtualizedRow<T>({ index, style, data, columns, onRowClick }: VirtualizedRowProps<T>) {
  const item = data[index];
  
  const handleRowClick = useCallback(() => {
    onRowClick?.(item, index);
  }, [item, index, onRowClick]);

  return (
    <div 
      style={style}
      className={`flex border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
      onClick={handleRowClick}
    >
      {columns.map((column) => (
        <div
          key={String(column.key)}
          className="px-4 py-2 flex items-center text-sm"
          style={{ 
            width: column.width || 'auto',
            minWidth: column.minWidth || 100,
            maxWidth: column.maxWidth || 'none'
          }}
        >
          {column.render 
            ? column.render(item[column.key], item, index)
            : String(item[column.key] || '')
          }
        </div>
      ))}
    </div>
  );
}

const MemoizedVirtualizedRow = memo(VirtualizedRow) as typeof VirtualizedRow;

export const VirtualizedTable = <T,>({
  data,
  columns,
  rowHeight = 50,
  height = 400,
  className = '',
  onRowClick,
  isLoading = false,
  emptyMessage = 'No data available'
}: VirtualizedTableProps<T>) => {
  const parentRef = useRef<HTMLDivElement>(null);

  // Memoize columns to prevent re-renders
  const memoizedColumns = useMemo(() => columns, [columns]);
  
  // Memoize data to prevent re-renders
  const memoizedData = useMemo(() => data, [data]);

  // Calculate total width for header
  const totalWidth = useMemo(() => {
    return memoizedColumns.reduce((sum, col) => sum + (col.width || 150), 0);
  }, [memoizedColumns]);

  // Virtualizer configuration
  const rowVirtualizer = useVirtualizer({
    count: memoizedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: useCallback(() => {
      return typeof rowHeight === 'function' ? rowHeight(0) : rowHeight;
    }, [rowHeight]),
    overscan: 5, // Render 5 extra rows above/below viewport
  });

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Empty state
  if (memoizedData.length === 0) {
    return (
      <div className={`flex items-center justify-center h-96 text-gray-500 ${className}`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`industrial-table-wrapper border border-gray-200 rounded-md overflow-hidden ${className}`}>
      {/* Fixed Header */}
      <div className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
        <div className="flex" style={{ width: totalWidth }}>
          {memoizedColumns.map((column) => (
            <div
              key={String(column.key)}
              className="px-4 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider"
              style={{ 
                width: column.width || 'auto',
                minWidth: column.minWidth || 100,
                maxWidth: column.maxWidth || 'none'
              }}
            >
              {column.label}
            </div>
          ))}
        </div>
      </div>

      {/* Virtualized Body */}
      <div
        ref={parentRef}
        className="relative overflow-auto"
        style={{ height }}
      >
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => (
            <MemoizedVirtualizedRow
              key={virtualItem.index}
              index={virtualItem.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              data={memoizedData}
              columns={memoizedColumns}
              onRowClick={onRowClick}
            />
          ))}
        </div>
      </div>

      {/* Footer with row count */}
      <div className="bg-slate-50 px-4 py-2 border-t border-slate-200">
        <div className="text-sm text-slate-700">
          Showing {memoizedData.length} {memoizedData.length === 1 ? 'row' : 'rows'}
        </div>
      </div>
    </div>
  );
};

VirtualizedTable.displayName = 'VirtualizedTable';

// Utility function to determine if virtualization should be used
export const shouldUseVirtualization = (dataLength: number, threshold = 100) => {
  return dataLength > threshold;
};

// HOC to automatically apply virtualization based on data size
export const withVirtualization = <T, P extends { data?: T[]; columns: ColumnConfig<T>[] }>(
  TableComponent: React.ComponentType<P>,
  threshold = 100
) => {
  return memo((props: P) => {
    const { data, columns } = props;
    
    if (shouldUseVirtualization(data?.length || 0, threshold)) {
      return <VirtualizedTable<T> data={data || []} columns={columns} />;
    }
    
    return <TableComponent {...props} />;
  });
};

export default VirtualizedTable;

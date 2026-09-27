/**
 * Optimized Inward Table with Virtualization and Performance Enhancements
 * Automatically switches to virtualized rendering for large datasets
 */

import { useMemo, memo, useCallback } from 'react';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Button,
  Pagination,
  Select,
  SelectItem,
  DatePicker,
} from '@heroui-v2/react';
import {
  MagnifyingGlassIcon,
  TrashIcon,
  PrinterIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import type { ClientData } from '../../hooks/useInwardTableController';
import type { InwardTableState, InwardTableHandlers } from '../../hooks/useInwardTableController';
import { VirtualizedTable, shouldUseVirtualization } from '../../shared/components/VirtualizedTable';
import '../../styles/industrial-table.css';

type TableColumnKey =
  | 'sr_no'
  | 'client_org_name'
  | 'client_dc_no'
  | 'client_dc_date'
  | 'through'
  | 'inward_date'
  | 'received_date'
  | 'actions';

const columns: { name: string; uid: TableColumnKey; sortable?: boolean }[] = [
  { name: 'SR NO', uid: 'sr_no' },
  { name: 'ACTIONS', uid: 'actions' },
  { name: 'CLIENT ORGANIZATION', uid: 'client_org_name', sortable: true },
  { name: 'CLIENT DC NO', uid: 'client_dc_no', sortable: true },
  { name: 'CLIENT DC DATE', uid: 'client_dc_date', sortable: true },
  { name: 'THROUGH', uid: 'through' },
  { name: 'INWARD DATE', uid: 'inward_date', sortable: true },
  { name: 'RECEIVED DATE', uid: 'received_date', sortable: true },
];
void INITIAL_VISIBLE_COLUMNS;

const INITIAL_VISIBLE_COLUMNS: TableColumnKey[] = [
  'sr_no',
  'client_org_name',
  'client_dc_no',
  'inward_date',
  'received_date',
  'actions',
];

// Memoized Actions Cell to prevent re-renders
const ActionsCell = memo(
  ({
    item,
    onRegisterGauge,
    onDelete,
    onPrintChalan,
    onEdit,
  }: {
    item: ClientData;
    onRegisterGauge: (inward: ClientData) => void;
    onDelete: (inward: ClientData) => void;
    onPrintChalan?: (inward: ClientData) => void;
    onEdit?: (inward: ClientData) => void;
  }) => {
    const handleRegisterGauge = useCallback(() => {
      console.log('item',item)
      onRegisterGauge(item);
    }, [item, onRegisterGauge]);

    const handleDelete = useCallback(() => {
      onDelete(item);
    }, [item, onDelete]);

    const handlePrintChalan = useCallback(() => {
      onPrintChalan?.(item);
    }, [item, onPrintChalan]);

    const handleEdit = useCallback(() => {
      onEdit?.(item);
    }, [item, onEdit]);

    return (
      <div className="flex gap-2 items-center">
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white h-7 px-3 text-xs"
          onPress={handleRegisterGauge}
          aria-label="Add gauges to inward entry"
        >
          Add Gauges
        </Button>
        {onPrintChalan && (
          <Button
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white h-7 px-3 text-xs"
            onPress={handlePrintChalan}
            aria-label="Print Inward Chalan"
          >
            <PrinterIcon className="w-4 h-4" />
          </Button>
        )}
        {onEdit && (
          <Button
            size="sm"
            className="bg-white border border-blue-600 text-blue-600 hover:bg-blue-100 h-7"
            onPress={handleEdit}
            aria-label="Edit inward entry"
          >
            <PencilSquareIcon className="w-4 h-4" />
          </Button>
        )}
        <Button
          size="sm"
          className="bg-red-600 hover:bg-red-700 text-white h-7 px-3 text-xs"
          onPress={handleDelete}
          aria-label="Delete inward entry"
        >
          <TrashIcon className="w-4 h-4" />
        </Button>
      </div>
    );
  }
);

ActionsCell.displayName = 'ActionsCell';

// Memoized Search Component
const SearchInput = memo(
  ({
    value,
    onChange,
    onClear,
  }: {
    value: string;
    onChange: (value: string) => void;
    onClear: () => void;
  }) => {
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    }, [onChange]);

    return (
      <Input
        isClearable
        placeholder="Search by client name, DC no..."
        startContent={<MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />}
        value={value}
        onClear={onClear}
        onChange={handleChange}
        classNames={{
          base: "w-full sm:max-w-[40%]",
          inputWrapper: "border-gray-300",
        }}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';

// Memoized Filter Controls
const FilterControls = memo(
  ({
    state,
    handlers,
  }: {
    state: InwardTableState;
    handlers: InwardTableHandlers;
  }) => {
    const handleStatusChange = useCallback((keys: any) => {
      handlers.onStatusChange(Array.from(keys).join(','));
    }, [handlers]);

    const handleDateFilterChange = useCallback((dates: any) => {
      handlers.onDateFilterChange(dates);
    }, [handlers]);

    return (
      <div className="flex gap-4 items-center">
        <Select
          placeholder="Select Status"
          selectedKeys={state.statusFilter ? [state.statusFilter] : []}
          onSelectionChange={handleStatusChange}
          className="w-48"
          classNames={{
            trigger: "border-gray-300",
          }}
        >
          <SelectItem key="all" value="all">All Status</SelectItem>
          <SelectItem key="pending" value="pending">Pending</SelectItem>
          <SelectItem key="in_progress" value="in_progress">In Progress</SelectItem>
          <SelectItem key="completed" value="completed">Completed</SelectItem>
        </Select>

        <DatePicker
          label="Filter by Date"
          value={state.dateFilter}
          onChange={handleDateFilterChange}
          className="w-48"
        />
      </div>
    );
  }
);

FilterControls.displayName = 'FilterControls';

// Main Optimized Inward Table Component
interface OptimizedInwardTableProps {
  state: InwardTableState;
  handlers: InwardTableHandlers;
  organizations?: Array<{ id: string; name: string }>;
  organizationsLoading?: boolean;
}

const OptimizedInwardTable = memo(({
  state,
  handlers,
  organizations,
  organizationsLoading,
}: OptimizedInwardTableProps) => {
  void organizations;
  void organizationsLoading;
  // Memoize filtered data
  const filteredData = useMemo(() => {
    if (!state.data) return [];
    
    return state.data.filter((item: ClientData) => {
      const matchesSearch = !state.searchFilter || 
        item.client_org_name?.toLowerCase().includes(state.searchFilter.toLowerCase()) ||
        item.client_dc_no?.toLowerCase().includes(state.searchFilter.toLowerCase());
      
      const matchesStatus = !state.statusFilter || 
        item.status === state.statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [state.data, state.searchFilter, state.statusFilter]);

  // Memoize columns for virtualized table
  const virtualizedColumns = useMemo(() => [
    { key: 'sr_no', label: 'SR NO', width: 80 },
    { key: 'client_org_name', label: 'CLIENT ORGANIZATION', width: 200, minWidth: 150 },
    { key: 'client_dc_no', label: 'CLIENT DC NO', width: 120 },
    { key: 'client_dc_date', label: 'CLIENT DC DATE', width: 120 },
    { key: 'through', label: 'THROUGH', width: 100 },
    { key: 'inward_date', label: 'INWARD DATE', width: 120 },
    { key: 'received_date', label: 'RECEIVED DATE', width: 120 },
    { 
      key: 'actions', 
      label: 'ACTIONS', 
      width: 300,
      render: (_value: any, item: ClientData) => (
        <ActionsCell
          item={item}
          onRegisterGauge={handlers.onRegisterGauge}
          onDelete={handlers.onDelete}
          onPrintChalan={handlers.onPrintChalan}
          onEdit={handlers.onEdit}
        />
      )
    },
  ], [handlers]);

  // Memoize pagination data
  const paginatedData = useMemo(() => {
    const startIndex = (state.pagination.currentPage - 1) * state.pagination.pageSize;
    const endIndex = startIndex + state.pagination.pageSize;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, state.pagination.currentPage, state.pagination.pageSize]);

  // Determine if virtualization should be used
  const useVirtualization = shouldUseVirtualization(filteredData.length, 100);

  // Memoize table content based on virtualization
  const tableContent = useMemo(() => {
    if (useVirtualization) {
      return (
        <VirtualizedTable
          data={filteredData}
          columns={virtualizedColumns}
          height={400}
          className="min-w-[800px]"
          onRowClick={(item: ClientData) => handlers.onEdit?.(item)}
        />
      );
    }

    // Traditional table for smaller datasets
    return (
      <Table
        aria-label="Inward Entries Table"
        removeWrapper
        classNames={{
          wrapper: "min-h-[400px]",
        }}
      >
        <TableHeader columns={columns}>
          {(column) => (
            <TableColumn
              key={column.uid}
              allowsSorting={column.sortable}
              className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              {column.name}
            </TableColumn>
          )}
        </TableHeader>
        <TableBody
          items={paginatedData}
          isLoading={state.isLoading}
          loadingContent={<div className="animate-pulse">Loading...</div>}
          emptyContent="No inward entries found"
        >
          {(item: ClientData) => (
            <TableRow key={item.id}>
              {(columnKey) => {
                const column = columns.find(col => col.uid === columnKey);
                void column;
                if (columnKey === 'actions') {
                  return (
                    <TableCell>
                      <ActionsCell
                        item={item}
                        onRegisterGauge={handlers.onRegisterGauge}
                        onDelete={handlers.onDelete}
                        onPrintChalan={handlers.onPrintChalan}
                        onEdit={handlers.onEdit}
                      />
                    </TableCell>
                  );
                }
                
                const value = item[columnKey as keyof ClientData];
                return (
                  <TableCell className="text-sm">
                    {value || '-'}
                  </TableCell>
                );
              }}
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  }, [
    useVirtualization,
    filteredData,
    virtualizedColumns,
    paginatedData,
    state.isLoading,
    handlers
  ]);

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <SearchInput
          value={state.searchFilter || ''}
          onChange={handlers.onSearchChange}
          onClear={handlers.onClearSearch}
        />
        
        <FilterControls
          state={state}
          handlers={handlers}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {tableContent}
      </div>

      {/* Pagination - Only show for non-virtualized table */}
      {!useVirtualization && (
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-700">
            Showing {paginatedData.length} of {filteredData.length} entries
          </span>
          <Pagination
            total={Math.ceil(filteredData.length / state.pagination.pageSize)}
            page={state.pagination.currentPage}
            onChange={handlers.onPageChange}
            showControls
            showShadow
            size="sm"
          />
        </div>
      )}

      {/* Virtualization Info */}
      {useVirtualization && (
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>Showing {filteredData.length} entries (virtualized)</span>
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            Performance Mode
          </span>
        </div>
      )}
    </div>
  );
});

OptimizedInwardTable.displayName = 'OptimizedInwardTable';

export default OptimizedInwardTable;

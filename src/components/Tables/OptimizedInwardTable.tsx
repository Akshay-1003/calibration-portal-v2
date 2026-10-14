/**
 * Optimized Inward Table with Virtualization and Performance Enhancements
 * Automatically switches to virtualized rendering for large datasets
 */

import { useMemo, memo, useCallback } from 'react';
import {
  Table,
  Input,
  Button,
  Calendar,
  DateField,
  DatePicker,
} from '@heroui/react';
import type { DateValue } from '@internationalized/date';
import { getTableColumnKey } from './tableColumnKey';
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
import { TablePagination } from "./TablePagination";
import { dataTableClassName } from "./tableStyles";

function OptimizedDatePicker({
  value,
  onChange,
}: {
  value: DateValue | null;
  onChange: (value: DateValue | null) => void;
}) {
  return (
    <DatePicker value={value} onChange={onChange} aria-label="Filter by Date" granularity="day" className="w-48">
      <DateField.Group fullWidth>
        <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger><DatePicker.TriggerIndicator /></DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover>
        <Calendar aria-label="Filter by Date">
          <Calendar.Header>
            <Calendar.YearPickerTrigger><Calendar.YearPickerTriggerHeading /><Calendar.YearPickerTriggerIndicator /></Calendar.YearPickerTrigger>
            <Calendar.NavButton slot="previous" />
            <Calendar.NavButton slot="next" />
          </Calendar.Header>
          <Calendar.Grid>
            <Calendar.GridHeader>{(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}</Calendar.GridHeader>
            <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
          </Calendar.Grid>
          <Calendar.YearPickerGrid>
            <Calendar.YearPickerGridBody>{({ year }) => <Calendar.YearPickerCell year={year} />}</Calendar.YearPickerGridBody>
          </Calendar.YearPickerGrid>
        </Calendar>
      </DatePicker.Popover>
    </DatePicker>
  );
}

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
const INITIAL_VISIBLE_COLUMNS: TableColumnKey[] = [
  'sr_no',
  'client_org_name',
  'client_dc_no',
  'inward_date',
  'received_date',
  'actions',
];
void INITIAL_VISIBLE_COLUMNS;

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
      <div className="flex items-center gap-2 w-full sm:max-w-[40%]">
        <Input
          placeholder="Search by client name, DC no..."
          value={value}
          onChange={handleChange}
          className="w-full"
        />
        {value ? (
          <Button type="button" variant="ghost" aria-label="Clear inward search" onPress={onClear}>
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400" />
          </Button>
        ) : null}
      </div>
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
    return (
      <div className="flex gap-4 items-center">
        <OptimizedDatePicker
          value={state.startDate}
          onChange={handlers.onStartDateChange}
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
      const matchesSearch = !state.searchValue ||
        item.client_org_name?.toLowerCase().includes(state.searchValue.toLowerCase()) ||
        item.client_dc_no?.toLowerCase().includes(state.searchValue.toLowerCase());
      return matchesSearch;
    });
  }, [state.data, state.searchValue]);

  // Memoize columns for virtualized table
  const virtualizedColumns = useMemo<Array<{ key: keyof ClientData; label: string; width: number; minWidth?: number; render?: (value: unknown, item: ClientData) => React.ReactNode }>>(() => [
    { key: 'id', label: 'SR NO', width: 80 },
    { key: 'client_org_name', label: 'CLIENT ORGANIZATION', width: 200, minWidth: 150 },
    { key: 'client_dc_no', label: 'CLIENT DC NO', width: 120 },
    { key: 'client_dc_date', label: 'CLIENT DC DATE', width: 120 },
    { key: 'through', label: 'THROUGH', width: 100 },
    { key: 'inward_date', label: 'INWARD DATE', width: 120 },
    { key: 'received_date', label: 'RECEIVED DATE', width: 120 },
    { 
      key: 'id',
      label: 'ACTIONS', 
      width: 300,
      render: (_value: unknown, item: ClientData) => (
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
    const startIndex = (state.page - 1) * state.rowsPerPage;
    const endIndex = startIndex + state.rowsPerPage;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, state.page, state.rowsPerPage]);

  // Determine if virtualization should be used
  const useVirtualization = shouldUseVirtualization(filteredData.length, 100);

  // Memoize table content based on virtualization
  const tableContent = useMemo(() => {
    if (useVirtualization) {
      return (
        <VirtualizedTable<ClientData>
          data={filteredData}
          columns={virtualizedColumns}
          height={400}
          className="min-w-[800px]"
          onRowClick={(item) => handlers.onEdit(item)}
        />
      );
    }

    // Traditional table for smaller datasets
    return (
      <Table aria-label="Inward Entries Table" className={dataTableClassName("min-w-full")}>
        <Table.ScrollContainer className="min-h-[400px]">
        <Table.Content>
        <Table.Header columns={columns}>
          {(column) => (
            <Table.Column
              id={column.uid}
              allowsSorting={column.sortable}
              isRowHeader={column.uid === columns[0]?.uid}
            >
              {column.name}
            </Table.Column>
          )}
        </Table.Header>
        <Table.Body
          items={paginatedData}
          renderEmptyState={() => <div className="py-8 text-center text-sm text-default-500">{state.loading ? 'Loading...' : 'No inward entries found'}</div>}
        >
          {(item: ClientData) => (
            <Table.Row id={item.id} columns={columns}>
              {(columnKey) => {
                const columnName = getTableColumnKey(columnKey) as TableColumnKey;
                const column = columns.find(col => col.uid === columnName);
                void column;
                if (columnName === 'actions') {
                  return (
                    <Table.Cell>
                      <ActionsCell
                        item={item}
                        onRegisterGauge={handlers.onRegisterGauge}
                        onDelete={handlers.onDelete}
                        onPrintChalan={handlers.onPrintChalan}
                        onEdit={handlers.onEdit}
                      />
                    </Table.Cell>
                  );
                }
                
                const value = item[columnName as keyof ClientData];
                return (
                  <Table.Cell>
                    {value || '-'}
                  </Table.Cell>
                );
              }}
            </Table.Row>
          )}
        </Table.Body>
        </Table.Content>
        </Table.ScrollContainer>
      </Table>
    );
  }, [
    useVirtualization,
    filteredData,
    virtualizedColumns,
    paginatedData,
    state.loading,
    handlers
  ]);

  return (
    <div className="industrial-table-wrapper space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <SearchInput
          value={state.searchValue}
          onChange={handlers.onSearchChange}
          onClear={handlers.onSearchClear}
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
          <TablePagination page={state.page} totalPages={Math.max(1, Math.ceil(filteredData.length / state.rowsPerPage))} onPageChange={handlers.onPageChange} />
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

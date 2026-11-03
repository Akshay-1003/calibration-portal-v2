"use client";

import { useMemo, memo, useCallback } from 'react';
import {
  Table,
  Button,
  ListBox,
  Select,
  Chip,
  Alert,
} from '@heroui/react';
import {
  TrashIcon,
  EyeIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { getTableColumnKey } from './tableColumnKey';
import type { RepairEntry, RepairTableState, RepairTableHandlers } from '../../types/repair';
import '../../styles/industrial-table.css';
import { TablePagination } from "./TablePagination";
import { dataTableClassName } from "./tableStyles";
import { SearchField } from "@heroui/react";

type TableColumnKey =
  | 'sr_no'
  | 'repair_no'
  | 'repair_date'
  | 'client_org_name'
  | 'item_count'
  | 'repair_type'
  | 'repair_status'
  | 'estimated_cost'
  | 'actions';

const columns: { name: string; uid: TableColumnKey; sortable?: boolean }[] = [
  { name: 'SR NO', uid: 'sr_no' },
  { name: 'REPAIR NO', uid: 'repair_no', sortable: true },
  { name: 'REPAIR DATE', uid: 'repair_date', sortable: true },
  { name: 'CLIENT', uid: 'client_org_name', sortable: true },
  { name: 'ITEMS', uid: 'item_count', sortable: true },
  { name: 'TYPE', uid: 'repair_type', sortable: true },
  { name: 'STATUS', uid: 'repair_status', sortable: true },
  { name: 'EST. COST', uid: 'estimated_cost', sortable: true },
  { name: 'ACTIONS', uid: 'actions' },
];

const INITIAL_VISIBLE_COLUMNS: TableColumnKey[] = [
  'sr_no',
  'repair_no',
  'repair_date',
  'client_org_name',
  'item_count',
  'repair_type',
  'repair_status',
  'estimated_cost',
  'actions',
];

const statusColorMap: Record<string, 'success' | 'warning' | 'danger' | 'default' | 'accent'> = {
  draft: 'default',
  pending: 'warning',
  under_inspection: 'warning',
  in_progress: 'accent',
  repair_in_progress: 'accent',
  completed: 'success',
  calibration_pending: 'warning',
  on_hold: 'warning',
  cancelled: 'danger',
};

const repairTypeColorMap: Record<string, 'accent' | 'warning'> = {
  repair_only: 'accent',
  repair_and_calibration: 'warning',
};

// Actions Cell Component
const ActionsCell = memo(({
  repair,
  onEdit,
  onDelete,
  onView
}: {
  repair: RepairEntry;
  onEdit: (repair: RepairEntry) => void;
  onDelete: (repair: RepairEntry) => void;
  onView: (repair: RepairEntry) => void;
}) => {
  return (
    <div className="relative flex items-center gap-2">
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        onPress={() => onView(repair)}
        aria-label={`View repair ${repair.repair_no}`}
      >
        <EyeIcon className="h-4 w-4" />
      </Button>
      <Button
        isIconOnly
        size="sm"
        variant="ghost"
        onPress={() => onEdit(repair)}
        aria-label={`Edit repair ${repair.repair_no}`}
      >
        <PencilSquareIcon className="h-4 w-4" />
      </Button>
      <Button
        isIconOnly
        size="sm"
        variant="danger-soft"
        onPress={() => onDelete(repair)}
        aria-label={`Delete repair ${repair.repair_no}`}
      >
        <TrashIcon className="h-4 w-4" />
      </Button>
    </div>
  );
});

ActionsCell.displayName = 'ActionsCell';

interface RepairTableViewProps {
  state: RepairTableState;
  handlers: Pick<
    RepairTableHandlers,
    | 'onPageChange'
    | 'onRowsPerPageChange'
    | 'onSearchChange'
    | 'onSearchClear'
    | 'onSortChange'
    | 'onSelectionChange'
    | 'onClientOrgChange'
    | 'onEdit'
    | 'onDelete'
    | 'onView'
    | 'onRefresh'
  >;
  organizations?: Array<{ id: string; name: string }>;
  organizationsLoading?: boolean;
}

/**
 * Pure Table View Component
 * Receives all state and handlers from controller
 */
export const RepairTable = memo<RepairTableViewProps>(
  ({ state, handlers, organizations = [], organizationsLoading = false }) => {
    const {
      data,
      page,
      rowsPerPage,
      selectedKeys,
      sortDescriptor,
      loading,
      error,
      clientOrgId,
    } = state;

    const {
      onPageChange,
      onRowsPerPageChange,
      onSearchChange,
      onSearchClear,
      onSortChange,
      onSelectionChange,
      onClientOrgChange,
      onEdit,
      onDelete,
      onView,
      onRefresh,
    } = handlers;

    // Use searchValue from state prop (synced with URL via controller)
    const { searchValue } = state;

    // Filter and sort data
    const filteredItems = useMemo(() => {
      let filteredData = [...data];

      // Apply search filter
      if (searchValue) {
        filteredData = filteredData.filter((item) =>
          item.repair_no.toLowerCase().includes(searchValue.toLowerCase()) ||
          item.client_org_name.toLowerCase().includes(searchValue.toLowerCase()) ||
          item.gauge_type.toLowerCase().includes(searchValue.toLowerCase())
        );
      }

      // Apply organization filter
      if (clientOrgId) {
        filteredData = filteredData.filter((item) => item.client_org_id === clientOrgId);
      }

      return filteredData;
    }, [data, searchValue, clientOrgId]);

    // Sort data
    const sortedItems = useMemo(() => {
      return [...filteredItems].sort((a, b) => {
        const first = a[sortDescriptor.column as keyof RepairEntry];
        const second = b[sortDescriptor.column as keyof RepairEntry];

        if (first === null || first === undefined) return 1;
        if (second === null || second === undefined) return -1;

        const cmp = first < second ? -1 : first > second ? 1 : 0;
        return sortDescriptor.direction === 'descending' ? -cmp : cmp;
      });
    }, [filteredItems, sortDescriptor]);

    // Paginate data
    const paginatedItems = useMemo(() => {
      const start = (page - 1) * rowsPerPage;
      return sortedItems.slice(start, start + rowsPerPage);
    }, [sortedItems, page, rowsPerPage]);

    // Render cell content
    const renderCell = useCallback((repair: RepairEntry, columnKey: TableColumnKey, index: number) => {
      const cellValue = repair[columnKey as keyof RepairEntry];

      switch (columnKey) {
        case 'sr_no':
          return (
            <div className="text-center font-medium">
              {(page - 1) * rowsPerPage + index + 1}
            </div>
          );

        case 'repair_no':
          return (
            <div className="font-medium text-blue-600">
              {repair.repair_no}
            </div>
          );

        case 'repair_date':
          return (
            <div className="text-sm">
              {new Date(repair.repair_date).toLocaleDateString('en-GB')}
            </div>
          );

        case 'client_org_name':
          return (
            <div className="font-medium">
              {repair.client_org_name}
            </div>
          );

        case 'item_count':
          return (
            <div>
              <div className="font-medium">{repair.item_count}</div>
              <div className="text-xs text-slate-500">{repair.item_count === 1 ? 'item' : 'items'}</div>
            </div>
          );

        case 'repair_type':
          return (
            <Chip
              size="sm"
              variant="soft"
              color={repairTypeColorMap[repair.repair_type] || 'accent'}
            >
              {repair.repair_type.replaceAll('_', ' ').toUpperCase()}
            </Chip>
          );

        case 'repair_status':
          return (
            <Chip
              size="sm"
              variant="soft"
              color={statusColorMap[repair.repair_status] || 'default'}
            >
              {repair.repair_status.replaceAll('_', ' ').toUpperCase()}
            </Chip>
          );

        case 'estimated_cost':
          return (
            <div className="text-right font-medium">
              ₹{repair.estimated_cost.toFixed(2)}
            </div>
          );

        case 'actions':
          return (
            <ActionsCell
              repair={repair}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={onView}
            />
          );

        default:
          return cellValue as string;
      }
    }, [page, rowsPerPage, onEdit, onDelete, onView]);

    // Table header columns
    const headerColumns = useMemo(() => {
      if (columns.length > 0) return columns;
      return columns.filter((column) => INITIAL_VISIBLE_COLUMNS.includes(column.uid));
    }, []);

    // Loading content
    const loadingContent = useMemo(() => (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading repairs...</span>
      </div>
    ), []);

    // Empty content
    const emptyContent = useMemo(() => (
      <div className="py-8 text-center text-slate-500">No repairs found</div>
    ), []);

    // Top content with search and organization selection
    const topContent = useMemo(() => (
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex flex-1 items-center gap-2">
          <SearchField
            className="w-full flex-1"
            name="search"
            variant="secondary"
            aria-label="Search repairs"
            value={searchValue}
            onChange={onSearchChange}
            onClear={onSearchClear}
          >
            <SearchField.Group>
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Search by repair no, client, or item..." />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>

        </div>

        <Select
          aria-label="Client Organization"
          placeholder="All client organizations"
          selectedKey={clientOrgId || 'all'}
          onSelectionChange={(key) => onClientOrgChange(key === 'all' ? '' : String(key || ''))}
          className="w-full sm:max-w-xs"
          isDisabled={organizationsLoading}
        >
          <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
          <Select.Popover><ListBox>
            <ListBox.Item id="all" textValue="All client organizations">All client organizations<ListBox.ItemIndicator /></ListBox.Item>
            {organizations.map((org) => <ListBox.Item key={org.id} id={org.id} textValue={org.name}>{org.name}<ListBox.ItemIndicator /></ListBox.Item>)}
          </ListBox></Select.Popover>
        </Select>
      </div>
    ), [
      searchValue,
      onSearchChange,
      onSearchClear,
      clientOrgId,
      onClientOrgChange,
      organizations,
      organizationsLoading,
    ]);

    // Bottom content with pagination
    const bottomContent = useMemo(() => (
      <div className="flex items-center justify-between px-2 py-2">
        <TablePagination
          page={page}
          totalPages={Math.max(1, Math.ceil(filteredItems.length / rowsPerPage))}
          onPageChange={onPageChange}
        />

        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-sm text-slate-600">Rows per page:</span>

          <Select
            aria-label="Rows per page"
            className="w-[80px]"
            value={String(rowsPerPage)}
            onChange={(key) => key != null && onRowsPerPageChange(Number(key))}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {['10', '25', '50'].map((size) => (
                  <ListBox.Item key={size} id={size} textValue={size}>
                    {size}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      </div>
    ), [filteredItems.length, page, rowsPerPage, onPageChange, onRowsPerPageChange]);

    if (error) {
      return (
        <div className="p-2">
          <div className="industrial-table-wrapper">
            <Alert status="danger" className="m-4">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>Unable to load repairs</Alert.Title>
                <Alert.Description>{error}</Alert.Description>
              </Alert.Content>
            </Alert>
            <div className="flex justify-center pb-6">
              <Button size="sm" variant="primary" onPress={onRefresh}>Try Again</Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-2">
        <div className="industrial-table-wrapper">
          <div className="mb-4">{topContent}</div>
          <Table aria-label="Repair entries table" className={dataTableClassName("min-w-full")}>
            <Table.ScrollContainer className="max-h-[calc(100vh-320px)]"><Table.Content selectedKeys={selectedKeys} selectionMode="multiple" sortDescriptor={sortDescriptor} onSelectionChange={(keys) => onSelectionChange(keys as Set<string>)} onSortChange={onSortChange}>
              <Table.Header columns={headerColumns}>
                {(column) => (
                  <Table.Column id={column.uid} allowsSorting={column.sortable} isRowHeader={column.uid === columns[0]?.uid}>
                    {column.name}
                  </Table.Column>
                )}
              </Table.Header>
              <Table.Body
                items={paginatedItems}
                renderEmptyState={() => <div className="py-8 text-center text-sm text-default-500">{loading ? loadingContent : emptyContent}</div>}
              >
                {paginatedItems.map((item, index) => (
                  <Table.Row key={item.id} id={item.id} columns={headerColumns}>
                    {(columnKey) => (
                      <Table.Cell>{renderCell(item, getTableColumnKey(columnKey) as TableColumnKey, index)}</Table.Cell>
                    )}
                  </Table.Row>
                ))}
              </Table.Body></Table.Content></Table.ScrollContainer>
          </Table>
          {bottomContent}
        </div>
      </div>
    );
  });

RepairTable.displayName = 'RepairTable';

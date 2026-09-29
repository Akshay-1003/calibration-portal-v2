

import { useMemo, memo, useCallback, useEffect } from 'react';
import {
  Table,
  Input,
  Button,
  Label,
  ListBox,
  Pagination,
  Select,
  DatePicker,
  DateField,
  Calendar,
} from '@heroui/react';
import type { Key } from '@react-types/shared';
import type { DateValue } from '@internationalized/date';
import { I18nProvider } from '@react-aria/i18n';
import { getTableColumnKey } from './tableColumnKey';
import {
  MagnifyingGlassIcon,
  TrashIcon,
  PrinterIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import type { ClientData } from '../../hooks/useInwardTableController';
import type { InwardTableState, InwardTableHandlers } from '../../hooks/useInwardTableController';
import '../../styles/industrial-table.css';
import { SearchField } from '@heroui/react/search-field';

type TableColumnKey =
  | 'sr_no'
  | 'client_org_name'
  | 'client_dc_no'
  | 'client_dc_date'
  | 'through'
  | 'inward_date'
  | 'received_date'
  | 'actions';

function InwardDatePicker({
  value,
  onChange,
  ariaLabel,
}: {
  value: DateValue | null;
  onChange: (value: DateValue | null) => void;
  ariaLabel: string;
}) {
  return (
    <DatePicker value={value} onChange={onChange} aria-label={ariaLabel} granularity="day">
      <DateField.Group fullWidth>
        <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
        <DateField.Suffix>
          <DatePicker.Trigger>
            <DatePicker.TriggerIndicator />
          </DatePicker.Trigger>
        </DateField.Suffix>
      </DateField.Group>
      <DatePicker.Popover>
        <Calendar aria-label={ariaLabel}>
          <Calendar.Header>
            <Calendar.YearPickerTrigger>
              <Calendar.YearPickerTriggerHeading />
              <Calendar.YearPickerTriggerIndicator />
            </Calendar.YearPickerTrigger>
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

/**
 * Actions Cell Component
 * Pure component - just renders buttons and calls handlers
 */
const ActionsCell = memo(
  ({
    item,
    onRegisterGauge,
    onDelete,
    onPrintChalan,
    onEdit,
  }: {
    item: ClientData;
    onRegisterGauge?: (inward: ClientData) => void;
    onDelete?: (inward: ClientData) => void;
    onPrintChalan?: (inward: ClientData) => void;
    onEdit?: (inward: ClientData) => void;
  }) => (
    <div className="flex gap-2 items-center">
      {onRegisterGauge && (
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white h-7 px-3 text-xs"
          onPress={() => onRegisterGauge(item)}
          aria-label="Add gauges to inward entry"
        >
          Add Gauges
        </Button>
      )}
      {onPrintChalan && (
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white h-7 px-3 text-xs"
          onPress={() => onPrintChalan(item)}
          aria-label="Print Inward Chalan"
        >
          <PrinterIcon className="w-4 h-4" />
        </Button>
      )}
      {onEdit && (
        <Button
          size="sm"
          className="bg-white border border-blue-600 text-blue-600 hover:bg-blue-100 h-7"
          onPress={() => onEdit(item)}
          isIconOnly
          aria-label="Edit inward entry"
        >
          <PencilSquareIcon className="w-4 h-4" />
        </Button>
      )}
      {onDelete && (
        <Button
          size="sm"
          className="bg-white border border-red-600 text-red-600 hover:bg-red-100 h-7"
          onPress={() => onDelete(item)}
          isIconOnly
          aria-label="Delete inward entry"
        >
          <TrashIcon className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
);

ActionsCell.displayName = 'ActionsCell';

interface InwardTableViewProps {
  state: InwardTableState;
  handlers: InwardTableHandlers;
  organizations?: Array<{ id: string; name: string }>;
  organizationsLoading?: boolean;
  canManageInward?: boolean;
}

/**
 * Pure Table View Component
 * Receives all state and handlers from controller
 */
export const InwardTable = memo<InwardTableViewProps>(
  ({ state, handlers, organizations = [], organizationsLoading = false, canManageInward = true }) => {
    const {
      data,
      totalItems,
      totalPages,
      isServerPagination,
      page,
      rowsPerPage,
      selectedKeys,
      sortDescriptor,
      loading,
      error,
      clientOrgId,
      startDate,
      endDate,
      dateError,
    } = state;

    const {
      onPageChange,
      onRowsPerPageChange,
      onSearchChange,
      onSearchClear,
      onSortChange,
      onSelectionChange,
      onClientOrgChange,
      onStartDateChange,
      onEndDateChange,
      onApplyFilters,
      onClearFilters,
      onRegisterGauge,
      onDelete,
      onPrintChalan,
      onEdit,
      onRefresh,
    } = handlers;
    // Use searchValue from state prop (synced with URL via controller)
    const { searchValue } = state;

    // Visible columns - could be made dynamic later
    const visibleColumns = useMemo(() => new Set(INITIAL_VISIBLE_COLUMNS), []);

    const headerColumns = useMemo(() => {
      return columns.filter((column) => visibleColumns.has(column.uid));
    }, [visibleColumns]);

    // Data filtering - use searchValue from state
    const filteredItems = useMemo(() => {
      if (!searchValue) return [...data];

      const lower = searchValue.toLowerCase();
      return data.filter(
        (item) =>
          item.client_org_name?.toLowerCase().includes(lower) ||
          item.billing_org_name?.toLowerCase().includes(lower) ||
          item.delivery_org_name?.toLowerCase().includes(lower)
      );
    }, [data, searchValue]);

    const pages = isServerPagination
      ? Math.max(totalPages ?? Math.ceil((totalItems ?? filteredItems.length) / rowsPerPage), 1)
      : Math.max(Math.ceil(filteredItems.length / rowsPerPage), 1);

    // Reset to page 1 if current page exceeds total pages
    useEffect(() => {
      if (page > pages && pages > 0) {
        onPageChange(1);
      }
    }, [page, pages, onPageChange]);

    // Paginated items - use page and rowsPerPage from state
    const paginatedItems = useMemo(() => {
      if (isServerPagination) {
        return filteredItems;
      }

      const start = (page - 1) * rowsPerPage;
      const end = start + rowsPerPage;
      return filteredItems.slice(start, end);
    }, [page, rowsPerPage, filteredItems, isServerPagination]);

    // Sorted items
    const sortedItems = useMemo(() => {
      return [...paginatedItems].sort((a, b) => {
        const { column, direction } = sortDescriptor;
        if (!column || column === 'actions' || column === 'sr_no') return 0;

        const first = a[column as keyof ClientData];
        const second = b[column as keyof ClientData];
        const aValue = typeof first === 'string' ? first.toLowerCase() : first ?? '';
        const bValue = typeof second === 'string' ? second.toLowerCase() : second ?? '';

        if (aValue < bValue) return direction === 'descending' ? 1 : -1;
        if (aValue > bValue) return direction === 'descending' ? -1 : 1;
        return 0;
      });
    }, [paginatedItems, sortDescriptor]);

    const renderCell = useCallback(
      (item: ClientData, columnKey: TableColumnKey, index: number) => {
        if (columnKey === 'sr_no') {
          const srNo = (page - 1) * rowsPerPage + index + 1;
          return (
            <div className="text-[13px] text-center font-medium text-gray-600 w-12">
              {srNo}
            </div>
          );
        }

        if (columnKey === 'actions') {
          return (
            <ActionsCell
              item={item}
              onRegisterGauge={canManageInward ? onRegisterGauge : undefined}
              onDelete={canManageInward ? onDelete : undefined}
              onPrintChalan={onPrintChalan}
              onEdit={canManageInward ? onEdit : undefined}
            />
          );
        }

        const cellValue = item[columnKey as keyof ClientData];

        if (columnKey === 'client_org_name') {
          return (
            <div className="font-medium text-[13px] truncate" title={String(cellValue || '')}>
              {String(cellValue || 'N/A')}
            </div>
          );
        }

        if (
          columnKey === 'client_dc_date' ||
          columnKey === 'inward_date' ||
          columnKey === 'received_date'
        ) {
          const formatDate = (dateString: string) => {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
          };
          const formattedDate = cellValue ? formatDate(cellValue as string) : 'N/A';
          return (
            <div className="text-[13px] truncate" title={formattedDate}>
              {formattedDate}
            </div>
          );
        }

        return (
          <div className="text-[13px] truncate" title={String(cellValue || '')}>
            {String(cellValue || 'N/A')}
          </div>
        );
      },
      [page, rowsPerPage, onRegisterGauge, onDelete, onPrintChalan, onEdit]
    );

    /**
     * Empty state content
     */
    const emptyContent = useMemo(() => {
      if (error) {
        return (
          <div className="flex flex-col items-center gap-2 text-center py-8">
            <p className="text-red-500 text-sm font-semibold">Failed to load records</p>
            <p className="text-default-500 text-xs">{error}</p>
            <Button size="sm" variant="secondary" onPress={onRefresh}>
              Try Again
            </Button>
          </div>
        );
      }
      return 'No inward entries found';
    }, [error, onRefresh]);

    /**
     * Top content - search and filters
     */
    const topContent = useMemo(
      () => (
        <div className="flex flex-col gap-4">
          {/* Search and Refresh Row */}
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            {/* Search Input */}
            <SearchField name="search">
              <Label>Search</Label>
              <SearchField.Group>
                <SearchField.SearchIcon />
                <SearchField.Input className="w-[280px]" placeholder="Search..." />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <Input
              className="flex-1 min-w-[200px]"
              placeholder="Search by organization..."
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
            />
            {searchValue ? (
              <Button type="button" variant="ghost" aria-label="Clear organization search" onPress={onSearchClear}>
                <MagnifyingGlassIcon className="w-4 h-4" />
              </Button>
            ) : null}

            {/* Refresh Button */}
            <Button
              onPress={onRefresh}
              size="sm"
              variant="secondary"
              isDisabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          {/* Filters Row */}
          <I18nProvider locale="en-GB">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
              <Select
                selectedKey={clientOrgId ?? 'all'}
                onSelectionChange={(key) => {
                  const value = String(key ?? 'all');
                  onClientOrgChange(value === 'all' ? null : value);
                }}
                aria-label="Filter by client"
                isDisabled={organizationsLoading}
              >
                <Label>Client</Label>
                <Select.Trigger className="h-9 border border-gray-300 bg-white">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="all" textValue="All Clients">All Clients<ListBox.ItemIndicator /></ListBox.Item>
                    {organizations.map((org) => (
                      <ListBox.Item key={org.id} id={org.id} textValue={org.name}>
                        {org.name}<ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>

              <InwardDatePicker
                value={startDate}
                onChange={onStartDateChange}
                ariaLabel="From date"
              />

              <InwardDatePicker
                value={endDate}
                onChange={onEndDateChange}
                ariaLabel="To date"
              />

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onPress={onApplyFilters}
                  aria-label="Apply filters"
                  className="flex-1"
                >
                  Apply
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={onClearFilters}
                  aria-label="Reset filters"
                  className="flex-1"
                >
                  Reset
                </Button>
              </div>
            </div>
          </I18nProvider>

          {dateError ? <div className="text-xs text-red-600">{dateError}</div> : null}
        </div>
      ),
      [
        searchValue,
        loading,
        onSearchChange,
        onSearchClear,
        onRefresh,
        clientOrgId,
        startDate,
        endDate,
        dateError,
        onClientOrgChange,
        onStartDateChange,
        onEndDateChange,
        onApplyFilters,
        onClearFilters,
        organizations,
        organizationsLoading,
      ]
    );

    /**
     * Bottom content - pagination and rows per page
     */
    const bottomContent = useMemo(
      () => (
        <div className="py-2 px-2 flex flex-col gap-2 sm:grid sm:grid-cols-3 sm:items-center">
          <span className="text-small text-default-400 sm:justify-self-start">
            {selectedKeys && typeof selectedKeys === 'object' && 'size' in selectedKeys
              ? `${selectedKeys.size} of ${isServerPagination ? (totalItems ?? filteredItems.length) : filteredItems.length} selected`
              : `Total ${isServerPagination ? (totalItems ?? filteredItems.length) : filteredItems.length} items`}
          </span>
          <div className="sm:justify-self-center">
            <Pagination>
              <Pagination.Content>
                <Pagination.Previous isDisabled={page <= 1} onPress={() => onPageChange(Math.max(1, page - 1))}>
                  <Pagination.PreviousIcon />
                </Pagination.Previous>
                {Array.from({ length: pages }, (_, index) => index + 1).map((pageNumber) => (
                  <Pagination.Item key={pageNumber}>
                    <Pagination.Link isActive={pageNumber === page} onPress={() => onPageChange(pageNumber)}>
                      {pageNumber}
                    </Pagination.Link>
                  </Pagination.Item>
                ))}
                <Pagination.Next isDisabled={page >= pages} onPress={() => onPageChange(Math.min(pages, page + 1))}>
                  <Pagination.NextIcon />
                </Pagination.Next>
              </Pagination.Content>
            </Pagination>
          </div>
          <div className="sm:justify-self-end">
            <Select
              selectedKey={String(rowsPerPage)}
              onSelectionChange={(key: Key | null) => onRowsPerPageChange(new Set(key == null ? [] : [key]))}
              className="min-w-[170px]"
            >
              <Label>Rows per page</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {['10', '25', '50', '100'].map((size) => (
                    <ListBox.Item key={size} id={size} textValue={size}>
                      {size}<ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>
        </div>
      ),
      [
        selectedKeys,
        filteredItems.length,
        isServerPagination,
        totalItems,
        page,
        pages,
        rowsPerPage,
        onPageChange,
        onRowsPerPageChange,
      ]
    );

    /**
     * Loading content
     */
    const loadingContent = useMemo(
      () => (
        <div className="py-8 flex justify-center items-center text-sm text-default-500">
          <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Loading...
        </div>
      ),
      []
    );
    return (
      <div className="p-2">
        <div className="industrial-table-wrapper">
          <div className="mb-4">{topContent}</div>
          <Table aria-label="Inward entries table" className="min-w-full">
            <Table.ScrollContainer className="max-h-[calc(100vh-320px)]">
              <Table.Content
                selectedKeys={selectedKeys}
                selectionMode="multiple"
                sortDescriptor={sortDescriptor}
                onSelectionChange={onSelectionChange}
                onSortChange={onSortChange}
              >
                <Table.Header columns={headerColumns}>
                  {(column) => (
                    <Table.Column
                      id={column.uid}
                      allowsSorting={column.sortable}
                      isRowHeader={column.uid === 'client_org_name'}
                    >
                      {column.name}
                    </Table.Column>
                  )}
                </Table.Header>
                <Table.Body
                  items={sortedItems}
                  renderEmptyState={() => (
                    <div className="py-8 text-center text-sm text-default-500">
                      {loading ? loadingContent : emptyContent}
                    </div>
                  )}
                >
                  {(item) => {
                    const index = sortedItems.indexOf(item);
                    return (
                      <Table.Row id={item.id} columns={headerColumns}>
                        {(columnKey) => (
                          <Table.Cell>{renderCell(item, getTableColumnKey(columnKey) as TableColumnKey, index)}</Table.Cell>
                        )}
                      </Table.Row>
                    );
                  }}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
          {bottomContent}
        </div>
      </div>
    );
  }
);

InwardTable.displayName = 'InwardTable';

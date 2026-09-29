"use client";

import { useMemo, memo, useCallback } from 'react';
import {
    Button,
    Chip,
    Input,
    Label,
    ListBox,
    Pagination,
    Select,
    Table,
} from '@heroui/react';
import {
    MagnifyingGlassIcon,
    TrashIcon,
    EyeIcon,
    PencilSquareIcon,
} from '@heroicons/react/24/outline';
import { getTableColumnKey } from './tableColumnKey';
import type { RepairEntry, RepairTableState, RepairTableHandlers } from '../../types/repair';
import '../../styles/industrial-table.css';

type TableColumnKey =
    | 'sr_no'
    | 'repair_no'
    | 'repair_date'
    | 'client_org_name'
    | 'gauge_identification_number'
    | 'gauge_make'
    | 'repair_type'
    | 'repair_status'
    | 'estimated_cost'
    | 'actions';

const columns: { name: string; uid: TableColumnKey; sortable?: boolean }[] = [
    { name: 'SR NO', uid: 'sr_no' },
    { name: 'REPAIR NO', uid: 'repair_no', sortable: true },
    { name: 'REPAIR DATE', uid: 'repair_date', sortable: true },
    { name: 'CLIENT', uid: 'client_org_name', sortable: true },
    { name: 'GAUGE ID', uid: 'gauge_identification_number', sortable: true },
    { name: 'MAKE', uid: 'gauge_make', sortable: true },
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
    'gauge_identification_number',
    'gauge_make',
    'repair_type',
    'repair_status',
    'estimated_cost',
    'actions',
];

// Status color mapping
const statusColorMap: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
    pending: 'warning',
    in_progress: 'default',
    completed: 'success',
    on_hold: 'warning',
    cancelled: 'danger',
};

// Repair type color mapping
const repairTypeColorMap: Record<string, 'accent' | 'warning' | 'danger'> = {
    calibration: 'accent',
    maintenance: 'accent',
    replacement: 'warning',
    adjustment: 'danger',
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
                variant="ghost"
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
    handlers: RepairTableHandlers;
    organizations?: Array<{ id: string; name: string }>;
    organizationsLoading?: boolean;
}

/**
 * Pure Table View Component
 * Receives all state and handlers from controller
 */
export const RepairMasterTable = memo<RepairTableViewProps>(
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
            repairType,
            repairStatus,
            dateFrom,
            dateTo,
        } = state;

        const {
            onPageChange,
            onRowsPerPageChange,
            onSearchChange,
            onSearchClear,
            onSortChange,
            onSelectionChange,
            onClientOrgChange,
            onRepairTypeChange,
            onRepairStatusChange,
            onDateFromChange,
            onDateToChange,
            onApplyFilters,
            onClearFilters,
            onCreateRepair,
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
                    item.gauge_identification_number.toLowerCase().includes(searchValue.toLowerCase()) ||
                    item.gauge_make.toLowerCase().includes(searchValue.toLowerCase())
                );
            }

            // Apply organization filter
            if (clientOrgId) {
                filteredData = filteredData.filter((item) => item.client_org_id === clientOrgId);
            }

            // Apply repair type filter
            if (repairType) {
                filteredData = filteredData.filter((item) => item.repair_type === repairType);
            }

            // Apply repair status filter
            if (repairStatus) {
                filteredData = filteredData.filter((item) => item.repair_status === repairStatus);
            }

            // Apply date filters
            if (dateFrom) {
                filteredData = filteredData.filter((item) => item.repair_date >= dateFrom);
            }
            if (dateTo) {
                filteredData = filteredData.filter((item) => item.repair_date <= dateTo);
            }

            return filteredData;
        }, [data, searchValue, clientOrgId, repairType, repairStatus, dateFrom, dateTo]);

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

                case 'gauge_identification_number':
                    return (
                        <div className="font-mono text-sm">
                            {repair.gauge_identification_number}
                        </div>
                    );

                case 'gauge_make':
                    return (
                        <div className="text-sm">
                            {repair.gauge_make}
                        </div>
                    );

                case 'repair_type':
                    return (
                        <Chip
                            size="sm"
                            variant="soft"
                            color={repairTypeColorMap[repair.repair_type] || 'default'}
                        >
                            {repair.repair_type.replace('_', ' ').toUpperCase()}
                        </Chip>
                    );

                case 'repair_status':
                    return (
                        <Chip
                            size="sm"
                            variant="soft"
                            color={statusColorMap[repair.repair_status] || 'default'}
                        >
                            {repair.repair_status.replace('_', ' ').toUpperCase()}
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
            <div className="text-center py-8">
                <div className="text-gray-500 mb-2">No repairs found</div>
                <Button
                    size="sm"
                    variant="secondary"
                    onPress={onCreateRepair}
                >
                    Create First Repair
                </Button>
            </div>
        ), [onCreateRepair]);

        // Error content
        const errorContent = useMemo(() => (
            <div className="text-center py-8">
                <div className="text-red-500 mb-2">Error loading repairs</div>
                <div className="text-gray-600 text-sm mb-4">{error}</div>
                <Button
                    size="sm"
                    variant="secondary"
                    onPress={onRefresh}
                >
                    Try Again
                </Button>
            </div>
        ), [error, onRefresh]);

        // Top content with filters
        const topContent = useMemo(() => (
            <div className="flex flex-col gap-4">


                <div className="flex items-center gap-4 flex-wrap">
                    <Select
                        selectedKey={clientOrgId || null}
                        onSelectionChange={(key) => onClientOrgChange(key ? String(key) : '')}
                        className="max-w-xs"
                        isDisabled={organizationsLoading}
                    >
                        <Label>Client Organization</Label>
                        <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                        <Select.Popover>
                            <ListBox>
                                {organizations.map((org) => (
                                    <ListBox.Item key={org.id} id={org.id} textValue={org.name}>
                                        {org.name}<ListBox.ItemIndicator />
                                    </ListBox.Item>
                                ))}
                            </ListBox>
                        </Select.Popover>
                    </Select>

                    <label className="flex max-w-xs flex-col gap-1 text-sm font-medium text-slate-700">
                        Date From
                        <Input type="date" value={dateFrom || ''} onChange={(e) => onDateFromChange(e.target.value)} />
                    </label>

                    <label className="flex max-w-xs flex-col gap-1 text-sm font-medium text-slate-700">
                        Date To
                        <Input type="date" value={dateTo || ''} onChange={(e) => onDateToChange(e.target.value)} />
                    </label>

                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            onPress={onApplyFilters}
                        >
                            Apply Filters
                        </Button>
                        <Button
                            size="sm"
                            variant="secondary"
                            onPress={onClearFilters}
                        >
                            Clear
                        </Button>
                    </div>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                        <Input
                            className="w-full sm:max-w-[44%]"
                            placeholder="Search by repair no, client, gauge ID..."
                            aria-label="Search repairs"
                            value={searchValue}
                            onChange={(event) => onSearchChange(event.target.value)}
                        />
                        {searchValue ? (
                            <Button type="button" variant="ghost" aria-label="Clear repair search" onPress={onSearchClear}>
                                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                            </Button>
                        ) : null}

                    </div>
                </div>
            </div>
        ), [
            searchValue,
            onSearchChange,
            onSearchClear,
            onCreateRepair,
            clientOrgId,
            onClientOrgChange,
            repairType,
            onRepairTypeChange,
            repairStatus,
            onRepairStatusChange,
            dateFrom,
            onDateFromChange,
            dateTo,
            onDateToChange,
            onApplyFilters,
            onClearFilters,
            organizations,
            organizationsLoading,
        ]);

        // Bottom content with pagination
        const bottomContent = useMemo(() => (
            <div className="flex items-center justify-between px-2 py-2">
                <span className="text-small text-default-400">
                    Total {filteredItems.length} repairs
                </span>
                <Pagination size="sm">
                    <Pagination.Content>
                        <Pagination.Previous isDisabled={page <= 1} onPress={() => onPageChange(page - 1)}>
                            <Pagination.PreviousIcon />
                        </Pagination.Previous>
                        {Array.from({ length: Math.max(Math.ceil(filteredItems.length / rowsPerPage), 1) }, (_, index) => index + 1).map((pageNumber) => (
                            <Pagination.Item key={pageNumber}>
                                <Pagination.Link isActive={pageNumber === page} onPress={() => onPageChange(pageNumber)}>
                                    {pageNumber}
                                </Pagination.Link>
                            </Pagination.Item>
                        ))}
                        <Pagination.Next isDisabled={page >= Math.ceil(filteredItems.length / rowsPerPage)} onPress={() => onPageChange(page + 1)}>
                            <Pagination.NextIcon />
                        </Pagination.Next>
                    </Pagination.Content>
                </Pagination>
                <div className="flex items-center gap-2">
                    <label className="text-small text-default-400">Rows per page:</label>
                    <Select
                        selectedKey={rowsPerPage.toString()}
                        onSelectionChange={(key) => onRowsPerPageChange(Number(key))}
                        className="max-w-[70px]"
                    >
                        <Select.Trigger><Select.Value /><Select.Indicator /></Select.Trigger>
                        <Select.Popover>
                            <ListBox>
                                {['10', '25', '50'].map((size) => (
                                    <ListBox.Item key={size} id={size} textValue={size}>
                                        {size}<ListBox.ItemIndicator />
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
                        {errorContent}
                    </div>
                </div>
            );
        }

        return (
            <div className="p-2">
                <div className="industrial-table-wrapper">
                    <div className="mb-4">{topContent}</div>
                    <Table aria-label="Repair entries table" className="min-w-full">
                        <Table.ScrollContainer className="max-h-[calc(100vh-320px)]">
                            <Table.Content
                                className="min-w-full"
                                selectedKeys={selectedKeys}
                                selectionMode="multiple"
                                sortDescriptor={sortDescriptor}
                                onSelectionChange={(keys) => onSelectionChange(keys as Set<string>)}
                                onSortChange={onSortChange}
                            >
                                <Table.Header columns={headerColumns}>
                                    {(column) => (
                                        <Table.Column
                                            id={column.uid}
                                            className="py-2"
                                            allowsSorting={column.sortable}
                                            isRowHeader={column.uid === columns[0]?.uid}
                                        >
                                            {column.name}
                                        </Table.Column>
                                    )}
                                </Table.Header>
                                <Table.Body
                                    items={paginatedItems}
                                    renderEmptyState={() => loading ? loadingContent : emptyContent}
                                >
                                    {(item) => (
                                        <Table.Row id={item.id} columns={headerColumns}>
                                            {(columnKey) => (
                                                <Table.Cell className="py-2">
                                                    {renderCell(item, getTableColumnKey(columnKey) as TableColumnKey, paginatedItems.indexOf(item))}
                                                </Table.Cell>
                                            )}
                                        </Table.Row>
                                    )}
                                </Table.Body>
                            </Table.Content>
                        </Table.ScrollContainer>
                    </Table>
                    {bottomContent}
                </div>
            </div>
        );
    });

RepairMasterTable.displayName = 'RepairMasterTable';

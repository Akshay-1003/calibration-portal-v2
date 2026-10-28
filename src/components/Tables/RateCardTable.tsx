import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Button,
  InputGroup,
  ListBox,
  Select,
  Table,
} from '@heroui/react';
import { MagnifyingGlassIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { RateCardEntry } from '../../pages/masters/PartyMaster/rate-card';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import '../../styles/industrial-table.css';
import { getTableColumnKey } from './tableColumnKey';
import { TablePagination } from "./TablePagination";
import { dataTableClassName } from "./tableStyles";
import { getDiscountedRate, normalizeRateCardDiscount } from "../../utils/rateCardDiscount";

type RateCardTableEntry = RateCardEntry & {
  _internalId?: string;
  _internalGaugeId?: string;
  _internalGaugeName?: string;
};

type TableColumnKey =
  | 'select'
  | 'sr_no'
  | 'gauge_name'
  | 'range'
  | 'rate'
  | 'discount'
  | 'discounted_rate'
  | 'unit'
  | 'po_number'
  | 'actions';

interface RateCardTableProps {
  entries: RateCardEntry[];
  onEdit: (entry: RateCardEntry) => void;
  onDelete: (entryId: string) => void;
  loading?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
  poLabels?: Record<string, string>;
}

interface RateCardTableRow {
  key: string;
  srNo: number;
  entry: RateCardTableEntry;
}

const columns: { name: string; uid: TableColumnKey }[] = [
  { name: '', uid: 'select' },
  { name: 'SR NO', uid: 'sr_no' },
  { name: 'GAUGE NAME', uid: 'gauge_name' },
  { name: 'RANGE', uid: 'range' },
  { name: 'RATE', uid: 'rate' },
  { name: 'DISCOUNT (%)', uid: 'discount' },
  { name: 'DISCOUNTED PRICE', uid: 'discounted_rate' },
  { name: 'UNIT', uid: 'unit' },
  { name: 'PO NUMBER', uid: 'po_number' },
  { name: 'ACTIONS', uid: 'actions' },
];

const COLUMN_LAYOUT: Record<TableColumnKey, string> = {
  select: 'min-w-[42px] w-[42px]',
  sr_no: 'min-w-[64px]',
  gauge_name: 'min-w-[200px]',
  range: 'min-w-[150px]',
  rate: 'min-w-[100px]',
  discount: 'min-w-[110px]',
  discounted_rate: 'min-w-[140px]',
  unit: 'min-w-[90px]',
  po_number: 'min-w-[160px]',
  actions: 'min-w-[110px]',
};

const formatNumber = (value: number | undefined | null, fractionDigits = 2) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(fractionDigits) : '0.00';
};

const hasMeaningfulRange = (entry: RateCardTableEntry) => {
  const min = Number(entry.range?.min);
  const max = Number(entry.range?.max);
  return Number.isFinite(min) && Number.isFinite(max) && (min !== 0 || max !== 0);
};

const formatRange = (entry: RateCardTableEntry) => {
  if (hasMeaningfulRange(entry)) {
    return `${entry.range.min} - ${entry.range.max}`;
  }
  if (entry.standard_specification) {
    return entry.standard_specification;
  }
  if (entry.basic_size !== undefined && entry.basic_size !== null) {
    return `Basic Size: ${entry.basic_size}`;
  }
  return `${entry.range?.min ?? 0} - ${entry.range?.max ?? 0}`;
};

const getEntryKey = (entry: RateCardTableEntry, index: number) =>
  entry._internalId ||
  `${entry._internalGaugeId || entry._internalGaugeName || 'rate-card-entry'}-${index}`;

export const RateCardTable = ({ entries, onEdit, onDelete, loading = false, selectedKeys = new Set<string>(), onSelectionChange, poLabels = {} }: RateCardTableProps) => {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<RateCardTableEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredItems = useMemo(() => {
    const typedEntries = entries as RateCardTableEntry[];
    const trimmedFilter = filterValue.trim().toLowerCase();
    if (!trimmedFilter) {
      return typedEntries;
    }

    return typedEntries.filter((entry) => {
      const gaugeName = (entry._internalGaugeName || '').toLowerCase();
      const rateType = (entry.rate_type || '').toLowerCase();
      const range = formatRange(entry).toLowerCase();
      const leastCount = String(entry.least_count ?? '').toLowerCase();
      const unit = (entry.unit || '').toLowerCase();
      const poNumber = (poLabels[entry.price_list_item_id || ''] || '').toLowerCase();

      return (
        gaugeName.includes(trimmedFilter) ||
        rateType.includes(trimmedFilter) ||
        range.includes(trimmedFilter) ||
        leastCount.includes(trimmedFilter) ||
        unit.includes(trimmedFilter) ||
        poNumber.includes(trimmedFilter)
      );
    });
  }, [entries, filterValue, poLabels]);

  const totalPages = Math.max(Math.ceil(filteredItems.length / rowsPerPage), 1);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredItems.slice(start, end);
  }, [filteredItems, page, rowsPerPage]);

  const tableRows = useMemo<RateCardTableRow[]>(
    () =>
      paginatedItems.map((entry, index) => ({
        key: getEntryKey(entry, (page - 1) * rowsPerPage + index),
        srNo: (page - 1) * rowsPerPage + index + 1,
        entry,
      })),
    [page, paginatedItems, rowsPerPage],
  );

  const showingFrom = filteredItems.length > 0 ? (page - 1) * rowsPerPage + 1 : 0;
  const showingTo = Math.min(page * rowsPerPage, filteredItems.length);

  const onRowsPerPageChange = useCallback((selection: React.Key | null) => {
    const nextValue = Number(selection);
    setRowsPerPage(Number.isFinite(nextValue) ? nextValue : 10);
    setPage(1);
  }, []);

  const requestDelete = (entry: RateCardTableEntry) => {
    if (!entry._internalId) {
      return;
    }

    setDeleteTarget(entry);
    setDeleteOpen(true);
  };

  const closeDelete = useCallback(() => {
    if (isDeleting) {
      return;
    }

    setDeleteOpen(false);
    setDeleteTarget(null);
  }, [isDeleting]);

  const confirmDelete = useCallback(async () => {
    const entryId = deleteTarget?._internalId;
    if (!entryId) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(entryId);
      setDeleteOpen(false);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, onDelete]);

  const renderCell = (row: RateCardTableRow, columnKey: TableColumnKey) => {
    const { entry } = row;

    switch (columnKey) {
      case 'select':
        return <input type="checkbox" aria-label={`Select ${entry._internalGaugeName || 'Rate Card entry'} ${row.srNo}`} checked={Boolean(entry.price_list_item_id && selectedKeys.has(entry.price_list_item_id))} disabled={!entry.price_list_item_id || !onSelectionChange} onChange={event => {
          const next = new Set(selectedKeys);
          if (event.target.checked) next.add(entry.price_list_item_id!); else next.delete(entry.price_list_item_id!);
          onSelectionChange?.(next);
        }} />;
      case 'sr_no':
        return <span className="text-sm font-medium text-slate-700">{row.srNo}</span>;
      case 'gauge_name':
        return (
          <span className="text-sm font-semibold text-slate-800">
            {entry._internalGaugeName || 'N/A'}
          </span>
        );
      case 'range':
        return <span className="block max-w-[320px] text-sm text-slate-700">{formatRange(entry)}</span>;
      case 'rate':
        return (
          <span className="text-sm text-slate-700 [font-variant-numeric:tabular-nums]">
            {formatNumber(entry.rate)}
          </span>
        );
      case 'discount':
        return (
          <span className="text-sm text-slate-700 [font-variant-numeric:tabular-nums]">
            {entry.rate_type === 'flat' ? 'N/A' : `${formatNumber(normalizeRateCardDiscount(entry.discount))}%`}
          </span>
        );
      case 'discounted_rate':
        return (
          <span className="text-sm font-medium text-slate-700 [font-variant-numeric:tabular-nums]">
            {formatNumber(getDiscountedRate(entry.rate, entry.discount))}
          </span>
        );
      case 'unit':
        return <span className="text-sm text-slate-700">{entry.unit || 'N/A'}</span>;
      case 'po_number':
        return <span className="block max-w-[140px] break-words text-sm font-medium text-blue-700">{poLabels[entry.price_list_item_id || ''] || 'Unassigned'}</span>;
      case 'actions':
        return (
          <div className="flex justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 rounded-lg border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              onPress={() => onEdit(entry)}
            >
              <PencilIcon className="h-4 w-4" />
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              isIconOnly
              aria-label="Delete rate card entry"
              className="h-8 w-8 min-w-8 rounded-lg border border-red-500 bg-white text-red-600 hover:bg-red-50"
              onPress={() => requestDelete(entry)}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <InputGroup variant="secondary" className="w-full md:max-w-[460px]">
          <InputGroup.Prefix>
            <MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />
          </InputGroup.Prefix>
          <InputGroup.Input
            aria-label="Search rate card entries"
            placeholder="Search by gauge, range, specification..."
            value={filterValue}
            onChange={(event) => {
              setFilterValue(event.target.value);
              setPage(1);
            }}
          />
          {filterValue && (
            <InputGroup.Suffix>
              <button type="button" aria-label="Clear search" onClick={() => setFilterValue('')}>
                <XMarkIcon className="h-4 w-4 text-slate-400" />
              </button>
            </InputGroup.Suffix>
          )}
        </InputGroup>

        <div className="flex items-center justify-between gap-3 md:justify-end">
          <span className="text-sm text-slate-500">
            {filteredItems.length} {filteredItems.length === 1 ? 'entry' : 'entries'}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[12px] uppercase tracking-[0.12em] text-slate-400">
              Rows
            </span>
            <Select
              aria-label="Rows per page"
              selectedKey={String(rowsPerPage)}
              onSelectionChange={onRowsPerPageChange}
              className="w-[88px]"
            >
              <Select.Trigger className="min-h-8 h-8 rounded-lg border border-slate-200 bg-white shadow-none">
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {['10', '20', '50', '100'].map((size) => (
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
      </div>

      <div className="industrial-table-wrapper overflow-x-auto px-0 pb-0 pt-0">
        <Table aria-label="Rate card entries table" className={dataTableClassName("min-w-full")}>
          <Table.ScrollContainer className="w-full">
            <Table.Content className="w-full table-auto">
          <Table.Header columns={columns}>
            {(column) => (
              <Table.Column
                id={column.uid}
                isRowHeader={column.uid === 'gauge_name'}
                className={`${COLUMN_LAYOUT[column.uid]} bg-slate-100 px-3 py-3 text-[11px] font-semibold tracking-[0.08em] text-slate-600`}
              >
                {column.uid === 'select' ? <input type="checkbox" aria-label="Select all visible Rate Card entries" checked={filteredItems.filter(entry => entry.price_list_item_id).length > 0 && filteredItems.filter(entry => entry.price_list_item_id).every(entry => selectedKeys.has(entry.price_list_item_id!))} disabled={!onSelectionChange} onChange={event => {
                  const next = new Set(selectedKeys);
                  filteredItems.forEach(entry => { if (entry.price_list_item_id) { if (event.target.checked) next.add(entry.price_list_item_id); else next.delete(entry.price_list_item_id); } });
                  onSelectionChange?.(next);
                }} /> : column.name}
              </Table.Column>
            )}
          </Table.Header>
          <Table.Body
            items={tableRows}
            renderEmptyState={() => (
              <div className="py-10 text-center text-sm text-slate-500">
                {loading ? 'Loading rate card entries...' : 'No rate card entries added yet.'}
              </div>
            )}
          >
            {(row) => (
              <Table.Row id={row.key} columns={columns}>
                {(columnKey) => {
                  const key = getTableColumnKey(columnKey) as TableColumnKey;
                  return (
                    <Table.Cell className={`px-3 py-3 align-middle ${COLUMN_LAYOUT[key]}`}>
                      {renderCell(row, key)}
                    </Table.Cell>
                  );
                }}
              </Table.Row>
            )}
          </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </div>

      {filteredItems.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/80 px-3 py-3 text-sm md:flex-row md:items-center md:justify-between">
          <span className="text-slate-500">
            Showing {showingFrom} to {showingTo} of {filteredItems.length} entries
          </span>

          <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      <DeleteConfirmModal
        isOpen={deleteOpen}
        onClose={closeDelete}
        title="Delete rate card entry"
        message={
          <>
            Are you sure you want to delete this rate card entry? This action cannot be undone.
          </>
        }
        isConfirmLoading={isDeleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

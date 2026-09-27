import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Button,
  Input,
  Pagination,
  Select,
  SelectItem,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from '@heroui-v2/react';
import type { Selection } from '@heroui-v2/react';
import { MagnifyingGlassIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { RateCardEntry } from '../../pages/masters/PartyMaster/rate-card';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';
import '../../styles/industrial-table.css';

type RateCardTableEntry = RateCardEntry & {
  _internalId?: string;
  _internalGaugeId?: string;
  _internalGaugeName?: string;
};

type TableColumnKey =
  | 'sr_no'
  | 'gauge_name'
  | 'rate_type'
  | 'range'
  | 'least_count'
  | 'rate'
  | 'discount'
  | 'unit'
  | 'actions';

interface RateCardTableProps {
  entries: RateCardEntry[];
  onEdit: (entry: RateCardEntry) => void;
  onDelete: (entryId: string) => void;
  loading?: boolean;
}

interface RateCardTableRow {
  key: string;
  srNo: number;
  entry: RateCardTableEntry;
}

const columns: { name: string; uid: TableColumnKey }[] = [
  { name: 'SR NO', uid: 'sr_no' },
  { name: 'GAUGE NAME', uid: 'gauge_name' },
  { name: 'RATE TYPE', uid: 'rate_type' },
  { name: 'RANGE', uid: 'range' },
  { name: 'LEAST COUNT', uid: 'least_count' },
  { name: 'RATE', uid: 'rate' },
  { name: 'DISCOUNT (%)', uid: 'discount' },
  { name: 'UNIT', uid: 'unit' },
  { name: 'ACTIONS', uid: 'actions' },
];

const COLUMN_LAYOUT: Record<TableColumnKey, string> = {
  sr_no: 'min-w-[70px]',
  gauge_name: 'min-w-[220px]',
  rate_type: 'min-w-[140px]',
  range: 'min-w-[220px]',
  least_count: 'min-w-[140px]',
  rate: 'min-w-[120px]',
  discount: 'min-w-[140px]',
  unit: 'min-w-[120px]',
  actions: 'min-w-[140px]',
};

const formatNumber = (value: number | undefined | null, fractionDigits = 2) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(fractionDigits) : '0.00';
};

const formatRange = (entry: RateCardTableEntry) => {
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

export const RateCardTable = ({ entries, onEdit, onDelete, loading = false }: RateCardTableProps) => {
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

      return (
        gaugeName.includes(trimmedFilter) ||
        rateType.includes(trimmedFilter) ||
        range.includes(trimmedFilter) ||
        leastCount.includes(trimmedFilter) ||
        unit.includes(trimmedFilter)
      );
    });
  }, [entries, filterValue]);

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

  const onRowsPerPageChange = useCallback((selection: Selection) => {
    const nextValue = Number(Array.from(selection)[0] as string);
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
      case 'sr_no':
        return <span className="text-sm font-medium text-slate-700">{row.srNo}</span>;
      case 'gauge_name':
        return (
          <span className="text-sm font-semibold text-slate-800">
            {entry._internalGaugeName || 'N/A'}
          </span>
        );
      case 'rate_type':
        return <span className="text-sm capitalize text-slate-700">{entry.rate_type || 'N/A'}</span>;
      case 'range':
        return <span className="block max-w-[320px] text-sm text-slate-700">{formatRange(entry)}</span>;
      case 'least_count':
        return (
          <span className="text-sm text-slate-700 [font-variant-numeric:tabular-nums]">
            {entry.least_count !== undefined && entry.least_count !== null
              ? formatNumber(entry.least_count, 4)
              : '-'}
          </span>
        );
      case 'rate':
        return (
          <span className="text-sm text-slate-700 [font-variant-numeric:tabular-nums]">
            {formatNumber(entry.rate)}
          </span>
        );
      case 'discount':
        return (
          <span className="text-sm text-slate-700 [font-variant-numeric:tabular-nums]">
            {entry.rate_type === 'flat' ? 'N/A' : `${formatNumber(entry.discount)}%`}
          </span>
        );
      case 'unit':
        return <span className="text-sm text-slate-700">{entry.unit || 'N/A'}</span>;
      case 'actions':
        return (
          <div className="flex justify-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="bordered"
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
        <Input
          isClearable
          aria-label="Search rate card entries"
          className="w-full md:max-w-[460px]"
          placeholder="Search by gauge, rate type, specification..."
          value={filterValue}
          onClear={() => setFilterValue('')}
          onValueChange={(value) => {
            setFilterValue(value);
            setPage(1);
          }}
          startContent={<MagnifyingGlassIcon className="h-4 w-4 text-slate-400" />}
          classNames={{
            inputWrapper: 'min-h-9 h-9 rounded-lg border border-slate-200 bg-white shadow-none',
          }}
        />

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
              selectedKeys={new Set([String(rowsPerPage)])}
              onSelectionChange={onRowsPerPageChange}
              size="sm"
              className="w-[88px]"
              classNames={{
                trigger: 'min-h-8 h-8 rounded-lg border border-slate-200 bg-white shadow-none',
              }}
            >
              <SelectItem key="10">10</SelectItem>
              <SelectItem key="20">20</SelectItem>
              <SelectItem key="50">50</SelectItem>
              <SelectItem key="100">100</SelectItem>
            </Select>
          </div>
        </div>
      </div>

      <div className="industrial-table-wrapper overflow-x-auto px-0 pb-0 pt-0">
        <Table
          aria-label="Rate card entries table"
          isHeaderSticky
          removeWrapper
          classNames={{
            base: 'min-w-full',
            table: 'min-w-[1150px] w-full table-auto',
          }}
        >
          <TableHeader columns={columns}>
            {(column) => (
              <TableColumn
                key={column.uid}
                align={column.uid === 'actions' || column.uid === 'sr_no' ? 'center' : 'start'}
                className={`${COLUMN_LAYOUT[column.uid]} bg-slate-100 px-3 py-3 text-[11px] font-semibold tracking-[0.08em] text-slate-600`}
              >
                {column.name}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody
            items={tableRows}
            isLoading={loading}
            loadingContent={
              <div className="py-8 text-center text-sm text-slate-500">
                Loading rate card entries...
              </div>
            }
            emptyContent={
              <div className="py-10 text-center text-sm text-slate-500">
                No rate card entries added yet.
              </div>
            }
          >
            {(row) => (
              <TableRow key={row.key}>
                {(columnKey) => (
                  <TableCell
                    className={`px-3 py-3 align-middle ${COLUMN_LAYOUT[columnKey as TableColumnKey]}`}
                  >
                    {renderCell(row, columnKey as TableColumnKey)}
                  </TableCell>
                )}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filteredItems.length > 0 && (
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/80 px-3 py-3 text-sm md:flex-row md:items-center md:justify-between">
          <span className="text-slate-500">
            Showing {showingFrom} to {showingTo} of {filteredItems.length} entries
          </span>

          <Pagination
            aria-label="Rate card pagination"
            total={totalPages}
            page={page}
            onChange={setPage}
            size="sm"
            showControls
            classNames={{
              wrapper: 'gap-0',
              item: 'h-8 w-8 border border-slate-200 bg-white text-[12px] text-slate-600',
              cursor: 'bg-slate-900 text-white shadow-sm',
            }}
          />
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

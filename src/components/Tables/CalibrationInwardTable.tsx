"use client"
import React, { useEffect } from "react"
import { Table, Input, Button, Select, ListBox, Label, Chip } from "@heroui/react"
import type { Key } from "@react-types/shared"
import { InwardEntry } from "../../types"
import "../../styles/industrial-table.css"
import { getTableColumnKey } from './tableColumnKey'
import { TablePagination } from "./TablePagination";
import { dataTableClassName } from "./tableStyles";

// ----------------------
// Calibration Inward Table Component
// ----------------------
export function CalibrationInwardTable({
  loading = false,
  error = null,
  data = [],
  onRefresh,
  onCalibrationClick
}: {
  loading?: boolean;
  error?: string | null;
  data?: InwardEntry[];
  onRefresh?: () => void;
  onCalibrationClick?: (inward: InwardEntry) => void;
} = {}) {
  const [filterValue, setFilterValue] = React.useState("");
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [page, setPage] = React.useState(1);

  const formatDate = React.useCallback((dateString: string) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
      return dateString;
    }
  }, []);

  const columns: { name: string; uid: keyof InwardEntry | "actions" | "sr_no" }[] = [
    { name: "SR NO", uid: "sr_no" },
    { name: "INWARD NO", uid: "inward_no" },
    { name: "COMPANY NAME", uid: "client_org_name" },
    { name: "RECEIVED DATE", uid: "received_date" },
    { name: "INWARD DATE", uid: "inward_date" },
    { name: "CALIBRATION METHOD", uid: "calibration_method" },
    { name: "REPORTING METHOD", uid: "reporting_method" },
    { name: "ACTIONS", uid: "actions" },
  ];

  const filteredItems = React.useMemo(() => {
    if (!filterValue) return [...data];
    const lower = filterValue.toLowerCase();
    return data.filter((item) =>
      [
        item.client_dc_no,
        item.client_org_name,
        item.inward_date,
        item.contact_person_name,
        item.contact_person_phone,
        item.calibration_method,
      ]
        .join(" ")
        .toLowerCase()
        .includes(lower)
    );
  }, [data, filterValue]);

  const pages = Math.max(Math.ceil(filteredItems.length / rowsPerPage) || 1, 1);

  // Clamp page when filtered results change (e.g., delete) so we don't show an empty page.
  useEffect(() => {
    if (page > pages) {
      setPage(pages);
    }
  }, [page, pages]);

  const items = React.useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredItems.slice(start, end);
  }, [page, filteredItems, rowsPerPage]);

  const renderCell = React.useCallback((item: InwardEntry, columnKey: keyof InwardEntry | "actions" | "sr_no", index: number) => {
    switch (columnKey) {
      case "sr_no": {
        const srNo = (page - 1) * rowsPerPage + index + 1;
        return (
          <div className="text-[13px] text-center font-medium text-gray-600">
            {srNo}
          </div>
        );
      }
      case "inward_no":
        return (
          <Chip color="accent" variant="soft">
            {item.inward_no}
          </Chip>
        );
      case "client_org_name":
        return item.client_org_name;
        case "received_date":
        return formatDate(item.received_date);
      case "inward_date":
        return formatDate(item.inward_date);
      case "calibration_method":

        return item.calibration_method ? 'lab_method' : 'Lab Method';
      case "reporting_method":
        return item.reporting_method ? 'lab_method' : 'Lab Method';
      case "actions":
        return (
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white h-7 px-3 text-xs" onPress={() => onCalibrationClick?.(item)}>
            Calibration
          </Button>
        );
      default:
        return "";
    }
  }, [formatDate, onCalibrationClick, page, rowsPerPage]);

  const topContent = React.useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <Input
            className="w-full sm:max-w-[44%]"
            placeholder="Filter by company name..."
            value={filterValue}
            onChange={(event) => setFilterValue(event.target.value)}
          />
          {filterValue ? <Button type="button" variant="ghost" aria-label="Clear filter" onPress={() => setFilterValue("")}>Clear</Button> : null}
          <div className="flex gap-3">
            {onRefresh && (
              <Button onPress={onRefresh} size="sm" variant="secondary" isDisabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }, [filterValue, onRefresh, loading]);

  const onRowsPerPageChange = React.useCallback((key: Key | null) => {
    const value = Number(key ?? rowsPerPage);
    setRowsPerPage(value);
    setPage(1);
  }, [rowsPerPage]);

  const bottomContent = React.useMemo(() => {
    return (
      <div className="w-full flex flex-col sm:grid sm:grid-cols-3 sm:items-center px-4 py-3 gap-3 border-t bg-gray-50 text-sm">
        <span className="text-gray-600 whitespace-nowrap font-medium sm:justify-self-start">
          Showing {items.length > 0 ? (page - 1) * rowsPerPage + 1 : 0} to{' '}
          {Math.min(page * rowsPerPage, filteredItems.length)} of {filteredItems.length} entries
        </span>

        <div className="sm:justify-self-center">
          <TablePagination page={page} totalPages={pages} onPageChange={setPage} />
        </div>

        <div className="sm:justify-self-end flex items-center gap-2">
          <Select
            selectedKey={String(rowsPerPage)}
            onSelectionChange={onRowsPerPageChange}
            className="min-w-[170px]"
          >
            <Label>Rows per page</Label>
            <Select.Trigger className="h-8 border border-gray-300 bg-white"><Select.Value /><Select.Indicator /></Select.Trigger>
            <Select.Popover>
              <ListBox>
                {['10', '20', '50', '100'].map((size) => (
                  <ListBox.Item key={size} id={size} textValue={size}>{size}<ListBox.ItemIndicator /></ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
      </div>
    );
  }, [items.length, filteredItems.length, page, pages, rowsPerPage, onRowsPerPageChange]);

  return (
    <div className="p-2">
      <div className="industrial-table-wrapper">
        <div className="mb-4">{topContent}</div>
        <Table aria-label="Calibration Inward" className={dataTableClassName("min-w-full")}>
          <Table.ScrollContainer className="max-h-[calc(100vh-320px)]">
          <Table.Content>
          <Table.Header>
            {columns.map((c) => (
              <Table.Column key={c.uid} id={String(c.uid)} isRowHeader={c.uid === columns[0]?.uid}>{c.name}</Table.Column>
            ))}
          </Table.Header>
          <Table.Body items={items} renderEmptyState={() => <div className="py-8 text-center text-sm text-default-500">{loading ? 'Loading...' : error || 'No data'}</div>}>
            {(item) => (
              <Table.Row id={item.id} columns={columns}>
                {(columnKey) => {
                  const column = columns.find((candidate) => String(candidate.uid) === getTableColumnKey(columnKey));
                  return <Table.Cell>{column ? renderCell(item, column.uid, items.indexOf(item)) : null}</Table.Cell>;
                }}
              </Table.Row>
            )}
          </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
        {bottomContent}
      </div>
    </div>
  )
}

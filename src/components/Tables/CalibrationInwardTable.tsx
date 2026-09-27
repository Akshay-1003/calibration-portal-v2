"use client"
import React, { useEffect } from "react"
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Input, Button, Select, SelectItem, Chip, Pagination } from "@heroui-v2/react"
import { InwardEntry } from "../../types"
import "../../styles/industrial-table.css"

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
          <Chip color="primary" variant="flat" radius="sm">
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
            isClearable
            className="w-full sm:max-w-[44%]"
            placeholder="Filter by company name..."
            value={filterValue}
            onClear={() => setFilterValue("")}
            onValueChange={setFilterValue}
          />
          <div className="flex gap-3">
            {onRefresh && (
              <Button onPress={onRefresh} size="sm" variant="flat" isDisabled={loading}>
                {loading ? "Refreshing..." : "Refresh"}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }, [filterValue, onRefresh, loading]);

  const onRowsPerPageChange = React.useCallback((keys: Selection) => {
    const value = Number(Array.from(keys)[0]);
    setRowsPerPage(value);
    setPage(1);
  }, []);

  const bottomContent = React.useMemo(() => {
    return (
      <div className="w-full flex flex-col sm:grid sm:grid-cols-3 sm:items-center px-4 py-3 gap-3 border-t bg-gray-50 text-sm">
        <span className="text-gray-600 whitespace-nowrap font-medium sm:justify-self-start">
          Showing {items.length > 0 ? (page - 1) * rowsPerPage + 1 : 0} to{' '}
          {Math.min(page * rowsPerPage, filteredItems.length)} of {filteredItems.length} entries
        </span>

        <div className="sm:justify-self-center">
          <Pagination
            color="primary"
            isCompact
            showControls
            page={page}
            total={pages}
            onChange={setPage}
            className="scale-90"
            classNames={{
              item: "bg-white border-gray-300",
              cursor: "bg-blue-600 text-white",
            }}
          />
        </div>

        <div className="sm:justify-self-end flex items-center gap-2">
          <Select
            label="Rows per page"
            selectedKeys={new Set([String(rowsPerPage)])}
            onSelectionChange={onRowsPerPageChange}
            labelPlacement="outside-left"
            size="sm"
            className="min-w-[170px]"
            classNames={{
              trigger: "bg-white border-gray-300 h-8",
            }}
          >
            <SelectItem key="10">10</SelectItem>
            <SelectItem key="20">20</SelectItem>
            <SelectItem key="50">50</SelectItem>
            <SelectItem key="100">100</SelectItem>
          </Select>
        </div>
      </div>
    );
  }, [items.length, filteredItems.length, page, pages, rowsPerPage, onRowsPerPageChange]);

  return (
    <div className="p-2">
      <div className="industrial-table-wrapper">
        <Table aria-label="Calibration Inward" isHeaderSticky bottomContent={bottomContent} bottomContentPlacement="outside" classNames={{ wrapper: "max-h-[calc(100vh-320px)] p-0", base: "min-w-full" }} topContent={topContent} topContentPlacement="outside" >
          <TableHeader>
            {columns.map((c) => (
              <TableColumn key={c.uid} align={c.uid === "actions" || c.uid === "sr_no" ? "center" : "start"}>{c.name}</TableColumn>
            ))}
          </TableHeader>
          <TableBody emptyContent={error || "No data"} items={items} isLoading={loading}
          loadingContent={<div className="py-8 flex justify-center items-center text-sm text-default-500"><svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Loading...</div>}>
            {items.map((item, index) => (
              <TableRow key={item.id}>
                {columns.map((c) => (
                  <TableCell key={`${item.id}-${String(c.uid)}`}>{renderCell(item, c.uid, index)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

import React from 'react';
import {
  Document,
  Page,
  PDFViewer,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import type { InvoiceData, InvoiceItem } from './InvoiceTemplate';
import {
  getInvoicePdfTableColumns,
  getInvoicePdfTotalRowCells,
  type InvoicePdfTableColumn,
} from '../../utils/invoicePdfColumns';
import { formatDateStringForDisplay } from '../../utils/dateAdapter';
import { buildInvoicePdfDisplayRows, getInvoicePdfServiceTotals } from '../../utils/invoicePdfRows';
import { buildInvoiceSummaryRows } from '../../utils/invoiceSummaryRows';

const TABLE_BORDER_COLOR = '#374151';
const TABLE_BORDER_WIDTH = 0.8;
const TABLE_BORDER = `${TABLE_BORDER_WIDTH}pt solid ${TABLE_BORDER_COLOR}`;
const A4_PAGE_HEIGHT = 841.89;
// Match QuotationPDFDocument's standard A4 handling. Keeping a real A4 media
// size avoids Chrome/printer auto-rotating a custom-sized PDF blob.
const PAGE_TOP_PADDING = 14;
const PAGE_BOTTOM_PADDING = 18;
const PAGE_LEFT_PADDING = 16;
const PAGE_RIGHT_PADDING = 16;
const PAGE_VERTICAL_PADDING = PAGE_TOP_PADDING + PAGE_BOTTOM_PADDING;
const A4_PAGE_CONTENT_HEIGHT = A4_PAGE_HEIGHT - PAGE_VERTICAL_PADDING;
const TABLE_HEADER_HEIGHT = 22;
// The first page header contains variable-length company and customer details.
// Reserve enough space for wrapped addresses before placing table rows.
const FIRST_PAGE_HEADER_HEIGHT = 112;
const TABLE_TOTAL_ROW_HEIGHT = 20;
const TABLE_BOTTOM_MARGIN = 6;
const AMOUNT_WORDS_HEIGHT = 14;
const FOOTER_SECTION_TOP_MARGIN = 6;
const FOOTER_INNER_TABLE_TOP_MARGIN = 6;
const BANK_DETAILS_HEIGHT = 102;
const TOTALS_ROW_HEIGHT = 18;
const SIGNATURE_SECTION_HEIGHT = 44;
// Page numbers are absolutely positioned inside the page padding. Keep a small
// band only to avoid visual overlap, not a second full footer reservation.
const PAGE_NUMBER_RESERVED_HEIGHT = 12;
const PAGINATION_SAFETY_BUFFER = 10;
const MIN_ROW_HEIGHT = 17;
const WRAPPED_LINE_HEIGHT = 6.5;
const MIN_FINAL_PAGE_ROWS_ON_SPLIT = 4;

interface InvoicePdfPage {
  items: InvoiceItem[];
  startIndex: number;
}

interface InvoicePaginationOptions {
  summaryRowCount?: number;
  amountInWords?: string;
}

const getTextLineCount = (value: string, charactersPerLine: number) =>
  Math.max(1, Math.ceil(value.trim().length / charactersPerLine));

const estimateRowHeight = (item: InvoiceItem) => {
  const gaugeLines = getTextLineCount(item.gauge_name || '-', 22);
  const identificationLines = getTextLineCount(item.identification_number || '-', 16);
  const specificationLines = getTextLineCount(item.specification || '-', 32);
  const maxLines = Math.max(gaugeLines, identificationLines, specificationLines);

  return MIN_ROW_HEIGHT + Math.max(0, maxLines - 1) * WRAPPED_LINE_HEIGHT;
};

const estimateRowsHeight = (items: InvoiceItem[], startIndex = 0, endIndex = items.length) =>
  items
    .slice(startIndex, endIndex)
    .reduce((total, item) => total + estimateRowHeight(item), 0);

const estimateLastPageSummaryHeight = ({
  summaryRowCount = 6,
  amountInWords = '',
}: InvoicePaginationOptions = {}) => {
  const amountWordsExtraLine =
    amountInWords.trim().length > 82 ? WRAPPED_LINE_HEIGHT : 0;
  const totalsHeight =
    FOOTER_INNER_TABLE_TOP_MARGIN + Math.max(summaryRowCount, 1) * TOTALS_ROW_HEIGHT;
  const bottomTablesHeight = Math.max(BANK_DETAILS_HEIGHT, totalsHeight);

  return (
    TABLE_TOTAL_ROW_HEIGHT +
    TABLE_BOTTOM_MARGIN +
    AMOUNT_WORDS_HEIGHT +
    amountWordsExtraLine +
    FOOTER_SECTION_TOP_MARGIN +
    bottomTablesHeight +
    SIGNATURE_SECTION_HEIGHT
  );
};

const getAvailableRowHeight = ({
  isFirstPage,
  isLastPage,
  showPageNumber,
  summaryHeight,
}: {
  isFirstPage: boolean;
  isLastPage: boolean;
  showPageNumber: boolean;
  summaryHeight: number;
}) =>
  A4_PAGE_CONTENT_HEIGHT -
  TABLE_HEADER_HEIGHT -
  (isFirstPage ? FIRST_PAGE_HEADER_HEIGHT : 0) -
  (isLastPage ? summaryHeight : 0) -
  (showPageNumber ? PAGE_NUMBER_RESERVED_HEIGHT : 0) -
  PAGINATION_SAFETY_BUFFER;

const takeRowsForHeight = (
  items: InvoiceItem[],
  startIndex: number,
  availableHeight: number,
  minimumRows = 1,
) => {
  let usedHeight = 0;
  let nextIndex = startIndex;

  while (nextIndex < items.length) {
    const rowHeight = estimateRowHeight(items[nextIndex]);
    if (nextIndex > startIndex && usedHeight + rowHeight > availableHeight) {
      break;
    }
    if (nextIndex === startIndex && rowHeight > availableHeight && minimumRows <= 1) {
      nextIndex += 1;
      break;
    }
    usedHeight += rowHeight;
    nextIndex += 1;
  }

  return Math.max(nextIndex, Math.min(items.length, startIndex + minimumRows));
};

export const paginateInvoiceItems = (
  items: InvoiceItem[],
  options: InvoicePaginationOptions = {},
): InvoicePdfPage[] => {
  if (items.length === 0) {
    return [{ items: [], startIndex: 0 }];
  }

  const summaryHeight = estimateLastPageSummaryHeight(options);
  const pages: InvoicePdfPage[] = [];
  let startIndex = 0;

  while (startIndex < items.length) {
    const isFirstPage = pages.length === 0;
    const remainingItems = items.slice(startIndex);
    const lastPageCapacity = getAvailableRowHeight({
      isFirstPage,
      isLastPage: true,
      showPageNumber: true,
      summaryHeight,
    });

    const remainingHeight = estimateRowsHeight(remainingItems);

    if (remainingHeight <= lastPageCapacity) {
      pages.push({ items: remainingItems, startIndex });
      break;
    }

    const regularPageCapacity = getAvailableRowHeight({
      isFirstPage,
      isLastPage: false,
      showPageNumber: true,
      summaryHeight,
    });

    if (remainingHeight <= regularPageCapacity) {
      // Keep all remaining rows on this logical page. The final summary block is
      // unbreakable, so React-PDF will place it in the remaining space when it
      // truly fits, or move the complete block to the next physical page.
      pages.push({ items: remainingItems, startIndex });
      break;
    }

    let nextIndex = takeRowsForHeight(items, startIndex, regularPageCapacity);

    if (nextIndex >= items.length) {
      nextIndex = Math.max(startIndex + 1, items.length - 1);
    }

    const remainingAfterCandidate = items.length - nextIndex;
    if (
      remainingAfterCandidate > 0 &&
      remainingAfterCandidate < MIN_FINAL_PAGE_ROWS_ON_SPLIT
    ) {
      const desiredFinalRows = Math.min(
        MIN_FINAL_PAGE_ROWS_ON_SPLIT,
        items.length - startIndex - 1,
      );
      const adjustedNextIndex = items.length - desiredFinalRows;

      if (
        adjustedNextIndex > startIndex &&
        adjustedNextIndex < nextIndex &&
        estimateRowsHeight(items, adjustedNextIndex) <= lastPageCapacity
      ) {
        nextIndex = adjustedNextIndex;
      }
    }

    if (nextIndex <= startIndex) {
      nextIndex = Math.min(startIndex + 1, items.length);
    }

    pages.push({
      items: items.slice(startIndex, nextIndex),
      startIndex,
    });
    startIndex = nextIndex;
  }

  return pages;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: PAGE_TOP_PADDING,
    paddingBottom: PAGE_BOTTOM_PADDING,
    paddingLeft: PAGE_LEFT_PADDING,
    paddingRight: PAGE_RIGHT_PADDING,
    fontSize: 7.8,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
    color: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '2px solid #000',
    paddingBottom: 6,
    marginBottom: 8,
  },
  headerLeft: {
    flexGrow: 1,
    paddingRight: 12,
  },
  headerRight: {
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 140,
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  companyInfo: {
    fontSize: 7.8,
    marginBottom: 1,
    lineHeight: 1.25,
  },
  invoiceTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 6,
  },
  billTo: {
    width: '55%',
  },
  metaTable: {
    width: '45%',
  },
  sectionLabel: {
    fontSize: 8.6,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  boldText: {
    fontSize: 8.2,
    fontWeight: 'bold',
    lineHeight: 1.25,
  },
  normalText: {
    fontSize: 8,
    lineHeight: 1.25,
  },
  metaRow: {
    flexDirection: 'row',
    paddingVertical: 1.5,
  },
  metaLabel: {
    width: '40%',
    fontSize: 8,
    fontWeight: 400,
  },
  metaValue: {
    width: '40%',
    fontSize: 8,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  table: {
    width: '100%',
    borderTop: TABLE_BORDER,
    borderLeft: TABLE_BORDER,
    borderRight: TABLE_BORDER,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f3f3',
    borderBottom: TABLE_BORDER,
    minHeight: 22,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: TABLE_BORDER,
    minHeight: 17,
  },
  instrumentRow: {
    backgroundColor: '#ffffff',
  },
  serviceRow: {
    paddingLeft: 10,
  },
  tableTotalRow: {
    flexDirection: 'row',
    borderBottom: TABLE_BORDER,
    minHeight: 20,
    backgroundColor: '#ffffff',
  },
  tableTotalCell: {
    fontSize: 7.2,
    fontWeight: 'bold',
    paddingVertical: 4,
    paddingHorizontal: 3,
    borderRight: TABLE_BORDER,
    lineHeight: 1.15,
  },
  th: {
    fontSize: 7.2,
    fontWeight: 'bold',
    paddingVertical: 4,
    paddingHorizontal: 3,
    borderRight: TABLE_BORDER,
    textAlign: 'center',
  },
  td: {
    fontSize: 7.8,
    fontWeight: 400,
    paddingVertical: 3,
    paddingHorizontal: 3,
    borderRight: TABLE_BORDER,
    lineHeight: 1.15,
    minWidth: 0,
    flexShrink: 1,
  },
  tdGauge: {
    fontSize: 7.6,
    lineHeight: 1.12,
  },
  tdSpec: {
    fontSize: 7.6,
    lineHeight: 1.1,
    textAlign: 'center',
  },
  tdCompact: {
    fontSize: 7.6,
    lineHeight: 1.1,
  },
  tdIdentification: {
    fontSize: 7.1,
    lineHeight: 1.05,
    paddingHorizontal: 2,
  },
  tdRepair: {
    fontSize: 7.2,
    lineHeight: 1.05,
    paddingHorizontal: 2,
  },
  tdRight: {
    textAlign: 'right',
  },
  tdCenter: {
    textAlign: 'center',
  },
  noBorderRight: {
    borderRight: '0 solid transparent',
  },
  totalLabelCell: {
    width: '70.5%',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  totalQtyCell: {
    width: '12.5%',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  totalAmountCell: {
    width: '17%',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  colSr: { width: '4%' },
  colGauge: { width: '13.5%' },
  colId: { width: '12%' },
  colDc: { width: '9%' },
  colSpec: { width: '23%' },
  colHsn: { width: '7%' },
  colRepair: { width: '10.5%' },
  colCal: { width: '10%' },
  colQty: { width: '4%' },
  colAmount: { width: '10.5%' },
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 6,
  },
  bankBox: {
    width: '50%',
  },
  bankTable: {
    border: TABLE_BORDER,
    marginTop: 6,
  },
  amountWords: {
    fontSize: 8.2,
    fontWeight: 'bold',
  },
  finalSummaryBlock: {
    width: '100%',
    marginBottom: 6,
  },
  finalTotalTable: {
    width: '100%',
    borderLeft: TABLE_BORDER,
    borderRight: TABLE_BORDER,
    marginBottom: 6,
  },
  finalSummarySection: {
    width: '100%',
  },
  bankTitle: {
    fontSize: 8.2,
    fontWeight: 'bold',
    padding: 6,
    borderBottom: TABLE_BORDER,
  },
  bankRow: {
    flexDirection: 'row',
    borderBottom: TABLE_BORDER,
  },
  bankLabel: {
    width: '25%',
    paddingVertical: 3,
    paddingHorizontal: 4,
    fontSize: 7.4,
    fontWeight: 400,
  },
  bankValue: {
    width: '75%',
    paddingVertical: 3,
    paddingHorizontal: 4,
    fontSize: 7.4,
    lineHeight: 1.2,
    fontWeight: 'bold',
    borderLeft: TABLE_BORDER,
  },
  totalsTable: {
    width: '50%',
    border: TABLE_BORDER,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  totalsRow: {
    flexDirection: 'row',
    borderBottom: TABLE_BORDER,
  },
  totalsLabel: {
    width: '60%',
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 7.8,
    fontWeight: 400,
    borderRight: TABLE_BORDER,
  },
  totalsValue: {
    width: '40%',
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 7.8,
    textAlign: 'right',
    fontWeight: 'bold',
  },
  totalsSubtotalCell: {
    backgroundColor: '#f8fafc',
  },
  totalsSubtotalText: {
    fontWeight: 'bold',
  },
  totalsGrandText: {
    fontWeight: 'bold',
  },
  signatureSection: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBox: {
    width: '40%',
  },
  signatureLine: {
    borderBottom: TABLE_BORDER,
    marginTop: 18,
    marginBottom: 3,
  },
  pageFooter: {
    position: 'absolute',
    bottom: 8,
    right: PAGE_RIGHT_PADDING,
    width: 62,
    fontSize: 7,
    color: '#1f2937',
    border: '1px solid #6b7280',
    backgroundColor: '#ffffff',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 2,
    textAlign: 'center',
  },
});

const formatDate = (date?: string) => formatDateStringForDisplay(date, '-');

const formatCurrency = (value: number) => Number(value || 0).toFixed(2);

// Add break opportunities for compact identifiers such as VC/ESC/DC/IDM-02-01.
const wrapPdfCellText = (value: string) =>
  value
    .replace(/([\\/_-])/g, '$1\u200b')
    .replace(/([A-Za-z0-9]{12})(?=[A-Za-z0-9])/g, '$1\u200b');

const numberToWords = (num: number): string => {
  const ones = [
    '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
    'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN',
    'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN',
  ];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ` ${ones[num % 10]}` : '');
  if (num < 1000) {
    return ones[Math.floor(num / 100)] + ' HUNDRED' + (num % 100 ? ` ${numberToWords(num % 100)}` : '');
  }
  if (num < 100000) {
    return numberToWords(Math.floor(num / 1000)) + ' THOUSAND' + (num % 1000 ? ` ${numberToWords(num % 1000)}` : '');
  }
  if (num < 10000000) {
    return numberToWords(Math.floor(num / 100000)) + ' LAKH' + (num % 100000 ? ` ${numberToWords(num % 100000)}` : '');
  }
  return 'AMOUNT';
};

export const InvoicePDFDocument: React.FC<{ data: InvoiceData }> = ({ data }) => {
  const displayRows = buildInvoicePdfDisplayRows(data.items);
  const amountInWords = `${numberToWords(Math.round(data.rounded_off_total))} RUPEES ONLY`;
  const tableColumns = getInvoicePdfTableColumns(data.pdf_columns, data.items, {
    autoEnableServiceColumns: !data.pdf_columns_user_configured,
  });
  const serviceTotals = getInvoicePdfServiceTotals(displayRows);
  const totalsRows = buildInvoiceSummaryRows(data, displayRows);
  const pages = paginateInvoiceItems(displayRows, {
    summaryRowCount: totalsRows.length,
    amountInWords,
  });
  const totalPages = pages.length;
  const totalRowCells = getInvoicePdfTotalRowCells(tableColumns, {
    calibration_charge: formatCurrency(serviceTotals.calibration),
    repair_new: formatCurrency(serviceTotals.repair),
    qty: serviceTotals.quantity,
    amount: formatCurrency(serviceTotals.amount),
  });

  const getItemCellValue = (item: InvoiceItem, column: InvoicePdfTableColumn, rowNumber: number) => {
    void rowNumber;
    switch (column.key) {
      case 'sr_no':
        return String(item.sr_no);
      case 'gauge_name':
        return item.gauge_name || '-';
      case 'identification_number':
        return item.identification_number || '-';
      case 'dc_no':
        return item.dc_no || '-';
      case 'specification':
        return item.specification || '-';
      case 'hsn':
        return item.hsn || '-';
      case 'repair_new':
        return item.repair_new > 0 ? formatCurrency(item.repair_new) : '-';
      case 'calibration_charge':
        return item.calibration_charge > 0 ? formatCurrency(item.calibration_charge) : '-';
      case 'qty':
        return String(item.qty);
      case 'rate':
        return formatCurrency(item.amount);
      case 'discount':
        return item.discount_amount ? formatCurrency(item.discount_amount) : '-';
      case 'amount':
        return formatCurrency(item.amount);
      default:
        return '-';
    }
  };

  const getCellStyles = (column: InvoicePdfTableColumn, isLastColumn: boolean) => [
    styles.td,
    { width: column.width },
    column.key === 'gauge_name' ? styles.tdGauge : undefined,
    column.key === 'identification_number' || column.key === 'dc_no' || column.key === 'hsn'
      ? styles.tdCompact
      : undefined,
    column.key === 'identification_number' ? styles.tdIdentification : undefined,
    column.key === 'hsn' ? { whiteSpace: 'nowrap' } : undefined,
    column.key === 'specification' ? styles.tdSpec : undefined,
    column.key === 'repair_new' ? styles.tdRepair : undefined,
    column.key === 'repair_new' ||
    column.key === 'calibration_charge' ||
    column.key === 'qty' ||
    column.key === 'rate' ||
    column.key === 'discount' ||
    column.key === 'amount'
      ? styles.tdRight
      : undefined,
    column.key === 'sr_no' ||
    column.key === 'identification_number' ||
    column.key === 'dc_no' ||
    column.key === 'specification' ||
    column.key === 'hsn'
      ? styles.tdCenter
      : undefined,
    isLastColumn ? styles.noBorderRight : undefined,
  ];

  const renderPage = (page: InvoicePdfPage, pageIndex: number) => {
    const { items: pageItems, startIndex } = page;
    const isFirstPage = pageIndex === 0;
    const isLastPage = pageIndex === totalPages - 1;

    return (
      <Page
        key={pageIndex}
        size="A4"
        style={styles.page}
      >
        {isFirstPage ? (
          <>
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.companyName}>{data.company_name}</Text>
                {data.office_address ? <Text style={styles.companyInfo}>{data.office_address}</Text> : null}
                {data.work_address ? <Text style={styles.companyInfo}>{data.work_address}</Text> : null}
                {data.company_email ? <Text style={styles.companyInfo}>Email: {data.company_email}</Text> : null}
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.invoiceTitle}>TAX INVOICE</Text>
              </View>
            </View>

            <View style={styles.infoSection}>
              <View style={styles.billTo}>
                <Text style={styles.sectionLabel}>TO</Text>
                <Text style={styles.boldText}>{data.client_name}</Text>
                <Text style={styles.normalText}>{data.client_address || '-'}</Text>
                {data.client_gst_no ? <Text style={styles.normalText}>GSTIN: {data.client_gst_no}</Text> : null}
              </View>

              <View style={styles.metaTable}>
                {[
                  ['INVOICE NO. :', data.invoice_number || '-'],
                  ['DATE :', formatDate(data.billing_date)],
                  // ['OUTWARD NO(S). :', data.outward_no || '-'],
                  ['ORDER NO. :', data.order_number || '-'],
                  ['ORDER DATE :', formatDate(data.order_date)],
                ].map(([label, value]) => (
                  <View key={String(label)} style={styles.metaRow}>
                    <Text style={styles.metaLabel}>{label}</Text>
                    <Text style={[styles.metaValue, { textAlign: 'left' }]}>{value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : null}

        <View style={styles.table}>
          <View style={styles.tableHeader} wrap={false}>
            {tableColumns.map((column, index) => (
              <Text
                key={column.key}
                style={[
                  styles.th,
                  { width: column.width },
                  index === tableColumns.length - 1 ? styles.noBorderRight : undefined,
                ]}
              >
                {column.label}
              </Text>
            ))}
          </View>

          {pageItems.map((item: InvoiceItem, index: number) => {
            return (
              <View
                key={`${item.sr_no}-${index}`}
                style={[styles.tableRow, item.row_kind === 'instrument' ? styles.instrumentRow : undefined]}
                wrap={false}
              >
                {tableColumns.map((column, columnIndex) => (
                  <Text
                    key={column.key}
                    style={[
                      ...getCellStyles(column, columnIndex === tableColumns.length - 1),
                      item.row_kind === 'service' && column.key === 'gauge_name' ? styles.serviceRow : undefined,
                    ]}
                  >
                    {wrapPdfCellText(getItemCellValue(item, column, startIndex + index + 1))}
                  </Text>
                ))}
              </View>
            );
          })}
        </View>

        {isLastPage ? (
          <View style={styles.finalSummaryBlock} wrap={false}>
            <View style={styles.finalTotalTable}>
              <View style={styles.tableTotalRow}>
                {totalRowCells.map((cell, cellIndex) => (
                  <Text
                    key={cell.key}
                    style={[
                      styles.tableTotalCell,
                      { width: cell.width, textAlign: cell.align },
                      cellIndex === totalRowCells.length - 1 ? styles.noBorderRight : undefined,
                    ]}
                  >
                    {cell.value}
                  </Text>
                ))}
              </View>
            </View>

            <View style={styles.finalSummarySection}>
              <View>
                <Text style={styles.amountWords}>AMOUNT IN WORDS: {amountInWords}</Text>
              </View>
              <View style={styles.footerSection}>
                <View style={styles.bankBox}>
                  <View style={styles.bankTable}>
                    <Text style={styles.bankTitle}>Bank Details</Text>
                    {[
                      ['BANK NAME', data.bank_name || '-'],
                      ['ACCOUNT NO.', data.account_number || '-'],
                      ['IFSC CODE', data.ifsc || '-'],
                      ['GSTIN', data.gstin || '-'],
                      ['PAN CARD', data.pan_no || '-'],
                    ].map(([label, value], index, array) => (
                      <View
                        key={String(label)}
                        style={[
                          styles.bankRow,
                          index === array.length - 1 ? { borderBottom: '0 solid transparent' } : undefined,
                        ]}
                      >
                        <Text style={styles.bankLabel}>{label}</Text>
                        <Text
                          style={[
                            styles.bankValue,
                            label !== 'BANK NAME' ? { letterSpacing: 0.3 } : undefined,
                          ]}
                        >
                          {value}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
                <View style={styles.totalsTable}>
                  {totalsRows.map((row, index, array) => (
                    <View
                      key={row.key}
                      style={[
                        styles.totalsRow,
                        row.emphasis === 'subtotal' ? styles.totalsSubtotalCell : undefined,
                        index === array.length - 1
                          ? { borderBottom: '0 solid transparent', minHeight: 0 }
                          : undefined,
                      ]}
                    >
                      <Text
                        style={[
                          styles.totalsLabel,
                          row.emphasis === 'subtotal' ? styles.totalsSubtotalText : undefined,
                          row.emphasis === 'total' ? styles.totalsGrandText : undefined,
                        ]}
                      >
                        {row.label}
                      </Text>
                      <Text
                        style={[
                          styles.totalsValue,
                          row.emphasis === 'subtotal' ? styles.totalsSubtotalText : undefined,
                          row.emphasis === 'total' ? styles.totalsGrandText : undefined,
                        ]}
                      >
                        {formatCurrency(Number(row.value))}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.signatureSection}>
                <View style={styles.signatureBox}>
                  <Text style={styles.normalText}>Receiver</Text>
                  <View style={styles.signatureLine} />
                </View>
                <View style={styles.signatureBox}>
                  <Text style={[styles.normalText, { textAlign: 'right' }]}>For {data.company_name}</Text>
                  <View style={styles.signatureLine} />
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {totalPages > 1 ? (
          <Text
            style={styles.pageFooter}
            fixed
            render={({ pageNumber, totalPages: renderedTotalPages }) =>
              `Page ${pageNumber} of ${renderedTotalPages}`
            }
          />
        ) : null}
      </Page>
    );
  };

  return (
    <Document
      title={`Invoice ${data.invoice_number || ''}`.trim()}
      author={data.company_name || 'MetrologyDesk'}
      subject={`Tax Invoice ${data.invoice_number || ''}`.trim()}
      creator="MetrologyDesk"
      producer="MetrologyDesk"
    >
      {pages.map((page, index) => renderPage(page, index))}
    </Document>
  );
};

export const InvoicePDFViewer: React.FC<{ data: InvoiceData }> = ({ data }) => (
  <PDFViewer width="100%" height="600">
    <InvoicePDFDocument data={data} />
  </PDFViewer>
);

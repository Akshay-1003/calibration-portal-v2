import {
  getInvoicePdfTableColumns,
  type InvoicePdfColumnKey,
  type InvoicePdfColumnVisibility,
  type InvoicePdfTableColumn,
} from '../../utils/invoicePdfColumns';
import { formatDateStringForDisplay } from '../../utils/dateAdapter';
import { buildInvoicePdfDisplayRows, getInvoicePdfServiceTotals } from '../../utils/invoicePdfRows';
import { buildInvoiceSummaryRows } from '../../utils/invoiceSummaryRows';

// Type definitions for Invoice data
export interface InvoiceItem {
  sr_no: number;
  gauge_name: string;
  identification_number: string;
  dc_no: string;
  specification: string;
  hsn: string;
  repair_new: number;
  calibration_charge: number;
  qty: number;
  amount: number;
  discount_amount?: number;
  service_description?: string;
  is_service_child?: boolean;
  instrument_quantity?: number;
  group_key?: string;
  standard_specification_id?: string;
  row_kind?: 'instrument' | 'service';
}

export interface InvoiceData {
  company_name: string;
  office_address: string;
  work_address: string;
  company_email: string;
  company_logo?: string;
  invoice_number: string;
  billing_date: string;
  outward_no: string;
  order_number?: string;
  order_date?: string;
  po_number?: string;
  po_date?: string;
  client_name: string;
  client_address: string;
  client_gst_no?: string;
  items: InvoiceItem[];
  total: number;
  total_qty: number;
  packing_forwarding_charges: number;
  courier_transport_charges: number;
  discount_amount: number;
  discount_percentage: number;
  net_amount: number;
  taxable_amount: number;
  sgst_percentage: number;
  sgst_amount: number;
  cgst_percentage: number;
  cgst_amount: number;
  grand_total: number;
  rounded_off_total: number;
  bank_name: string;
  account_number: string;
  ifsc: string;
  gstin: string;
  pan_no: string;
  pdf_columns?: Partial<InvoicePdfColumnVisibility>;
  pdf_columns_user_configured?: boolean;
  discount_mode?: 'invoice' | 'line';
}

interface InvoiceTemplateProps {
  data: InvoiceData;
  className?: string;
}

export const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ data, className = '' }) => {
  const formatDate = (d?: string) => formatDateStringForDisplay(d, '-');

  const money = (n: number) => n.toFixed(2);
  const borderColor = '#cbd5e1';
  const thinBorderColor = '#cbd5e1';
  const tableColumns = getInvoicePdfTableColumns(data.pdf_columns, data.items, {
    autoEnableServiceColumns: !data.pdf_columns_user_configured,
    preferModernServiceColumns: !data.pdf_columns_user_configured,
  });
  const displayRows = buildInvoicePdfDisplayRows(data.items);
  const serviceTotals = getInvoicePdfServiceTotals(displayRows);
  const totalsRows = buildInvoiceSummaryRows(data, displayRows);
  const tableFooterTotals: Partial<Record<InvoicePdfColumnKey, string | number>> = {
    calibration_charge: money(serviceTotals.calibration),
    repair_new: money(serviceTotals.repair),
    qty: serviceTotals.quantity,
    amount: money(serviceTotals.amount),
  };
  const firstFooterTotalIndex = tableColumns.findIndex(
    (column) => tableFooterTotals[column.key] !== undefined,
  );
  const footerValueColumns =
    firstFooterTotalIndex >= 0 ? tableColumns.slice(firstFooterTotalIndex) : [];

  const getCellValue = (item: InvoiceItem, column: InvoicePdfTableColumn) => {
    switch (column.key) {
      case 'sr_no':
        return item.sr_no;
      case 'gauge_name':
        return item.gauge_name || '-';
      case 'identification_number':
        return item.identification_number?.trim() || '-';
      case 'dc_no':
        return item.dc_no || '-';
      case 'specification':
        return item.specification || '-';
      case 'hsn':
        return item.hsn || '-';
      case 'repair_new':
        return item.repair_new > 0 ? money(item.repair_new) : '-';
      case 'calibration_charge':
        return item.calibration_charge > 0 ? money(item.calibration_charge) : '-';
      case 'qty':
        return item.qty;
      case 'rate':
        return money(item.amount);
      case 'discount':
        return item.discount_amount ? money(item.discount_amount) : '-';
      case 'amount':
        return money(item.amount);
      default:
        return '-';
    }
  };

  const getCellTextAlign = (column: InvoicePdfTableColumn) => {
    if (
      column.key === 'repair_new' ||
      column.key === 'calibration_charge' ||
      column.key === 'qty' ||
      column.key === 'rate' ||
      column.key === 'discount' ||
      column.key === 'amount'
    ) {
      return 'right';
    }

    if (
      column.key === 'sr_no' ||
      column.key === 'identification_number' ||
      column.key === 'dc_no' ||
      column.key === 'specification' ||
      column.key === 'hsn'
    ) {
      return 'center';
    }

    return 'left';
  };

  const numberToWords = (num: number): string => {
    const ones = [
      '', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE',
      'TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN',
      'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN',
    ];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];

    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ` ${ones[num % 10]}` : '');
    if (num < 1000) return ones[Math.floor(num / 100)] + ' HUNDRED' + (num % 100 ? ` ${numberToWords(num % 100)}` : '');
    if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' THOUSAND' + (num % 1000 ? ` ${numberToWords(num % 1000)}` : '');
    if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' LAKH' + (num % 100000 ? ` ${numberToWords(num % 100000)}` : '');
    return 'AMOUNT';
  };
  const amountInWords = `${numberToWords(Math.round(data.rounded_off_total))} RUPEES ONLY`;

  return (
    <div
      className={`invoice-print ${className}`}
      style={{
        width: '100%',
        color: '#000',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '12px',
        background: '#fff',
        padding: '16px 20px 18px',
      }}
    >
      <div style={{ width: '100%' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: '20px',
            alignItems: 'start',
            marginBottom: '12px',
            borderBottom: '2px solid #000',
            paddingBottom: '10px',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 800, lineHeight: 1.1 }}>
              {data.company_name}
            </h1>
            {data.office_address ? (
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', lineHeight: 1.35 }}>{data.office_address}</p>
            ) : null}
            {data.work_address ? (
              <p style={{ margin: 0, fontSize: '11px', lineHeight: 1.35 }}>{data.work_address}</p>
            ) : null}
            {data.company_email ? (
              <p style={{ margin: 0, fontSize: '11px', lineHeight: 1.35 }}>Email: {data.company_email}</p>
            ) : null}
          </div>
          <div style={{ textAlign: 'center', alignSelf: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, lineHeight: 1.2 }}>
              TAX INVOICE
            </h2>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '18px',
            marginBottom: '10px',
            fontSize: '12px',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, marginBottom: '4px' }}>TO,</div>
            <div style={{ fontWeight: 700, textTransform: 'uppercase' }}>{data.client_name}</div>
            <div>{data.client_address || '-'}</div>
            {data.client_gst_no ? <div>GSTIN: {data.client_gst_no}</div> : null}
          </div>

          <div style={{ width: '100%', display: 'grid', gridTemplateColumns: data.po_number || data.po_date ? '1.2fr 1fr' : '1fr', gap: '12px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', tableLayout: 'fixed' }}>
              <tbody>
                {[
                  ['INVOICE NO. :', data.invoice_number || '-'],
                  ['DATE :', formatDate(data.billing_date)],
                  ['ORDER NO. :', data.order_number || '-'],
                  ['ORDER DATE :', formatDate(data.order_date)],
                ].map(([label, value]) => (
                  <tr key={String(label)}>
                    <td style={{ padding: '2px 3px 2px 0', fontWeight: 700, width: '42%', verticalAlign: 'top' }}>{label}</td>
                    <td style={{ padding: '2px 0', textAlign: 'left', fontWeight: 700, width: '58%', overflowWrap: 'anywhere', wordBreak: 'break-word', verticalAlign: 'top' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.po_number || data.po_date ? <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', tableLayout: 'fixed' }}>
              <tbody>
                {[
                  ...(data.po_number ? [['PO NO. :', data.po_number]] : []),
                  ...(data.po_date ? [['PO DATE :', formatDate(data.po_date)]] : []),
                ].map(([label, value]) => (
                  <tr key={String(label)}>
                    <td style={{ padding: '2px 3px 2px 0', fontWeight: 700, width: '35%', verticalAlign: 'top' }}>{label}</td>
                    <td style={{ padding: '2px 0', textAlign: 'left', fontWeight: 700, width: '65%', overflowWrap: 'anywhere', wordBreak: 'break-word', verticalAlign: 'top' }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table> : null}
          </div>
        </div>

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '0',
            fontSize: '11px',
            tableLayout: 'fixed',
          }}
        >
          <thead>
            <tr>
              {tableColumns.map((head) => (
                <th
                  key={head.key}
                  style={{
                    border: '1px solid #666',
                    borderColor,
                    padding: '5px 4px',
                    textAlign: 'center',
                    fontWeight: 700,
                    width: head.width,
                    background: '#f3f3f3',
                  }}
                >
                  {head.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((item, rowIndex) => {
              return (
                <tr key={`${item.group_key || item.sr_no}-${rowIndex}`}>
                  {tableColumns.map((column) => (
                    <td
                      key={column.key}
                      style={{
                        border: '1px solid #666',
                        borderColor,
                        padding: '4px',
                        paddingLeft: '4px',
                        fontSize:
                          column.key === 'identification_number' || column.key === 'repair_new'
                            ? '11px'
                            : '12px',
                        fontWeight: 400,
                        background: '#ffffff',
                        lineHeight:
                          column.key === 'identification_number' || column.key === 'repair_new'
                            ? 1.2
                            : column.key === 'specification' ? 1.35 : undefined,
                        textAlign: getCellTextAlign(column),
                        verticalAlign: 'middle',
                        whiteSpace: column.key === 'hsn' ? 'nowrap' : undefined,
                        overflowWrap: 'anywhere',
                        wordBreak: 'break-word',
                        width: column.width,
                      }}
                    >
                      {getCellValue(item, column)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              {firstFooterTotalIndex > 0 ? (
                <td
                  colSpan={firstFooterTotalIndex}
                  style={{
                    border: '1px solid #666',
                    borderColor,
                    padding: '5px 4px',
                    fontWeight: 700,
                    textAlign: 'right',
                    background: '#ffffff',
                  }}
                >
                  Total
                </td>
              ) : null}
              {footerValueColumns.map((column) => {
                const value = tableFooterTotals[column.key];
                return (
                  <td
                    key={`total-${column.key}`}
                    style={{
                      border: '1px solid #666',
                      borderColor,
                      padding: '5px 4px',
                      fontWeight: 700,
                      textAlign: column.key === 'qty' ? 'center' : 'right',
                      width: column.width,
                      background: '#ffffff',
                    }}
                  >
                    {value === undefined || value === null ? '' : value}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 360px',
            gap: '16px',
            alignItems: 'start',
          }}
        >
          <div style={{ fontSize: '11px' }}>
            <div
              style={{
                fontWeight: 700,
                marginBottom: '6px',
              }}
            >
              AMOUNT IN WORDS: {amountInWords}
            </div>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                border: `1px solid ${thinBorderColor}`,
                fontSize: '11px',
              }}
            >
              <tbody>
                <tr>
                  <td
                    colSpan={2}
                    style={{
                      borderBottom: `1px solid ${thinBorderColor}`,
                      padding: '8px 10px 6px',
                      fontWeight: 700,
                    }}
                  >
                    Bank Details
                  </td>
                </tr>
                {[
                  ['BANK NAME', data.bank_name || '-'],
                  ['ACCOUNT NO.', data.account_number],
                  ['IFSC CODE', data.ifsc || '-'],
                  ['GSTIN', data.gstin || '-'],
                  ['PAN CARD', data.pan_no || '-'],
                ].map(([label, value], index, array) => (
                  <tr key={String(label)}>
                    <td
                      style={{
                        width: '25%',
                        padding: '2px 4px',
                        fontWeight: 700,
                        verticalAlign: 'top',
                        borderBottom: index === array.length - 1 ? 'none' : `1px solid ${thinBorderColor}`,
                      }}
                    >
                      {label}
                    </td>
                    <td
                      style={{
                        width: '75%',
                        padding: '2px 4px',
                        fontWeight: 700,
                        borderBottom: index === array.length - 1 ? 'none' : `1px solid ${thinBorderColor}`,
                        borderLeft:`1px solid ${thinBorderColor}`,
                        letterSpacing: label !== 'BANK NAME' ? '0.05rem':''
                      }}
                    >
                      {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <tbody>
              {totalsRows.map((row) => (
                <tr
                  key={row.key}
                  style={{
                    background: row.emphasis === 'subtotal' ? '#f8fafc' : '#ffffff',
                  }}
                >
                  <td
                    style={{
                      border: '1px solid #666',
                      borderColor,
                      padding: '4px 6px',
                      fontWeight: row.emphasis ? 700 : 500,
                    }}
                  >
                    {row.label}
                  </td>
                  <td
                    style={{
                      border: '1px solid #666',
                      borderColor,
                      padding: '4px 6px',
                      textAlign: 'right',
                      fontWeight: row.emphasis ? 700 : 500,
                    }}
                  >
                    {money(Number(row.value))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

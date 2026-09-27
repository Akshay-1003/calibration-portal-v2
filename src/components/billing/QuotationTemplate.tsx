import React from 'react';
import { type Quotation } from '../../store/quotationStore';
import { QUOTATION_PRINT_STYLES } from './quotationPrintStyles';
import { resolveQuotationRangeSize } from '../../utils/quotationDocumentUtils';

interface QuotationTemplateProps {
  data: Quotation;
  className?: string;
}

const COMPANY_LOGO = '/images/logo/logo.svg';

const formatDate = (date?: string) => {
  if (!date) return '-';
  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.getTime())
    ? date
    : parsedDate.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
};

const formatMoney = (value?: number) => `₹${(value || 0).toFixed(2)}`;

const buildPartyDetails = (kind: 'from' | 'to', data: Quotation) => [
  {
    label: kind === 'from' ? 'Firm:' : 'Customer:',
    value:
      kind === 'from'
        ? data.billing_firm_name?.trim() || '-'
        : data.customer_name?.trim() || '-',
    emphasis: true,
  },
  {
    label: 'Address:',
    value:
      kind === 'from'
        ? data.billing_firm_address?.trim() || '-'
        : data.customer_address?.trim() || '-',
  },
  {
    label: 'Contact:',
    value:
      kind === 'from'
        ? data.billing_firm_contact?.trim() || '-'
        : data.customer_contact?.trim() || '-',
  },
  {
    label: 'Email:',
    value:
      kind === 'from'
        ? data.billing_firm_email?.trim() || '-'
        : data.customer_email?.trim() || '-',
  },
  {
    label: 'GST No:',
    value:
      kind === 'from'
        ? data.billing_firm_gst?.trim() || '-'
        : data.customer_gst?.trim() || '-',
  },
];

const getDiscountText = (
  type: Quotation['items'][number]['discount_type'],
  value: number,
) => {
  if (!type || value <= 0) return '-';
  if (type === 'percentage') return `${value}%`;
  return formatMoney(value);
};

const toFiniteNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const formatRateLabel = (label: string, rate?: number) =>
  rate && rate > 0 ? `${label} (${Number(rate.toFixed(2))}%)` : label;

const buildSummaryRows = (data: Quotation) => {
  const rows: Array<{ label: string; value: number; strong?: boolean }> = [
    { label: 'Subtotal', value: toFiniteNumber(data.subtotal) },
  ];

  if (toFiniteNumber(data.total_discount) > 0) {
    rows.push({
      label: 'Total Discount',
      value: -toFiniteNumber(data.total_discount),
    });
  }

  const hasTax =
    toFiniteNumber(data.cgst_amount) > 0 ||
    toFiniteNumber(data.sgst_amount) > 0 ||
    toFiniteNumber(data.igst_amount) > 0;

  if (toFiniteNumber(data.total_discount) > 0 || hasTax) {
    rows.push({
      label: 'Taxable Amount',
      value: toFiniteNumber(data.taxable_amount),
    });
  }

  if (toFiniteNumber(data.cgst_amount) > 0) {
    rows.push({
      label: formatRateLabel('CGST', data.cgst_rate),
      value: toFiniteNumber(data.cgst_amount),
    });
  }

  if (toFiniteNumber(data.sgst_amount) > 0) {
    rows.push({
      label: formatRateLabel('SGST', data.sgst_rate),
      value: toFiniteNumber(data.sgst_amount),
    });
  }

  if (toFiniteNumber(data.igst_amount) > 0) {
    rows.push({
      label: formatRateLabel('IGST', data.igst_rate),
      value: toFiniteNumber(data.igst_amount),
    });
  }

  if (Math.abs(toFiniteNumber(data.round_off)) >= 0.005) {
    rows.push({ label: 'Round Off', value: toFiniteNumber(data.round_off) });
  }

  rows.push({
    label: 'Grand Total',
    value: toFiniteNumber(data.grand_total),
    strong: true,
  });
  return rows;
};

export const QuotationTemplate: React.FC<QuotationTemplateProps> = ({
  data,
  className = '',
}) => {
  const senderDetails = buildPartyDetails('from', data);
  const customerDetails = buildPartyDetails('to', data);
  const termsToRender = (data.terms_conditions || []).filter(
    (term, index, array): term is string => {
      if (!term || !term.trim()) return false;
      return array.findIndex((item) => item?.trim() === term.trim()) === index;
    },
  );
  const summaryRows = buildSummaryRows(data);

  return (
    <div className={className}>
      <div className="quotation-print">
        <div className="quotation-sheet">
          <div className="quotation-topbar">
            <div className="quotation-brand">
              <img
                src={COMPANY_LOGO}
                alt="Company logo"
                className="quotation-logo"
              />
            </div>

            <div className="quotation-meta-stack">
              <div className="quotation-doc-title">Quotation</div>

              <div className="quotation-meta-item">
                <div className="quotation-meta-label">Quotation No.</div>
                <div className="quotation-meta-value">
                  {data.quotation_number || '-'}
                </div>
              </div>
              <div className="quotation-meta-item">
                <div className="quotation-meta-label">Quotation Date</div>
                <div className="quotation-meta-value">
                  {formatDate(data.quotation_date)}
                </div>
              </div>
            </div>
          </div>

          <div className="quotation-body">
            <div className="quotation-party-grid">
              <div className="quotation-party-card">
                <div className="quotation-party-title">From</div>
                <div className="quotation-party-body">
                  {senderDetails.map((detail) => (
                    <div
                      key={`sender-${detail.label}`}
                      className="quotation-party-detail"
                    >
                      <span className="quotation-party-detail-label">
                        {detail.label}
                      </span>
                      <span
                        className={
                          detail.emphasis
                            ? 'quotation-party-detail-value quotation-party-detail-value-strong'
                            : 'quotation-party-detail-value'
                        }
                      >
                        {detail.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="quotation-party-card">
                <div className="quotation-party-title">To</div>
                <div className="quotation-party-body">
                  {customerDetails.map((detail) => (
                    <div
                      key={`customer-${detail.label}`}
                      className="quotation-party-detail"
                    >
                      <span className="quotation-party-detail-label">
                        {detail.label}
                      </span>
                      <span
                        className={
                          detail.emphasis
                            ? 'quotation-party-detail-value quotation-party-detail-value-strong'
                            : 'quotation-party-detail-value'
                        }
                      >
                        {detail.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="quotation-table-wrap">
              <table className="quotation-items-table">
                <thead>
                  <tr>
                    <th className="quotation-col-sr">Sr. No.</th>
                    <th className="quotation-col-gauge">Equipment Name</th>
                    <th className="quotation-col-serial">Serial No.</th>
                    <th className="quotation-col-make">Make</th>
                    <th className="quotation-col-range">Specifications</th>
                    <th className="quotation-col-hsn">HSN / SAC</th>
                    <th className="quotation-col-qty">Qty</th>
                    <th className="quotation-col-money">Base Price</th>
                    <th className="quotation-col-discount">Discount</th>
                    <th className="quotation-col-final">Final Price</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item, index) => (
                    <tr
                      key={item.id}
                      className={
                        index % 2 === 1 ? 'quotation-row-alt' : undefined
                      }
                    >
                      <td className="quotation-col-sr">{index + 1}</td>
                      <td className="quotation-col-gauge">
                        <div className="quotation-gauge-name">
                          {item.gauge_name || '-'}
                        </div>
                      </td>
                      <td className="quotation-col-serial">
                        {item.serial_number || '-'}
                      </td>
                      <td className="quotation-col-make">{item.make || '-'}</td>
                      <td className="quotation-col-range">
                        {resolveQuotationRangeSize({
                          rangeSize: item.range_size,
                          specifications: item.specifications,
                          unit: item.unit,
                        })}
                      </td>
                      <td className="quotation-col-hsn">
                        {item.hsn_sac || '-'}
                      </td>
                      <td className="quotation-col-qty">
                        {item.quantity || 1}
                      </td>

                      <td className="quotation-col-money quotation-money">
                        {formatMoney(item.base_price)}
                      </td>
                      <td className="quotation-col-discount quotation-money">
                        {getDiscountText(
                          item.discount_type,
                          item.discount_value,
                        )}
                      </td>
                      <td className="quotation-col-final quotation-money">
                        {formatMoney(item.final_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="quotation-bottom-grid">
              <div className="quotation-terms-box">
                <p className="quotation-section-title">Terms & Conditions</p>
                {termsToRender.length > 0 ? (
                  <table className="quotation-terms-table">
                    <tbody>
                      {termsToRender.map((term, index) => (
                        <tr key={`${index}-${term}`}>
                          <td className="quotation-terms-sr">{index + 1}</td>
                          <td>{term}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="quotation-empty-note">No terms added.</div>
                )}
              </div>

              <div className="quotation-summary-box">
                <p className="quotation-section-title">Amount Summary</p>
                <table className="quotation-summary-table">
                  <tbody>
                    {summaryRows.map((row) => (
                      <tr
                        key={row.label}
                        className={
                          row.strong ? 'quotation-summary-grand' : undefined
                        }
                      >
                        <td className="quotation-summary-label">{row.label}</td>
                        <td className="quotation-money">
                          {row.value < 0
                            ? `-${formatMoney(Math.abs(row.value))}`
                            : formatMoney(row.value)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="quotation-signatures">
              <div className="quotation-sign-box">
                <p className="quotation-sign-title">For Customer</p>
                <div className="quotation-sign-line" />
              </div>
              <div className="quotation-sign-box">
                <p className="quotation-sign-title">
                  For {data.billing_firm_name || '-'}
                </p>
                <div className="quotation-sign-line" />
                <div className="quotation-sign-caption">
                  Authorized signatory
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{QUOTATION_PRINT_STYLES}</style>
    </div>
  );
};

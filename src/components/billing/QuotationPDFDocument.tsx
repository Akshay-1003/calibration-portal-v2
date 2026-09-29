import React from 'react';
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer';
import type { Quotation } from '../../store/quotationStore';
import {
  formatQuotationPdfMoney,
  resolveQuotationRangeSize,
} from '../../utils/quotationDocumentUtils';

const COLORS = {
  black: '#1F1F1F',
  charcoal: '#3F3F3F',
  darkGray: '#666666',
  mediumGray: '#A6A6A6',
  border: '#B8B8B8',
  lightBorder: '#D7D7D7',
  softBackground: '#F3F3F3',
  veryLightBackground: '#FAFAFA',
  white: '#FFFFFF',
};

const DEFAULT_COMPANY_NAME = 'VIKRAMADITYA METROLOGY CENTER LLP';
const LOGO_SRC =
  typeof window !== 'undefined'
    ? `${window.location.origin}/images/logo/VmcLogo.png`
    : '/images/logo/VmcLogo.png';
const ITEMS_PER_PAGE = 7;

type PartyDetail = {
  label: string;
  value: string;
  emphasis?: boolean;
};

type SummaryRow = {
  label: string;
  value: number;
  strong?: boolean;
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 16,
    paddingBottom: 34,
    paddingHorizontal: 18,
    fontSize: 7.8,
    fontFamily: 'Helvetica',
    color: COLORS.black,
    backgroundColor: COLORS.white,
  },
  pageContent: {
    minHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: COLORS.lightBorder,
    paddingBottom: 6,
    marginBottom: 8,
  },
  brand: {
    width: '45%',
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  logo: {
    width: 145,
    height: 58,
    objectFit: 'contain',
  },
  meta: {
    width: '42%',
    alignItems: 'flex-end',
    marginTop: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2B2B2B',
    textAlign: 'right',
    letterSpacing: 0.4,
    marginBottom: 5,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 2,
  },
  metaLabel: {
    width: '48%',
    fontSize: 8.2,
    fontWeight: 'bold',
    color: COLORS.darkGray,
    textAlign: 'left',
  },
  metaValue: {
    width: '52%',
    fontSize: 8.2,
    color: COLORS.black,
    textAlign: 'right',
  },
  partyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  partyCard: {
    width: '48.7%',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: COLORS.lightBorder,
    backgroundColor: COLORS.white,
  },
  partyTitle: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: COLORS.lightBorder,
    fontSize: 8.2,
    fontWeight: 'bold',
    color: '#333333',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  partyBody: {
    paddingTop: 4,
    paddingBottom: 4,
    paddingHorizontal: 6,
  },
  partyDetail: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 1,
  },
  partyDetailLast: {
    marginBottom: 0,
  },
  partyLabel: {
    width: 42,
    fontSize: 8,
    fontWeight: 'bold',
    color: COLORS.black,
    lineHeight: 1.5,
  },
  partyValue: {
    flexGrow: 1,
    flexShrink: 1,
    width: '74%',
    fontSize: 8,
    color: COLORS.charcoal,
    lineHeight: 1.25,
  },
  partyValueStrong: {
    fontWeight: 'bold',
    color: COLORS.black,
  },
  itemsTable: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: COLORS.lightBorder,
    marginBottom: 8,
  },
  itemsHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.softBackground,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: COLORS.lightBorder,
    minHeight: 25,
  },
  itemRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: COLORS.lightBorder,
    minHeight: 27,
  },
  itemRowAlt: {
    backgroundColor: COLORS.veryLightBackground,
  },
  lastItemRow: {
    borderBottomWidth: 0,
  },
  th: {
    paddingVertical: 3,
    paddingHorizontal: 2,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: COLORS.lightBorder,
    fontSize: 8,
    fontWeight: 'bold',
    color: COLORS.black,
    textAlign: 'center',
    lineHeight: 1.25,
  },
  td: {
    paddingVertical: 3,
    paddingHorizontal: 2,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: COLORS.lightBorder,
    fontSize: 8,
    color: COLORS.black,
    lineHeight: 1.2,
  },
  noRightBorder: {
    borderRightWidth: 0,
  },
  colSr: { width: '4%' },
  colGauge: { width: '20%' },
  colSerial: { width: '9%' },
  colMake: { width: '9%' },
  colRange: { width: '15%' },
  colHsn: { width: '8%' },
  colQty: { width: '5%' },
  colBase: { width: '10%' },
  colDiscount: { width: '8%' },
  colFinal: { width: '12%' },
  textCenter: {
    textAlign: 'center',
  },
  textRight: {
    textAlign: 'right',
  },
  equipmentName: {
    fontWeight: 'bold',
  },
  bottomGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  termsColumn: {
    width: '58%',
  },
  summaryColumn: {
    width: '39%',
  },
  sectionTable: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: COLORS.lightBorder,
    backgroundColor: COLORS.white,
  },
  termsBox: {
    backgroundColor: COLORS.white,
    paddingTop: 1,
  },
  termsTitle: {
    fontSize: 7.8,
    fontWeight: 'bold',
    color: COLORS.black,
    textTransform: 'uppercase',
    letterSpacing: 0.15,
    marginBottom: 4,
  },
  termsList: {
    width: '100%',
  },
  sectionHeader: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: COLORS.softBackground,
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: COLORS.lightBorder,
    fontSize: 7.4,
    fontWeight: 'bold',
    color: COLORS.black,
    textTransform: 'uppercase',
    letterSpacing: 0.15,
  },
  termRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  firstRow: {
    borderTopWidth: 0,
  },
  termIndex: {
    width: 16,
    paddingTop: 1,
    paddingRight: 4,
    textAlign: 'right',
    fontSize: 7.2,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  termText: {
    flexGrow: 1,
    flexShrink: 1,
    width: '92%',
    paddingTop: 1,
    paddingLeft: 2,
    paddingRight: 4,
    fontSize: 7.2,
    lineHeight: 1.18,
    color: COLORS.charcoal,
  },
  emptyText: {
    paddingTop: 1,
    fontSize: 7.2,
    color: COLORS.darkGray,
  },
  summaryRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: COLORS.lightBorder,
    minHeight: 21,
  },
  summaryLabel: {
    width: '62%',
    paddingVertical: 4,
    paddingHorizontal: 5,
    borderRightWidth: 1,
    borderRightStyle: 'solid',
    borderRightColor: COLORS.lightBorder,
    fontSize: 8,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  summaryValue: {
    width: '38%',
    paddingVertical: 4,
    paddingHorizontal: 5,
    fontSize: 8,
    color: COLORS.black,
    textAlign: 'right',
  },
  summaryStrongText: {
    fontWeight: 'bold',
  },
  grandTotalRow: {
    backgroundColor: '#E5E5E5',
  },
  grandTotalLabel: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  grandTotalValue: {
    fontSize: 9.5,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  amountWordsBox: {
    marginTop: 7,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: COLORS.lightBorder,
  },
  amountWordsTitle: {
    fontSize: 7.8,
    fontWeight: 'bold',
    color: COLORS.darkGray,
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.25,
  },
  amountWordsValue: {
    fontSize: 8.2,
    color: COLORS.black,
    lineHeight: 1.4,
  },
  signatures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  signBox: {
    width: '40%',
  },
  signBoxRight: {
    alignItems: 'flex-end',
  },
  signTitle: {
    fontSize: 7.9,
    fontWeight: 'bold',
    color: COLORS.black,
    textTransform: 'uppercase',
    marginBottom: 22,
  },
  signLine: {
    width: '100%',
    borderBottomWidth: 1,
    borderBottomStyle: 'solid',
    borderBottomColor: COLORS.mediumGray,
    marginBottom: 5,
  },
  signCaption: {
    fontSize: 7.8,
    color: COLORS.darkGray,
  },
  footer: {
    position: 'absolute',
    left: 30,
    right: 30,
    bottom: 20,
    borderTopWidth: 1,
    borderTopStyle: 'solid',
    borderTopColor: COLORS.lightBorder,
    paddingTop: 7,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    width: '78%',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  footerItem: {
    marginRight: 12,
    marginBottom: 2,
    fontSize: 7.5,
    color: COLORS.darkGray,
  },
  footerPage: {
    width: '22%',
    fontSize: 7.5,
    color: COLORS.darkGray,
    textAlign: 'right',
  },
});

const formatDate = (date?: string) => {
  if (!date) return '-';

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const addDays = (date: string | undefined, days?: number) => {
  if (
    !date ||
    typeof days !== 'number' ||
    !Number.isFinite(days) ||
    days <= 0
  ) {
    return null;
  }

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  parsed.setDate(parsed.getDate() + days);
  return formatDate(parsed.toISOString());
};

const formatMoney = (value?: number) => `${formatQuotationPdfMoney(value)}`;

const toFiniteNumber = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const getOptionalNumber = (
  record: Record<string, unknown>,
  keys: string[],
): number | null => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
};

const formatRateLabel = (label: string, rate: number | null) =>
  rate !== null && rate > 0 ? `${label} (${Number(rate.toFixed(2))}%)` : label;

const buildPartyDetails = (
  kind: 'from' | 'to',
  data: Quotation,
): PartyDetail[] => [
  {
    label: kind === 'from' ? 'Firm:' : 'Customer:',
    value:
      kind === 'from'
        ? data.billing_firm_name?.trim() || DEFAULT_COMPANY_NAME
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

const numberBelowTwenty = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const tensWords = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

const twoDigitWords = (value: number): string => {
  if (value < 20) {
    return numberBelowTwenty[value];
  }

  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return `${tensWords[tens]}${ones ? ` ${numberBelowTwenty[ones]}` : ''}`;
};

const threeDigitWords = (value: number): string => {
  if (value < 100) {
    return twoDigitWords(value);
  }

  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  return `${numberBelowTwenty[hundreds]} Hundred${
    remainder ? ` ${twoDigitWords(remainder)}` : ''
  }`;
};

const numberToWordsIndian = (value: number): string => {
  if (value <= 0) {
    return 'Zero';
  }

  const units = [
    { value: 10000000, label: 'Crore' },
    { value: 100000, label: 'Lakh' },
    { value: 1000, label: 'Thousand' },
  ];

  let remainder = Math.floor(value);
  const parts: string[] = [];

  for (const unit of units) {
    if (remainder >= unit.value) {
      const quotient = Math.floor(remainder / unit.value);
      parts.push(`${numberToWordsIndian(quotient)} ${unit.label}`);
      remainder %= unit.value;
    }
  }

  if (remainder > 0) {
    parts.push(threeDigitWords(remainder));
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
};

const buildSummaryRows = (data: Quotation): SummaryRow[] => {
  const raw = data as unknown as Record<string, unknown>;
  const subtotal = toFiniteNumber(data.subtotal);
  const totalDiscount = toFiniteNumber(data.total_discount);
  const taxableAmount =
    getOptionalNumber(raw, ['taxable_amount', 'taxableAmount']) ??
    Math.max(0, subtotal - totalDiscount);
  const cgstAmount = getOptionalNumber(raw, ['cgst_amount', 'cgst']);
  const sgstAmount = getOptionalNumber(raw, ['sgst_amount', 'sgst']);
  const igstAmount = getOptionalNumber(raw, ['igst_amount', 'igst']);
  const cgstRate = getOptionalNumber(raw, [
    'cgst_percentage',
    'cgst_rate',
    'cgstRate',
  ]);
  const sgstRate = getOptionalNumber(raw, [
    'sgst_percentage',
    'sgst_rate',
    'sgstRate',
  ]);
  const igstRate = getOptionalNumber(raw, [
    'igst_percentage',
    'igst_rate',
    'igstRate',
  ]);
  const grandTotal = toFiniteNumber(data.grand_total);
  const derivedRoundOff =
    grandTotal -
    (taxableAmount + (cgstAmount ?? 0) + (sgstAmount ?? 0) + (igstAmount ?? 0));
  const roundOff =
    getOptionalNumber(raw, ['round_off', 'roundOff']) ??
    (Math.abs(derivedRoundOff) >= 0.005
      ? Number(derivedRoundOff.toFixed(2))
      : 0);

  const rows: SummaryRow[] = [{ label: 'Subtotal', value: subtotal }];

  if (totalDiscount > 0) {
    rows.push({ label: 'Total Discount', value: -totalDiscount });
  }

  if (totalDiscount > 0 || cgstAmount || sgstAmount || igstAmount) {
    rows.push({ label: 'Taxable Amount', value: taxableAmount });
  }

  if (cgstAmount && cgstAmount > 0) {
    rows.push({
      label: formatRateLabel('CGST', cgstRate),
      value: cgstAmount,
    });
  }

  if (sgstAmount && sgstAmount > 0) {
    rows.push({
      label: formatRateLabel('SGST', sgstRate),
      value: sgstAmount,
    });
  }

  if (igstAmount && igstAmount > 0) {
    rows.push({
      label: formatRateLabel('IGST', igstRate),
      value: igstAmount,
    });
  }

  if (Math.abs(roundOff) >= 0.005) {
    rows.push({ label: 'Round Off', value: roundOff });
  }

  rows.push({ label: 'Grand Total', value: grandTotal, strong: true });
  return rows;
};

export const QuotationPDFDocument: React.FC<{ data: Quotation }> = ({
  data,
}) => {
  const senderDetails = buildPartyDetails('from', data);
  const customerDetails = buildPartyDetails('to', data);
  const terms = (data.terms_conditions || []).filter(
    (term, index, array): term is string => {
      if (!term || !term.trim()) return false;
      return array.findIndex((item) => item?.trim() === term.trim()) === index;
    },
  );
  const totalPages = Math.max(Math.ceil(data.items.length / ITEMS_PER_PAGE), 1);
  const validUntil = addDays(data.quotation_date, data.validity_days);
  const summaryRows = buildSummaryRows(data);
  const amountInWords = `Rupees ${numberToWordsIndian(
    Math.round(toFiniteNumber(data.grand_total)),
  )} Only`;
  const companyName = data.billing_firm_name?.trim() || DEFAULT_COMPANY_NAME;

  return (
    <Document
      title={`Quotation ${data.quotation_number || ''}`.trim()}
      author={data.billing_firm_name || 'MetrologyDesk'}
      subject={`Quotation ${data.quotation_number || ''}`.trim()}
      creator="MetrologyDesk"
      producer="MetrologyDesk"
    >
      {Array.from({ length: totalPages }, (_, pageIndex) => {
        const startIndex = pageIndex * ITEMS_PER_PAGE;
        const endIndex = Math.min(
          startIndex + ITEMS_PER_PAGE,
          data.items.length,
        );
        const pageItems = data.items.slice(startIndex, endIndex);
        const isLastPage = pageIndex === totalPages - 1;

        return (
          <Page
            key={`quotation-page-${pageIndex + 1}`}
            size="A4"
            style={styles.page}
          >
            <View style={styles.pageContent}>
              <View style={styles.header}>
                <View style={styles.brand}>
                  <Image src={LOGO_SRC} style={styles.logo} />
                </View>

                <View style={styles.meta}>
                  <Text style={styles.title}>QUOTATION</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Quotation No.</Text>
                    <Text style={styles.metaValue}>
                      {data.quotation_number || '-'}
                    </Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Date</Text>
                    <Text style={styles.metaValue}>
                      {formatDate(data.quotation_date)}
                    </Text>
                  </View>
                  {validUntil ? (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Valid Until</Text>
                      <Text style={styles.metaValue}>{validUntil}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {pageIndex === 0 ? (
                <View style={styles.partyGrid}>
                  <View style={styles.partyCard}>
                    <Text style={styles.partyTitle}>Quotation From</Text>
                    <View style={styles.partyBody}>
                      {senderDetails.map((detail, index) => (
                        <View
                          key={`from-${detail.label}`}
                          style={[
                            styles.partyDetail,
                            index === senderDetails.length - 1
                              ? styles.partyDetailLast
                              : undefined,
                          ]}
                        >
                          <Text style={styles.partyLabel}>{detail.label}</Text>
                          <Text
                            style={[
                              styles.partyValue,
                              detail.emphasis ? styles.partyValueStrong : undefined,
                            ]}
                          >
                            {detail.value}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={styles.partyCard}>
                    <Text style={styles.partyTitle}>Quotation To</Text>
                    <View style={styles.partyBody}>
                      {customerDetails.map((detail, index) => (
                        <View
                          key={`to-${detail.label}`}
                          style={[
                            styles.partyDetail,
                            index === customerDetails.length - 1
                              ? styles.partyDetailLast
                              : undefined,
                          ]}
                        >
                          <Text style={styles.partyLabel}>{detail.label}</Text>
                          <Text
                            style={[
                              styles.partyValue,
                              detail.emphasis ? styles.partyValueStrong : undefined,
                            ]}
                          >
                            {detail.value}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              ) : null}

              <View style={styles.itemsTable}>
                <View style={styles.itemsHeader}>
                  <Text style={[styles.th, styles.colSr]}>Sr. No.</Text>
                  <Text style={[styles.th, styles.colGauge]}>
                    Equipment Name
                  </Text>
                  <Text style={[styles.th, styles.colSerial]}>Serial No.</Text>
                  <Text style={[styles.th, styles.colMake]}>Make</Text>
                  <Text style={[styles.th, styles.colRange]}>
                    Specifications
                  </Text>
                  <Text style={[styles.th, styles.colHsn]}>HSN/SAC</Text>
                  <Text style={[styles.th, styles.colQty]}>Qty</Text>
                  <Text style={[styles.th, styles.colBase]}>Unit Price</Text>
                  <Text style={[styles.th, styles.colDiscount]}>Discount</Text>
                  <Text
                    style={[styles.th, styles.colFinal, styles.noRightBorder]}
                  >
                    Total Amount
                  </Text>
                </View>

                {pageItems.map((item, index) => (
                  <View
                    key={item.id}
                    style={[
                      styles.itemRow,
                      (startIndex + index) % 2 === 1 ? styles.itemRowAlt : undefined,
                      index === pageItems.length - 1
                        ? styles.lastItemRow
                        : undefined,
                    ]}
                  >
                    <Text style={[styles.td, styles.colSr, styles.textCenter]}>
                      {startIndex + index + 1}
                    </Text>
                    <Text
                      style={[styles.td, styles.colGauge, styles.equipmentName]}
                    >
                      {item.gauge_name || '-'}
                    </Text>
                    <Text
                      style={[styles.td, styles.colSerial, styles.textCenter]}
                    >
                      {item.serial_number || '-'}
                    </Text>
                    <Text
                      style={[styles.td, styles.colMake, styles.textCenter]}
                    >
                      {item.make || '-'}
                    </Text>
                    <Text
                      style={[styles.td, styles.colRange, styles.textCenter]}
                    >
                      {resolveQuotationRangeSize({
                        rangeSize: item.range_size,
                        specifications: item.specifications,
                        unit: item.unit,
                      })}
                    </Text>
                    <Text style={[styles.td, styles.colHsn, styles.textCenter]}>
                      {item.hsn_sac || '-'}
                    </Text>
                    <Text style={[styles.td, styles.colQty, styles.textCenter]}>
                      {item.quantity || 1}
                    </Text>
                    <Text style={[styles.td, styles.colBase, styles.textRight]}>
                      {formatMoney(item.base_price)}
                    </Text>
                    <Text
                      style={[styles.td, styles.colDiscount, styles.textRight]}
                    >
                      {getDiscountText(item.discount_type, item.discount_value)}
                    </Text>
                    <Text
                      style={[
                        styles.td,
                        styles.colFinal,
                        styles.textRight,
                        styles.noRightBorder,
                      ]}
                    >
                      {formatMoney(item.final_price)}
                    </Text>
                  </View>
                ))}
              </View>

              {isLastPage ? (
                <>
                  <View style={styles.bottomGrid}>
                    <View style={styles.termsColumn}>
                      <View style={styles.termsBox}>
                        <Text style={styles.termsTitle}>
                          Terms & Conditions
                        </Text>
                        {terms.length > 0 ? (
                          <View style={styles.termsList}>
                            {terms.map((term, index) => (
                              <View
                                key={`term-${index + 1}`}
                                style={styles.termRow}
                              >
                                <Text style={styles.termIndex}>
                                  {index + 1}.
                                </Text>
                                <Text style={styles.termText}>{term}</Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <Text style={styles.emptyText}>No terms added.</Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.summaryColumn}>
                      <View style={styles.sectionTable}>
                        {summaryRows.map((row, index) => (
                          <View
                            key={row.label}
                            style={[
                              styles.summaryRow,
                              index === 0 ? styles.firstRow : undefined,
                              row.strong ? styles.grandTotalRow : undefined,
                            ]}
                          >
                            <Text
                              style={[
                                styles.summaryLabel,
                                row.strong ? styles.grandTotalLabel : undefined,
                              ]}
                            >
                              {row.label}
                            </Text>
                            <Text
                              style={[
                                styles.summaryValue,
                                row.strong
                                  ? styles.grandTotalValue
                                  : styles.summaryStrongText,
                              ]}
                            >
                              {row.value < 0
                                ? `- ${formatMoney(Math.abs(row.value))}`
                                : formatMoney(row.value)}
                            </Text>
                          </View>
                        ))}
                      </View>

                      <View style={styles.amountWordsBox}>
                        <Text style={styles.amountWordsTitle}>
                          Amount in Words
                        </Text>
                        <Text style={styles.amountWordsValue}>
                          {amountInWords}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.signatures}>
                    <View style={styles.signBox}>
                      <Text style={styles.signTitle}>For Customer</Text>
                      <View style={styles.signLine} />
                    </View>

                    <View style={[styles.signBox, styles.signBoxRight]}>
                      <Text style={styles.signTitle}>For {companyName}</Text>
                      <View style={styles.signLine} />
                      <Text style={styles.signCaption}>
                        Authorized Signatory
                      </Text>
                    </View>
                  </View>
                </>
              ) : null}
            </View>
          </Page>
        );
      })}
    </Document>
  );
};

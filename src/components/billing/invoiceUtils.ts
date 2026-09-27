import { InvoiceData, InvoiceItem } from './InvoiceTemplate';
import { OutwardGaugeItem } from '../../store/outwardStore';
import { Invoice } from '../../types/types';
import type { AccountDetail } from '../../types/accountDetails';
import {
  calculateInvoiceTotalsFromPercentage,
  calculateInvoiceTotalsFromAmount,
  calculateLineAmount,
  calculateSubtotal,
  deriveDiscountPercentFromAmount,
  roundCurrency,
} from '../../utils/invoiceCalculations';
import { normalizeInvoicePdfColumns } from '../../utils/invoicePdfColumns';
import { preparePdfTableData } from '../../utils/pdfTableData';
import { formatSpecificationForPrint } from '../../utils/specificationPrintFormatter';
import { getCurrentIsoDate, getIsoDatePart } from '../../utils/dateAdapter';

const DEFAULT_COMPANY_INFO = {
  company_name: '',
  office_address: '',
  work_address: '',
  company_email: '',
  company_logo: '',
};

const DEFAULT_BANK_DETAILS = {
  bank_name: '',
  account_number: '',
  ifsc: '',
  gstin: '',
  pan_no: '',
};

// Default HSN code
const DEFAULT_HSN = '998346';

// Default GST rates
const DEFAULT_SGST_RATE = 9;
const DEFAULT_CGST_RATE = 9;
type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const toRecord = (value: unknown): UnknownRecord => (isRecord(value) ? value : {});

const hasText = (value: unknown): boolean =>
  value !== null && value !== undefined && String(value).trim().length > 0;

const toText = (value: unknown, fallback = ''): string =>
  hasText(value) ? String(value).trim() : fallback;

const firstText = (values: unknown[], fallback = ''): string => {
  for (const value of values) {
    if (hasText(value)) {
      return String(value).trim();
    }
  }

  return fallback;
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const formatLocalIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (dateString: unknown) => {
  if (!dateString) return getCurrentIsoDate();
  const rawDate = String(dateString).trim();
  const isoDate = getIsoDatePart(rawDate);
  if (isoDate) return isoDate;

  try {
    const date = new Date(rawDate);
    return Number.isNaN(date.getTime()) ? rawDate : formatLocalIsoDate(date);
  } catch {
    return rawDate;
  }
};

const resolveBillingDate = (
  invoiceRecord: UnknownRecord,
  fallback = getCurrentIsoDate(),
) =>
  formatDate(
    firstText(
      [invoiceRecord.billing_date, invoiceRecord.date_of_issue, invoiceRecord.invoice_date],
      fallback,
    ),
  );

const getInvoiceOutwardNumbers = (invoice: UnknownRecord): string => {
  const outwardNumbers = Array.isArray(invoice.outward_nos)
    ? invoice.outward_nos.map((outwardNo) => toText(outwardNo)).filter(Boolean)
    : [];

  return outwardNumbers.length > 0
    ? outwardNumbers.join(', ')
    : firstText([invoice.outward_no], 'N/A');
};

const buildAddress = (address: unknown): string => {
  if (typeof address === 'string') {
    return toText(address, '-');
  }

  const addressRecord = toRecord(address);
  const parts = [
    addressRecord.address_line_1,
    addressRecord.address_line_2,
    addressRecord.city,
    addressRecord.state,
    addressRecord.zip_code,
    addressRecord.country,
  ]
    .map((part) => toText(part))
    .filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : '-';
};

const buildBankName = (bankDetails?: AccountDetail['bank_details']): string => {
  const bankName = toText(bankDetails?.bank_name);
  const branch = toText(bankDetails?.branch);

  if (!bankName) return '';
  if (!branch || bankName.toLowerCase().includes('branch')) return bankName;
  return `${bankName}, Branch - ${branch}`;
};

const resolveBillingFirmDetails = (
  invoice: Pick<Invoice, 'billing_firm_name'> | UnknownRecord | null | undefined,
  billingFirm?: AccountDetail | null,
) => {
  const invoiceRecord = toRecord(invoice);
  const contactNo = toText(billingFirm?.contact_no);

  return {
    company_name: firstText([billingFirm?.firm_name, invoiceRecord.billing_firm_name], '-'),
    office_address: toText(billingFirm?.address),
    work_address: contactNo ? `Contact: ${contactNo}` : '',
    company_email: toText(billingFirm?.email),
    company_logo: toText(billingFirm?.logo),
    bank_name: buildBankName(billingFirm?.bank_details),
    account_number: toText(billingFirm?.bank_details?.account_no),
    ifsc: toText(billingFirm?.bank_details?.ifsc),
    gstin: toText(billingFirm?.gst_no),
    pan_no: toText(billingFirm?.pan_no),
  };
};

/**
 * Generate invoice number
 */
const generateInvoiceNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear();
  const shortYear = year.toString().slice(-2);
  const nextYear = (year + 1).toString().slice(-2);
  // Format: YY-NNYY/XXXX (e.g., 25-26/0119)
  const sequence = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `${shortYear}-${nextYear}/${sequence}`;
};

/**
 * Transform invoice items data to invoice data for PDF
 */
export interface InvoiceItemData {
  gaugeItem: OutwardGaugeItem;
  hsnEntries: Array<{
    id: string;
    hsnCode: string;
    hsnName: string;
    rate: string;
    quantity: number;
  }>;
}

const getProcessHsn = (process?: string): string => {
  switch ((process || '').toLowerCase()) {
    case 'repair':
      return '998347';
    case 'inspection':
      return '998348';
    case 'verification':
      return '998349';
    case 'calibration':
    default:
      return DEFAULT_HSN;
  }
};

const isCalibrationComponent = (component: { process?: string }) =>
  (component.process || '').toLowerCase() === 'calibration';

const getCalibrationGrossSubtotal = (
  billingItems: Array<{ billing_components: Array<{ process?: string; rate?: number; quantity?: number; amount?: number }> }>,
) => roundCurrency(
  billingItems.reduce(
    (sum, item) => sum + item.billing_components.reduce(
      (componentSum, component) => isCalibrationComponent(component)
        ? componentSum + (component.amount || calculateLineAmount(component.rate || 0, component.quantity || 1))
        : componentSum,
      0,
    ),
    0,
  ),
);

const prepareInvoiceItemsForPdf = (items: InvoiceItem[]): InvoiceItem[] =>
  preparePdfTableData(items, {
    sortBy: ['gauge_name', 'identification_number', 'specification'],
    serialField: 'sr_no',
  });

/**
 * Transform Invoice API response to InvoiceData for PDF preview
 */
export const transformInvoiceToInvoiceData = (
  invoice: Invoice,
  billingFirm?: AccountDetail | null,
): InvoiceData => {
  const invoiceRecord = invoice as unknown as UnknownRecord;
  const firmDetails = resolveBillingFirmDetails(invoice, billingFirm);

  // Transform billing items to invoice items
  const invoiceItems: InvoiceItem[] = [];
  let srNo = 1;

  invoice.invoice_details.billing_items.forEach((billingItem) => {
    const billingItemRecord = billingItem as unknown as UnknownRecord;

    billingItem.billing_components.forEach((component, componentIndex) => {
      const rate = component.rate || 0;
      const qty = component.quantity || 1;
      const grossAmount = roundCurrency(component.amount || calculateLineAmount(rate, qty));
      const discountAmount = roundCurrency((component as any).discount_amount || 0);
      const amount = roundCurrency((component as any).net_amount ?? grossAmount - discountAmount);

      const formattedSpec = formatSpecificationForPrint(
        billingItem.specifications,
        firstText([billingItemRecord.unit], 'mm'),
      );

      // Determine repair_new and calibration_charge based on process
      const isRepair = component.process?.toLowerCase() === 'repair';
      const repairNew = isRepair ? rate : 0.0;
      const calibrationCharge = !isRepair ? rate : 0.0;

      const serviceDescription = (component as any).description || (isRepair ? 'Repair / Servicing' : 'Calibration');
      const isServiceChild = componentIndex > 0;
      const groupKey = `${billingItem.inward_id || ''}|${billingItem.gauge_id || ''}|${billingItem.master_gauge_name || ''}|${billingItem.identification_number || ''}|${formattedSpec}`;
      invoiceItems.push({
        sr_no: srNo++,
        gauge_name: isServiceChild
          ? `  ${serviceDescription}`
          : `${billingItem.master_gauge_name || '-'}\n${serviceDescription}`,
        identification_number: isServiceChild ? '' : billingItem.identification_number || '-',
        dc_no: firstText([billingItemRecord.client_dc_no, billingItemRecord.dc_no], '-'),
        specification: formattedSpec,
        hsn: (component as any).hsn_sac || getProcessHsn(component.process),
        repair_new: repairNew,
        calibration_charge: calibrationCharge,
        qty: qty,
        amount: amount,
        discount_amount: discountAmount,
        service_description: serviceDescription,
        is_service_child: isServiceChild,
        instrument_quantity: billingItem.instrument_quantity || 1,
        group_key: groupKey,
      });
    });
  });

  const pdfItems = prepareInvoiceItemsForPdf(invoiceItems);

  // Get invoice details
  const invoiceDetails = invoice.invoice_details;
  const lineMode = invoiceDetails.discount_mode === 'line';
  const grossSubtotal = roundCurrency(
    invoiceItems.reduce((sum, item) => sum + item.amount + (item.discount_amount || 0), 0),
  );
  const lineDiscount = roundCurrency(invoiceItems.reduce((sum, item) => sum + (item.discount_amount || 0), 0));
  const total = lineMode ? grossSubtotal : roundCurrency(invoiceDetails.sub_total || 0);
  const calibrationGrossSubtotal = getCalibrationGrossSubtotal(invoiceDetails.billing_items);
  const legacyDiscountPercent = deriveDiscountPercentFromAmount(
    total,
    invoiceDetails.discount || 0,
  );
  const totalQty = invoiceDetails.billing_items.reduce(
    (sum, item) => sum + (item.instrument_quantity || 1),
    0,
  );
  const packingForwardingCharges = roundCurrency(invoiceDetails.packing || 0.0);
  const courierTransportCharges = roundCurrency(invoiceDetails.courier || 0.0);
  const totals = lineMode
    ? calculateInvoiceTotalsFromAmount({
        subtotal: total,
        discountAmount: lineDiscount,
        packing: packingForwardingCharges,
        courier: courierTransportCharges,
        cgstAmount: invoiceDetails.cgst ?? undefined,
        sgstAmount: invoiceDetails.sgst ?? undefined,
      })
    : calculateInvoiceTotalsFromPercentage({
        subtotal: total,
        discountBase: calibrationGrossSubtotal || total,
        discountPercent: legacyDiscountPercent,
        packing: packingForwardingCharges,
        courier: courierTransportCharges,
        cgstRate: DEFAULT_CGST_RATE,
        sgstRate: DEFAULT_SGST_RATE,
      });
  const discountAmount = totals.discountAmount;
  const discountPercentage = lineMode ? deriveDiscountPercentFromAmount(total, discountAmount) : legacyDiscountPercent;
  const taxableAmount = totals.taxableAmount;
  const netAmount = taxableAmount;
  const sgstAmount = totals.sgstAmount;
  const cgstAmount = totals.cgstAmount;
  const grandTotal = roundCurrency(invoiceDetails.grand_total || totals.finalAmount);
  const roundedOffTotal = Math.round(grandTotal);

  const clientAddress = buildAddress(invoice.client_details?.address);

  // Calculate GST rates from amounts
  const sgstRate = totals.sgstRate || DEFAULT_SGST_RATE;
  const cgstRate = totals.cgstRate || DEFAULT_CGST_RATE;

  return {
    // Company Information
    company_name: firmDetails.company_name,
    office_address: firmDetails.office_address,
    work_address: firmDetails.work_address,
    company_email: firmDetails.company_email,
    company_logo: firmDetails.company_logo,

    // Invoice Information
    invoice_number: invoice.invoice_number,
    billing_date: resolveBillingDate(invoiceRecord),
    outward_no: getInvoiceOutwardNumbers(invoiceRecord),
    order_number: invoice.order_number ?? undefined,
    order_date: invoice.order_date ?? undefined,

    // Client Information
    client_name: invoice.client_details?.name || 'N/A',
    client_address: clientAddress,
    client_gst_no: invoice.client_details?.client_gst_no || undefined,

    // Items
    items: pdfItems,

    // Summary
    total: total,
    total_qty: totalQty,
    packing_forwarding_charges: packingForwardingCharges,
    courier_transport_charges: courierTransportCharges,
    discount_amount: discountAmount,
    discount_percentage: discountPercentage,
    discount_mode: lineMode ? 'line' : 'invoice',
    net_amount: netAmount,
    taxable_amount: taxableAmount,
    sgst_percentage: sgstRate,
    sgst_amount: sgstAmount,
    cgst_percentage: cgstRate,
    cgst_amount: cgstAmount,
    grand_total: grandTotal,
    rounded_off_total: roundedOffTotal,

    // Bank Details
    bank_name: firmDetails.bank_name,
    account_number: firmDetails.account_number,
    ifsc: firmDetails.ifsc,
    gstin: firmDetails.gstin,
    pan_no: firmDetails.pan_no,
    pdf_columns: normalizeInvoicePdfColumns(invoiceDetails.pdf_columns, pdfItems, {
      autoEnableServiceColumns: false,
      preferModernServiceColumns: invoiceDetails.pdf_columns_user_configured === false && !invoiceDetails.pdf_columns,
    }),
    pdf_columns_user_configured: invoiceDetails.pdf_columns_user_configured,
  };
};

export const transformInvoiceItemsToInvoiceData = (
  invoiceItemsData: InvoiceItemData[],
  savedInvoice?: unknown,
  cgstRate: number = DEFAULT_CGST_RATE,
  sgstRate: number = DEFAULT_SGST_RATE,
  billingFirm?: AccountDetail | null,
): InvoiceData => {
  const savedInvoiceRecord = toRecord(savedInvoice);
  const firmDetails = resolveBillingFirmDetails(savedInvoiceRecord, billingFirm);

  // Transform items to invoice items
  const invoiceItems: InvoiceItem[] = [];
  let srNo = 1;

  invoiceItemsData.forEach((itemData) => {
    const gaugeRecord = itemData.gaugeItem as unknown as UnknownRecord;

    itemData.hsnEntries.forEach((hsnEntry, componentIndex) => {
      const rate = parseFloat(hsnEntry.rate) || 0;
      const qty = hsnEntry.quantity || 1;
      const grossAmount = calculateLineAmount(rate, qty);
      const discountValue = Number(hsnEntry.discountValue || 0);
      const discountAmount = hsnEntry.discountType === 'percentage'
        ? roundCurrency((grossAmount * discountValue) / 100)
        : hsnEntry.discountType === 'flat' ? Math.min(grossAmount, discountValue) : 0;
      const amount = roundCurrency(grossAmount - discountAmount);

      // Get specification
      const specification =
        gaugeRecord.specification ||
        gaugeRecord.gauge_specification ||
        gaugeRecord.specifications ||
        gaugeRecord.gauge_spec ||
        '-';

      const formattedSpec = formatSpecificationForPrint(
        specification,
        firstText([gaugeRecord.unit], 'mm'),
      );

      // Get DC No
      const dcNo = firstText([gaugeRecord.client_dc_no, gaugeRecord.dc_no], '-');

      // Determine repair_new and calibration_charge based on HSN
      const isRepair = hsnEntry.hsnCode === '998347' || hsnEntry.hsnName.toLowerCase().includes('repair');
      const repairNew = isRepair ? rate : 0.0;
      const calibrationCharge = !isRepair ? rate : 0.0;
      const serviceDescription = hsnEntry.description || (isRepair ? 'Repair / Servicing' : 'Calibration');
      const isServiceChild = componentIndex > 0;
      const groupKey = `${firstText([gaugeRecord.id, gaugeRecord.gauge_id], '')}|${firstText([itemData.gaugeItem.master_gauge_name, gaugeRecord.gauge_name], '')}|${itemData.gaugeItem.identification_number || ''}|${formattedSpec}`;

      invoiceItems.push({
        sr_no: srNo++,
        gauge_name: isServiceChild
          ? `  ${serviceDescription}`
          : `${firstText([itemData.gaugeItem.master_gauge_name, gaugeRecord.gauge_name], '-')}\n${serviceDescription}`,
        identification_number: isServiceChild ? '' : itemData.gaugeItem.identification_number || itemData.gaugeItem.manf_serial_number || '-',
        dc_no: isServiceChild ? '' : dcNo,
        specification: isServiceChild ? '' : formattedSpec,
        hsn: hsnEntry.hsnCode,
        repair_new: repairNew,
        calibration_charge: calibrationCharge,
        qty: qty,
        amount: amount,
        discount_amount: discountAmount,
        service_description: serviceDescription,
        is_service_child: isServiceChild,
        instrument_quantity: itemData.gaugeItem.instrument_quantity || 1,
        group_key: groupKey,
      });
    });
  });

  const pdfItems = prepareInvoiceItemsForPdf(invoiceItems);

  // Calculate totals - use saved invoice totals if available, otherwise calculate
  const savedDetails = toRecord(savedInvoiceRecord.invoice_details);
  const hasSavedSubtotal = savedDetails.sub_total !== null && savedDetails.sub_total !== undefined;
  const lineMode = savedDetails.discount_mode === 'line';
  const grossSubtotal = roundCurrency(
    pdfItems.reduce((sum, item) => sum + item.amount + (item.discount_amount || 0), 0),
  );
  const lineDiscount = roundCurrency(pdfItems.reduce((sum, item) => sum + (item.discount_amount || 0), 0));
  const total = lineMode ? grossSubtotal : roundCurrency(
    hasSavedSubtotal
      ? toNumber(savedDetails.sub_total)
      : calculateSubtotal(
          pdfItems.map((item) => ({
            rate: item.amount,
            quantity: 1,
          })),
        ),
  );
  const totalQty = (savedDetails.billing_items as Array<{ instrument_quantity?: number }> | undefined)?.reduce(
    (sum, item) => sum + (item.instrument_quantity || 1),
    0,
  ) || pdfItems.filter((item) => !item.is_service_child).reduce((sum, item) => sum + (item.instrument_quantity || 1), 0);
  const packingForwardingCharges = roundCurrency(toNumber(savedDetails.packing, 0.0));
  const courierTransportCharges = roundCurrency(toNumber(savedDetails.courier, 0.0));
  const calibrationGrossSubtotal = roundCurrency(
    pdfItems.reduce(
      (sum, item) => item.service_description?.toLowerCase() === 'calibration'
        ? sum + item.amount + (item.discount_amount || 0)
        : sum,
      0,
    ),
  );
  const legacyDiscountPercent = deriveDiscountPercentFromAmount(
    total,
    toNumber(savedDetails.discount, 0),
  );
  const totals = lineMode
    ? calculateInvoiceTotalsFromAmount({
        subtotal: total,
        discountAmount: lineDiscount,
        packing: packingForwardingCharges,
        courier: courierTransportCharges,
        cgstAmount: savedDetails.cgst === undefined ? undefined : toNumber(savedDetails.cgst),
        sgstAmount: savedDetails.sgst === undefined ? undefined : toNumber(savedDetails.sgst),
        cgstRate,
        sgstRate,
      })
    : calculateInvoiceTotalsFromPercentage({
        subtotal: total,
        discountBase: calibrationGrossSubtotal || total,
        discountPercent: legacyDiscountPercent,
        packing: packingForwardingCharges,
        courier: courierTransportCharges,
        cgstRate,
        sgstRate,
      });
  const discountAmount = totals.discountAmount;
  const discountPercentage = lineMode ? deriveDiscountPercentFromAmount(total, discountAmount) : legacyDiscountPercent;
  const taxableAmount = totals.taxableAmount;
  const netAmount = taxableAmount;
  const sgstAmount = totals.sgstAmount;
  const cgstAmount = totals.cgstAmount;
  const grandTotal = roundCurrency(
    savedDetails.grand_total === undefined ? totals.finalAmount : toNumber(savedDetails.grand_total),
  );
  const roundedOffTotal = Math.round(grandTotal);

  const clientDetails = toRecord(savedInvoiceRecord.client_details);
  const clientAddress = buildAddress(clientDetails.address);

  // Use saved invoice number if available, otherwise generate
  const invoiceNumber = firstText(
    [savedInvoiceRecord.invoice_number, savedInvoiceRecord.invoice_no],
    generateInvoiceNumber(),
  );
  const billingDate = resolveBillingDate(savedInvoiceRecord);

  return {
    // Company Information
    company_name: firmDetails.company_name,
    office_address: firmDetails.office_address,
    work_address: firmDetails.work_address,
    company_email: firmDetails.company_email,
    company_logo: firmDetails.company_logo,

    // Invoice Information
    invoice_number: invoiceNumber,
    billing_date: billingDate,
    outward_no: getInvoiceOutwardNumbers(savedInvoiceRecord),
    order_number: firstText([savedInvoiceRecord.order_number]) || undefined,
    order_date: firstText([savedInvoiceRecord.order_date]) || undefined,

    // Client Information
    client_name: firstText([clientDetails.name], 'N/A'),
    client_address: clientAddress,
    client_gst_no: firstText([clientDetails.client_gst_no]) || undefined,

    // Items
    items: pdfItems,

    // Summary
    total: total,
    total_qty: totalQty,
    packing_forwarding_charges: packingForwardingCharges,
    courier_transport_charges: courierTransportCharges,
    discount_amount: discountAmount,
    discount_percentage: discountPercentage,
    discount_mode: lineMode ? 'line' : 'invoice',
    net_amount: netAmount,
    taxable_amount: taxableAmount,
    sgst_percentage: totals.sgstRate,
    sgst_amount: sgstAmount,
    cgst_percentage: totals.cgstRate,
    cgst_amount: cgstAmount,
    grand_total: grandTotal,
    rounded_off_total: roundedOffTotal,

    // Bank Details
    bank_name: firmDetails.bank_name,
    account_number: firmDetails.account_number,
    ifsc: firmDetails.ifsc,
    gstin: firmDetails.gstin,
    pan_no: firmDetails.pan_no,
    pdf_columns: normalizeInvoicePdfColumns(toRecord(savedDetails.pdf_columns), pdfItems, {
      autoEnableServiceColumns: false,
      preferModernServiceColumns: savedDetails.pdf_columns_user_configured === false && !savedDetails.pdf_columns,
    }),
    pdf_columns_user_configured: Boolean(savedDetails.pdf_columns_user_configured),
  };
};

/**
 * Transform outward items to invoice data (legacy function for backward compatibility)
 */
export const transformOutwardToInvoiceData = (
  outwardEntry: unknown,
  selectedItems: OutwardGaugeItem[],
  companyInfo?: Partial<typeof DEFAULT_COMPANY_INFO>,
  bankDetails?: Partial<typeof DEFAULT_BANK_DETAILS>
): InvoiceData => {
  const company = { ...DEFAULT_COMPANY_INFO, ...companyInfo };
  const bank = { ...DEFAULT_BANK_DETAILS, ...bankDetails };
  const outwardRecord = toRecord(outwardEntry);

  // Transform items to invoice items
  const invoiceItems: InvoiceItem[] = selectedItems.map((item, index) => {
    const itemRecord = item as unknown as UnknownRecord;

    // Get specification
    const specification =
      itemRecord.specification ||
      itemRecord.gauge_specification ||
      itemRecord.specifications ||
      itemRecord.gauge_spec ||
      '-';

    const formattedSpec = formatSpecificationForPrint(
      specification,
      firstText([itemRecord.unit], 'mm'),
    );

    // Get DC No
    const dcNo = firstText([itemRecord.client_dc_no, itemRecord.dc_no], '-');

    // Get calibration charge (default to 0 if not available)
    // In real scenario, this should come from rate card or pricing data
    const calibrationCharge = toNumber(itemRecord.calibration_charge || itemRecord.price, 0);
    const qty = toNumber(itemRecord.qty, 1);
    const amount = calibrationCharge * qty;

    return {
      sr_no: index + 1,
      gauge_name: firstText([item.master_gauge_name, itemRecord.gauge_name], '-'),
      identification_number: item.identification_number || item.manf_serial_number || '-',
      dc_no: dcNo,
      specification: formattedSpec,
      hsn: DEFAULT_HSN,
      repair_new: 0.0,
      calibration_charge: calibrationCharge,
      qty: qty,
      amount: amount,
    };
  });

  const pdfItems = prepareInvoiceItemsForPdf(invoiceItems);

  // Calculate totals
  const total = pdfItems.reduce((sum, item) => sum + item.amount, 0);
  const totalQty = pdfItems.reduce((sum, item) => sum + item.qty, 0);
  const packingForwardingCharges = 0.0;
  const courierTransportCharges = 0.0;
  const totals = calculateInvoiceTotalsFromAmount({
    subtotal: roundCurrency(total),
    discountAmount: 0,
    packing: packingForwardingCharges,
    courier: courierTransportCharges,
    cgstRate: DEFAULT_CGST_RATE,
    sgstRate: DEFAULT_SGST_RATE,
  });
  const discountAmount = totals.discountAmount;
  const discountPercentage = deriveDiscountPercentFromAmount(total, discountAmount);
  const taxableAmount = totals.taxableAmount;
  const netAmount = taxableAmount;
  const sgstAmount = totals.sgstAmount;
  const cgstAmount = totals.cgstAmount;
  const grandTotal = totals.finalAmount;
  const roundedOffTotal = Math.round(grandTotal);

  // Get client address
  const clientAddress = buildAddress(outwardRecord.address);

  return {
    // Company Information
    company_name: company.company_name,
    office_address: company.office_address,
    work_address: company.work_address,
    company_email: company.company_email,
    company_logo: company.company_logo,

    // Invoice Information
    invoice_number: generateInvoiceNumber(),
    billing_date: getCurrentIsoDate(),
    outward_no: firstText([outwardRecord.outward_no, outwardRecord.id], 'N/A'),
    order_number: undefined,
    order_date: undefined,

    // Client Information
    client_name: firstText([outwardRecord.client_org], 'N/A'),
    client_address: clientAddress,
    client_gst_no: firstText([outwardRecord.client_gst_no]) || undefined,

    // Items
    items: pdfItems,

    // Summary
    total: total,
    total_qty: totalQty,
    packing_forwarding_charges: packingForwardingCharges,
    courier_transport_charges: courierTransportCharges,
    discount_amount: discountAmount,
    discount_percentage: discountPercentage,
    net_amount: netAmount,
    taxable_amount: taxableAmount,
    sgst_percentage: totals.sgstRate,
    sgst_amount: sgstAmount,
    cgst_percentage: totals.cgstRate,
    cgst_amount: cgstAmount,
    grand_total: grandTotal,
    rounded_off_total: roundedOffTotal,

    // Bank Details
    bank_name: bank.bank_name,
    account_number: bank.account_number,
    ifsc: bank.ifsc,
    gstin: bank.gstin,
    pan_no: bank.pan_no,
    pdf_columns: normalizeInvoicePdfColumns(undefined, pdfItems),
  };
};

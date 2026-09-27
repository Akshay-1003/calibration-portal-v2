import { ChalanData, ChalanItem } from "./ChalanTemplate";

// Type for outward gauge items (matches API response)
interface OutwardGaugeItem {
  inward_id: string;
  gauge_inward_id: string;
  gauge_id: string;
  inward_gauge_lab_id: string;
  master_gauge_name: string;
  identification_number: string;
  manf_serial_number: string;
  inward_date: string;
  process: string;
  status: string;
  id?: string;
  [key: string]: unknown;
}

// Re-export ChalanData for convenience
export type { ChalanData } from "./ChalanTemplate";

// Default company information - can be moved to config/env
const DEFAULT_COMPANY_INFO = {
  company_name: "VIKRAMADITYA METROLOGY CENTRE LLP.",
  company_address: "Plot No. A-15/1 Near Ultratech, MIDC Shiroli (P), Tal. Hatkanagale, Dist Kolhapur. 416122. Maharashtra",
  company_contact: "9503601616/7262831818",
  company_email: "vikramadityametrologycenter@gmail.com",
  // company_logo: "/images/logo/logo.svg", // Update with actual logo path
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasPrintableValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
};

const firstPrintableString = (values: unknown[], fallback: string = "-"): string => {
  for (const value of values) {
    if (hasPrintableValue(value)) {
      return String(value);
    }
  }

  return fallback;
};

const extractStandardSpecification = (source: unknown): unknown => {
  if (!isRecord(source)) return undefined;

  const standardSpecification = source.standard_specification;
  return hasPrintableValue(standardSpecification) ? standardSpecification : undefined;
};

const resolveSpecificationForPrint = (item: OutwardGaugeItem): unknown => {
  const itemRecord = item as Record<string, unknown>;
  const candidates = [
    itemRecord,
    itemRecord.specifications,
    itemRecord.gauge_specification,
    itemRecord.specification,
    itemRecord.gauge_spec,
  ];

  for (const candidate of candidates) {
    const standardSpecification = extractStandardSpecification(candidate);
    if (hasPrintableValue(standardSpecification)) {
      return standardSpecification;
    }
  }

  return (
    itemRecord.specifications ||
    itemRecord.gauge_specification ||
    itemRecord.specification ||
    itemRecord.gauge_spec ||
    "-"
  );
};

/**
 * Transform outward entry and items into ChalanData format
 * This function maps your API response (outward_details + outward_gauges) to the ChalanTemplate format
 */
export const transformOutwardToChalanData = (
  outwardEntry: Record<string, unknown>,
  outwardItems: OutwardGaugeItem[],
  companyInfo?: Partial<typeof DEFAULT_COMPANY_INFO>
): ChalanData => {
  const company = { ...DEFAULT_COMPANY_INFO, ...companyInfo };

  // Format dates helper
  const formatDate = (dateString: unknown) => {
    if (!dateString) return new Date().toISOString().split("T")[0];
    const rawDate = String(dateString);
    try {
      const date = new Date(rawDate);
      return date.toISOString().split("T")[0];
    } catch {
      return rawDate;
    }
  };

  // Build recipient address from address object
  const buildRecipientAddress = (address: unknown): string => {
    if (!isRecord(address)) return "-";
    
    const parts = [
      address.address_line_1,
      address.address_line_2,
      address.city,
      address.state,
      address.zip_code,
      address.country,
    ].filter(hasPrintableValue);
    
    return parts.length > 0 ? parts.map(String).join(", ") : "-";
  };

  // Transform items from outward_gauges
  const chalanItems: ChalanItem[] = outwardItems.map((item, index) => {
    const itemRecord = item as Record<string, unknown>;
    const specification = resolveSpecificationForPrint(item);
    
    // Get unit from item if available
    const unit = firstPrintableString([itemRecord.unit], "mm");

    // Get DC No and DC Date from gauge item (from API: client_dc_no, client_dc_date)
    const dcNo = firstPrintableString([itemRecord.client_dc_no, itemRecord.dc_no]);
    const dcDate = hasPrintableValue(itemRecord.client_dc_date)
      ? formatDate(itemRecord.client_dc_date)
      : hasPrintableValue(itemRecord.dc_date)
        ? formatDate(itemRecord.dc_date)
        : undefined;

    // Get gauge name - try multiple possible fields
    const gaugeName = firstPrintableString([
      item.master_gauge_name,
      itemRecord.gauge_name,
      itemRecord.master_gauge,
      itemRecord.name,
    ]);

    // Get identification number
    const identificationNumber = firstPrintableString([
      item.identification_number,
      item.manf_serial_number,
      itemRecord.identification_no,
    ]);

    // Get LAB ID
    const labId = firstPrintableString([
      item.inward_gauge_lab_id,
      itemRecord.lab_id,
      itemRecord.inward_gauge_lab_id,
    ]);

    const qtyValue = itemRecord.qty;
    const qty = typeof qtyValue === "number" ? qtyValue : Number(qtyValue) || 1;

    return {
      sr_no: index + 1,
      gauge_name: gaugeName,
      identification_number: identificationNumber,
      lab_id: labId,
      dc_no: dcNo,
      dc_date: dcDate,
      specification: specification, // Pass specification as-is (object/array/string)
      unit: unit,
      qty,
    };
  });

  // Calculate total quantity
  const totalQty = chalanItems.reduce((sum, item) => sum + item.qty, 0);

  // Extract address from outward_details
  const address = outwardEntry.address;
  const recipientAddress = buildRecipientAddress(address);

  return {
    // Company Information
    company_name: company.company_name,
    company_address: company.company_address,
    company_contact: company.company_contact,
    company_email: company.company_email,
    // company_logo: company.company_logo,

    // Chalan Information
    chalan_number: firstPrintableString([outwardEntry.outward_no, outwardEntry.id], "N/A"),
    chalan_date: formatDate(outwardEntry.outward_date || outwardEntry.created_at),
    outward_no: firstPrintableString([outwardEntry.outward_no, outwardEntry.id], "N/A"),
    outward_date: formatDate(outwardEntry.outward_date || outwardEntry.created_at),
    transport_by: firstPrintableString([outwardEntry.transport_by]),
    total_qty: totalQty,

    // Recipient Information
    recipient_name: firstPrintableString([outwardEntry.client_org], "N/A"),
    recipient_address: recipientAddress,

    // Items
    items: chalanItems,

    // Footer (optional - can be filled later)
    receiver_name: "",
    receiver_contact: "",
    receiver_signatory: "",
  };
};


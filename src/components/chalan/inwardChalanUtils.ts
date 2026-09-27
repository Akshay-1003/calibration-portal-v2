import { InwardChalanData, InwardChalanItem } from "./InwardChalanTemplate";
import type { InwardEntry, LinkedGauge } from "../../types";

// Default company information - same as outward chalan
const DEFAULT_COMPANY_INFO = {
  company_name: "VIKRAMADITYA METROLOGY CENTRE LLP.",
  company_address: "Plot No. A-15/1 Near Ultratech, MIDC Shiroli (P), Tal. Hatkanagale, Dist Kolhapur. 416122. Maharashtra",
  company_contact: "9503601616/7262831818",
  company_email: "vikramadityametrologycenter@gmail.com",
  company_logo: "/images/logo/InvoiceLogo.png",
};

// Re-export InwardChalanData for convenience
export type { InwardChalanData } from "./InwardChalanTemplate";

/**
 * Format calibration frequency from number and unit to display string
 */
const formatCalibrationFrequency = (
  frequency?: number | string | null,
  unit?: string | null
): string => {
  const numericFrequency =
    typeof frequency === "number"
      ? frequency
      : typeof frequency === "string"
        ? Number(frequency.trim())
        : NaN;

  if (!Number.isFinite(numericFrequency) || numericFrequency <= 0) return "-";

  const normalizedUnit = typeof unit === "string" ? unit.trim().toLowerCase() : "";
  const unitStr =
    normalizedUnit === "years" || normalizedUnit === "year" || normalizedUnit === "yrs" || normalizedUnit === "yr"
      ? "yrs"
      : normalizedUnit === "days" || normalizedUnit === "day"
        ? "days"
        : "mos";

  return `${numericFrequency} ${unitStr}.`;
};

const getCalibrationFrequencyDisplay = (item: Record<string, unknown>): string => {
  const directDisplayCandidates = [
    item.frequency,
    item.cal_freq,
    item.calibration_frequency_display,
    item.calibrationFrequency,
  ];

  for (const candidate of directDisplayCandidates) {
    if (typeof candidate === "string" && candidate.trim() && candidate.trim() !== "-") {
      return candidate.trim();
    }
  }

  const nestedGaugeInfo =
    (item.gaugeInfo as Record<string, unknown> | undefined) ??
    (item.gauge_info as Record<string, unknown> | undefined) ??
    (item.gauge as Record<string, unknown> | undefined) ??
    (item.gauge_data as Record<string, unknown> | undefined);

  const rawFrequency =
    item.calibration_frequency ??
    item.frequency_value ??
    nestedGaugeInfo?.calibration_frequency ??
    nestedGaugeInfo?.frequency;

  const rawUnit =
    item.calibration_frequency_unit ??
    item.frequency_unit ??
    nestedGaugeInfo?.calibration_frequency_unit ??
    nestedGaugeInfo?.frequency_unit;

  return formatCalibrationFrequency(
    rawFrequency as number | string | null | undefined,
    rawUnit as string | null | undefined
  );
};

/**
 * Format specification from various possible formats
 * Handles formats like:
 * - "14.6680 (0.0600/-0.0600) mm."
 * - "79.8000 (0.1500/0.0000) mm."
 * - "60.023 X 100.000 mm."
 * - "M8X1.25 6H.."
 * - "20-H8"
 * - "14.3250/14.3680 mm."
 */
const formatSpecification = (spec: any): string => {
  if (!spec) return "-";
  
  if (typeof spec === "string") {
    return spec;
  }
  
  if (typeof spec === "object") {
    // Handle GaugeSpecifications format
    if (spec.go || spec.no_go || spec.inputs) {
      // Handle inputs format (e.g., "M8X1.25 6H" or "20-H8")
      if (spec.inputs?.method && spec.inputs?.inputs) {
        const inputs = spec.inputs.inputs;
        // Thread format: M8X1.25 6H
        if (inputs.diameter && inputs.basic_size && inputs.grade) {
          return `${inputs.diameter}X${inputs.basic_size} ${inputs.grade}`;
        }
        // Tolerance grade format: 20-H8
        if (inputs.grade && inputs.basic_size) {
          return `${inputs.basic_size}-${inputs.grade}`;
        }
        // Basic format with diameter
        if (inputs.diameter && inputs.basic_size) {
          return `${inputs.diameter}X${inputs.basic_size}`;
        }
        // Just grade
        if (inputs.grade) {
          return `${inputs.grade}`;
        }
      }
      
      // Handle go/no_go format
      const goSpec = spec.go;
      const noGoSpec = spec.no_go;
      
      // Handle concentric format (e.g., "60.023 X 100.000 mm.")
      if (goSpec?.basic_size && noGoSpec?.basic_size && 
          goSpec.basic_size !== noGoSpec.basic_size) {
        return `${goSpec.basic_size} X ${noGoSpec.basic_size} mm.`;
      }
      
      // Handle range format (e.g., "14.3250/14.3680 mm.")
      if (goSpec?.basic_size && noGoSpec?.basic_size && 
          goSpec.basic_size !== noGoSpec.basic_size) {
        // Check if it's a range (close values)
        const diff = Math.abs(goSpec.basic_size - noGoSpec.basic_size);
        if (diff < 1) {
          return `${goSpec.basic_size}/${noGoSpec.basic_size} mm.`;
        }
      }
      
      // Handle single value with tolerance (e.g., "14.6680 (0.0600/-0.0600) mm.")
      if (goSpec?.basic_size !== undefined) {
        const basic_size = goSpec.basic_size;
        let tolerance = "";
        
        if (goSpec.specification_limit_max !== undefined && goSpec.specification_limit_min !== undefined) {
          const max = goSpec.specification_limit_max;
          const min = goSpec.specification_limit_min;
          // Format: (0.0600/-0.0600) or (0.1500/0.0000)
          tolerance = `(${max >= 0 ? max : max}/${min >= 0 ? min : min})`;
        }
        
        return `${basic_size} ${tolerance} mm.`.trim();
      }
      
      // Handle no_go only
      if (noGoSpec?.basic_size !== undefined) {
        return `${noGoSpec.basic_size} mm.`;
      }
    }
    
    // Handle array format
    if (Array.isArray(spec)) {
      return spec.join(" X ");
    }
    
    // Try to extract readable values
    const specParts = Object.entries(spec)
      .map(([, value]) => `${value}`)
      .filter(Boolean);
    return specParts.length > 0 ? specParts.join(" X ") : JSON.stringify(spec);
  }
  
  return String(spec);
};

void formatSpecification;

/**
 * Build address string from address object or organization data
 */
const buildClientAddress = (inwardEntry: InwardEntry, organizations?: any[]): string => {
  // Try to get address from organizations if available
  if (organizations) {
    const clientOrg = organizations.find(org => org.id === inwardEntry.client_org_id);
    if (clientOrg?.address) {
      const addr = clientOrg.address;
      const parts = [
        addr.address_line_1,
        addr.address_line_2,
        addr.city,
        addr.state,
        addr.zip_code,
        addr.country,
      ].filter(Boolean);
      return parts.length > 0 ? parts.join(", ") : "-";
    }
  }
  
  // Fallback: return a placeholder or try to construct from available data
  return "-";
};

/**
 * Get contact person information from inward entry
 */
const getContactPerson = (inwardEntry: InwardEntry): { name: string; phone: string } => {
  return {
    name: inwardEntry.contact_person_name || "-",
    phone: inwardEntry.contact_person_phone || "-",
  };
};

/**
 * Transform inward entry and linked gauges into InwardChalanData format
 * Uses existing API data from inwardGaugeStore
 */
export const transformInwardToChalanData = (
  inwardEntry: InwardEntry,
  linkedGauges: LinkedGauge[],
  companyInfo?: Partial<typeof DEFAULT_COMPANY_INFO>,
  organizations?: any[]
): InwardChalanData => {
  const company = { ...DEFAULT_COMPANY_INFO, ...companyInfo };

  // Format dates helper
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return new Date().toISOString().split("T")[0];
    try {
      const date = new Date(dateString);
      return date.toISOString().split("T")[0];
    } catch {
      return dateString;
    }
  };

  // Transform items from linked gauges
  const chalanItems: InwardChalanItem[] = linkedGauges.map((item, index) => {
    // Get specification - try multiple sources
    // Keep as raw object for the formatter to process
    const specification = 
      (item as any).specification || 
      (item as any).gauge_specification || 
      (item as any).specifications ||
      (item as any).gauge_spec ||
      null;

    // Get gauge name
    const gaugeName = 
      item.master_gauge_name || 
      (item as any).gauge_name || 
      (item as any).master_gauge ||
      (item as any).name ||
      "-";

    // Get identification number
    const identificationNumber = 
      item.identification_number || 
      item.manf_serial_number || 
      (item as any).identification_no ||
      "-";

    // Get serial number (manufacturer serial number)
    const serialNo = 
      item.manf_serial_number || 
      (item as any).serial_no ||
      (item as any).serial_number ||
      "-";

    // Get calibration frequency (for Cal. Freq. column)
    const calFreq = getCalibrationFrequencyDisplay(item as Record<string, unknown>);

    // Get frequency (same as calFreq, for Frequency column)
    const frequency = calFreq;

    // Get calibration done under
    const calibrationDoneUnder = 
      (item as any).calibration_done_under || 
      (item as any).calibration_done_under ||
      "NABL"; // Default to NABL if not specified

    // Get LAB ID
    const labId = 
      item.inward_gauge_lab_id || 
      (item as any).lab_id || 
      (item as any).inward_gauge_lab_id ||
      "-";

    // Get unit from gauge data (default to 'mm')
    const unit = (item as any).unit || 'mm';

    return {
      sr_no: index + 1,
      gauge_name: gaugeName,
      identification_number: identificationNumber,
      serial_no: serialNo,
      cal_freq: calFreq,
      frequency: frequency,
      specification: specification, // Pass raw specification object
      unit: unit, // Pass unit for specification formatting
      calibration_done_under: calibrationDoneUnder,
      lab_id: labId,
    };
  });

  // Get contact person info
  const contactPerson = getContactPerson(inwardEntry);

  // Build client address
  const clientAddress = buildClientAddress(inwardEntry, organizations);

  // Get client name
  const clientName = 
    inwardEntry.client_org_name || 
    (organizations?.find(org => org.id === inwardEntry.client_org_id)?.name) ||
    "-";

  return {
    // Company Information
    company_name: company.company_name,
    company_address: company.company_address,
    company_contact: company.company_contact,
    company_email: company.company_email,
    company_logo: company.company_logo,

    // Chalan Information
    inward_chalan_number: String(inwardEntry.inward_no || inwardEntry.id || "N/A"),
    chalan_date: formatDate(inwardEntry.inward_date || inwardEntry.created_at),
    inward_no: String(inwardEntry.inward_no || inwardEntry.id || "N/A"),
    client_dc_no: inwardEntry.client_dc_no || "-",
    client_dc_date: formatDate(inwardEntry.client_dc_date),
    gauge_qty: chalanItems.length,

    // Client Information (Bill To / Deliver To - same for both)
    client_name: clientName,
    client_address: clientAddress,
    contact_person: contactPerson.name,
    contact_number: contactPerson.phone,

    // Items
    items: chalanItems,
  };
};

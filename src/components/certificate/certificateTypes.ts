import type { CertificateGaugeData, Observations, Specifications } from '../../types';

/**
 * Certificate data structure for rendering
 */
export interface CertificateData {
  location?: string;
  // Header Information
  company_name: string;
  company_address: string;
  company_phone: string[];
  company_email: string;
  company_website: string;
  nabl_logo?: string;
  nabl_number?: string;

  // Certificate Details
  certificate_no: string;
  calibration_date: string;
  next_cal_date: string;
  issue_date: string;
  ulr_no?: string;
  page?: string;

  // Client Details
  client_name: string;
  client_address: string;
  dc_no: string;
  dc_date: string;
  received_date: string;

  // Equipment Details
  description: string;
  make: string;
  serial_number: string;
  specification: string;
  condition: string;
  vmc_id: string;

  // Calibration Details
  traceability: string;
  method: string;
  uncertainty?: string;

  // Observations - Dynamic structure
  observations: Observations;
  specifications: Specifications;

  // Equipment & Masters Used
  equipment_masters?: Array<{
    equipment: string;
    make: string;
    sr_no: string;
    cert_no: string;
    calibrated: string;
    valid_till: string;
  }>;

  // Remarks
  remarks?: string;

  // Signatures
  calibrated_by?: string;
  approved_by?: string;
}

/**
 * Transform CertificateGaugeData to CertificateData
 */
export const transformGaugeDataToCertificateData = (
  gaugeData: CertificateGaugeData,
  companyInfo?: {
    name?: string;
    address?: string;
    phone?: string[];
    email?: string;
    website?: string;
    nabl_number?: string;
  }
): CertificateData => {
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  // Calculate next calibration date
  const calculateNextCalDate = (): string => {
    if (!gaugeData.calibration_frequency || !gaugeData.updated_at) return '-';
    try {
      const lastCalDate = new Date(gaugeData.updated_at);
      const frequency = gaugeData.calibration_frequency;
      
      const unit = gaugeData.calibration_frequency_unit || 'months';
      
      const nextDate = new Date(lastCalDate);
      if (unit === 'months') {
        nextDate.setMonth(nextDate.getMonth() + frequency);
      } else if (unit === 'years') {
        nextDate.setFullYear(nextDate.getFullYear() + frequency);
      } else if (unit === 'days') {
        nextDate.setDate(nextDate.getDate() + frequency);
      }
      
      return formatDate(nextDate.toISOString());
    } catch {
      return '-';
    }
  };

  return {
    // Company Information
    company_name: companyInfo?.name || 'VIKRAMADITYA METROLOGY CENTRE LLP.',
    company_address: companyInfo?.address || 'Plot No. A 15/1, Near Ultratech M.I.D.C. Shiroli (P) Kolhapur 416122, Maharashtra.',
    company_phone: companyInfo?.phone || ['(+91) 9503601616', '(+91) 7262831818'],
    company_email: companyInfo?.email || 'vmcindialab@gmail.com',
    company_website: companyInfo?.website || 'www.vikramadityacalibration.com',
    nabl_number: companyInfo?.nabl_number || 'CC-4564',

    // Certificate Details
    certificate_no: gaugeData.certificate_id || '-',
    calibration_date: formatDate(gaugeData.updated_at),
    next_cal_date: calculateNextCalDate(),
    issue_date: formatDateTime(gaugeData.updated_at),
    ulr_no: gaugeData.inward_gauge_lab_id || '-',
    page: '1',

    // Client Details
    client_name: gaugeData.client_org_name || '-',
    client_address: '-', // Not available in gaugeData
    dc_no: gaugeData.client_dc_no || '-',
    dc_date: formatDate(gaugeData.client_dc_date),
    received_date: formatDate(gaugeData.inward_date),

    // Equipment Details
    description: gaugeData.master_gauge_name || '-',
    make: gaugeData.make || '-',
    serial_number: gaugeData.manf_serial_number || gaugeData.identification_number || '-',
    specification: `${gaugeData.gauge_class || ''}`.trim() || '-',
    condition: gaugeData.gauge_condition || '-',
    vmc_id: gaugeData.id || '-',

    // Calibration Details
    traceability: 'Reference Std',
    method: gaugeData.calibration_method || '-',
    uncertainty: undefined,

    // Observations & Specifications
    observations: gaugeData.observations || {},
    specifications: (gaugeData.specifications || {}) as Specifications,

    // Equipment & Masters (empty for now)
    equipment_masters: [],

    // Remarks
    remarks: 'Due date given as per customer request.',

    // Signatures (empty for now)
    calibrated_by: undefined,
    approved_by: undefined,
  };
};

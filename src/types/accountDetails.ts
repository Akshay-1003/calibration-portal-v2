export type AccountDetailType =
  | 'Calibration Lab'
  | 'Trading'
  | 'Sales'
  | 'Service';

export interface AccountBankDetails {
  bank_name: string;
  account_no: string;
  ifsc: string;
  branch: string;
}

export interface AccountDetail {
  id: string;
  firm_name: string;
  type: AccountDetailType | string;
  gst_no?: string;
  pan_no?: string;
  address?: string;
  contact_no?: string;
  email?: string;
  website?: string;
  logo?: string;
  bank_details: AccountBankDetails;
  is_active: boolean;
  archived?: boolean;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

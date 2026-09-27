export type FormatNumberType = 'certificate' | 'inward' | 'outward' | 'customer';

export interface FormatNumber {
  id: string;
  formatNumber: string;
  formatType: FormatNumberType;
  isActive: boolean;
  clientOrgId: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateFormatNumberPayload {
  formatNumber: string;
  formatType: FormatNumberType;
  isActive: boolean;
  clientOrgId?: string | null;
}

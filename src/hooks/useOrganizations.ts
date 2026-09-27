import type { Organization, InwardRateCard } from '../types';
import { useOrganizationsWithQuery } from './useOrganizationsWithQuery';
import type { OrganizationDirectory } from './queries/organizations';

interface OrganizationFormData {
  name: string;
  description: string;
  parent_id?: string;
  gst?: string;
  gst_type?: string;
  org_type?: 'customer' | 'laboratory' | string | null;
  is_active?: boolean;
  lab_type?: 'NABL Lab' | 'Non-NABL Lab' | string | null;
  lab_certificate_number?: string | null;
  contacts: Array<{
    name: string;
    email: string;
    phone: string;
  }>;
  address: {
    address_line_1: string;
    address_line_2?: string;
    city: string;
    state: string;
    zip_code: string;
    country: string;
  };
  contract: {
    calibration_method: string;
    reporting_method: string;
    collection_mode: string;
    dispatch_mode: string;
    conformity_statement: boolean;
    conformity_accepted: boolean;
    specific_requirements: string;
    rate_card?: InwardRateCard | null;
  };
  archived?: boolean;
}

interface UseOrganizationsReturn {
  organizations: Organization[];
  loading: boolean;
  error: string | null;
  refreshOrganizations: () => Promise<void>;
  addOrganization: (org: OrganizationFormData) => Promise<Organization | null>;
  updateOrganization: (id: string, data: Partial<OrganizationFormData>) => Promise<Organization | null>;
  deleteOrganization: (id: string) => Promise<boolean>;
  clearError: () => void;
}

/**
 * Efficient hook for managing organizations
 * - TanStack Query source of truth
 * - Automatic caching & invalidation
 * - Backward-compatible API surface
 */
export const useOrganizations = (directory: OrganizationDirectory = 'all'): UseOrganizationsReturn => {
  const {
    organizations,
    loading,
    error,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    refreshOrganizations,
    clearError,
  } = useOrganizationsWithQuery({ directory });

  const addOrganization = async (org: OrganizationFormData) => {
    return await createOrganization(org);
  };

  return {
    organizations,
    loading,
    error,
    refreshOrganizations,
    addOrganization,
    updateOrganization,
    deleteOrganization,
    clearError,
  };
};

// Re-export types for convenience
export type { Organization, OrganizationFormData };

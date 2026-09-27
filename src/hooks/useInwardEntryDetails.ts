/**
 * Universal hook to get inward entry details by ID
 * Uses existing store methods - no separate store needed
 * 
 * @param inwardId - The inward entry ID
 * @returns Object with companyName, inwardNo, inwardDate, and loading state
 */

import { useMemo, useEffect } from 'react';
import { useInwardGaugeStore } from '../store/inwardGaugeStore';

export interface InwardEntryDetails {
  client_org_name: string | null;
  inward_no: string | null; // Entry ID (unique identifier)
  inward_date: string | null;
  loading: boolean;
}

/**
 * Hook to get inward entry details by ID
 * Automatically fetches entries if not in cache
 */
export const useInwardEntryDetails = (inwardId: string | undefined | null): InwardEntryDetails => {
  const {
    allInwardEntries,
    fetchAllInwardEntries,
    loading,
  } = useInwardGaugeStore();

  // Fetch entries if not already loaded
  useEffect(() => {
    if (inwardId && allInwardEntries.length === 0 && !loading.loadingAllInwards) {
      fetchAllInwardEntries();
    }
  }, [inwardId, allInwardEntries.length, loading.loadingAllInwards, fetchAllInwardEntries]);
console.log(allInwardEntries);
  // Find the entry by ID
  const entry = useMemo(() => {
    if (!inwardId) return null;
    return allInwardEntries.find((entry) => entry.id === inwardId) || null;
  }, [inwardId, allInwardEntries]);

  // Extract details from entry
  const details = useMemo<InwardEntryDetails>(() => {
    if (!entry) {
      return {
        client_org_name: null,
        inward_no: null,
        inward_date: null,
        loading: loading.loadingAllInwards,
      };
    }

    return {
      client_org_name: entry.client_org_name || null,
      inward_no: entry.inward_no || null, // Entry ID (unique identifier)
      inward_date: entry.inward_date || null,
      loading: loading.loadingAllInwards,
    };
  }, [entry, loading.loadingAllInwards, inwardId]);

  return details;
};


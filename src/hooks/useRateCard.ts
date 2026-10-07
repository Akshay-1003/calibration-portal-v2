/**
 * TanStack Query hooks for Rate Card operations
 * Provides caching and automatic table updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  fetchRateCard,
  getRateCardEntriesMap,
  getRateCardPriceList,
  importRateCardExcel,
  updateRateCard,
  type RateCardApiResponse,
  type RateCardEntriesByGauge,
  type RateCardImportResult,
} from '../services/apiServices';
import { RateCardEntry } from '../types/types';
import { useMasterDataStore } from '../store/useStore';

// Export RateCardEntryWithId type
export interface RateCardEntryWithId extends RateCardEntry {
  id: string;
  gauge_id?: string; // master_gauge_id
  gauge_name?: string;
}

// Helper function to get gauge name from master data store
const getGaugeName = (gaugeId: string | undefined): string | undefined => {
  if (!gaugeId) return undefined;
  try {
    const state = useMasterDataStore.getState();
    const gauge = state.gaugeMasterList.find(g => g.id === gaugeId);
    return gauge?.name;
  } catch {
    return undefined;
  }
};

const normalizeRateTypeForUi = (rateType: RateCardEntry['rate_type']) =>
  rateType === 'discounted' ? 'discount' : rateType;

const normalizeRateTypeForApi = (rateType: RateCardEntry['rate_type']) =>
  rateType === 'discount' ? 'discounted' : rateType;

// Helper functions (same as in store)
const flattenRateCard = (
  rateCard: RateCardApiResponse | RateCardEntriesByGauge, 
  orgId: string,
  existingEntries?: RateCardEntryWithId[]
): RateCardEntryWithId[] => {
  const flattened: RateCardEntryWithId[] = [];

  const entriesByGauge = getRateCardEntriesMap(rateCard);
  if (!entriesByGauge || typeof entriesByGauge !== 'object') {
    return flattened;
  }
  
  // Create a map of existing entries by id to preserve gauge_name
  const existingMap = new Map<string, RateCardEntryWithId>();
  if (existingEntries) {
    existingEntries.forEach(entry => {
      if (entry.id) {
        existingMap.set(entry.id, entry);
      }
    });
  }
  
  Object.entries(entriesByGauge).forEach(([masterGaugeId, entries]) => {
    // Ensure entries is an array
    if (Array.isArray(entries)) {
      entries.forEach((entry, index) => {
        const entryId = `${orgId}_${masterGaugeId}_${index}`;
        const existingEntry = existingMap.get(entryId);
        
        // Preserve gauge_name from existing entry, or fetch from master data store
        const gaugeName = existingEntry?.gauge_name || getGaugeName(masterGaugeId);
        
        flattened.push({
          ...entry,
          rate_type: normalizeRateTypeForUi(entry.rate_type),
          id: entryId,
          gauge_id: masterGaugeId,
          gauge_name: gaugeName,
        });
      });
    }
  });
  
  return flattened;
};

const unflattenRateCard = (entries: RateCardEntryWithId[]): RateCardEntriesByGauge => {
  const rateCard: RateCardEntriesByGauge = {};
  
  entries.forEach((entry) => {
    const masterGaugeId = entry.gauge_id || '';
    if (!masterGaugeId) return;
    
    if (!rateCard[masterGaugeId]) {
      rateCard[masterGaugeId] = [];
    }
    
    const apiEntry: RateCardEntry = {
      rate_type: normalizeRateTypeForApi(entry.rate_type),
      range: entry.range,
      basic_size: entry.basic_size,
      range_unit: entry.range_unit,
      standard_specification: entry.standard_specification,
      least_count: entry.least_count,
      description: entry.description,
      rate: entry.rate,
      discount: entry.discount,
      unit: entry.unit,
    };
    
    // Ensure numeric fields are numbers
    const range = entry.range || { min: 0, max: 0 };
    const normalizedEntry = {
      ...apiEntry,
      range: {
        min: typeof range.min === 'number' ? range.min : parseFloat(String(range.min)) || 0,
        max: typeof range.max === 'number' ? range.max : parseFloat(String(range.max)) || 0,
      },
      rate: typeof apiEntry.rate === 'number' ? apiEntry.rate : parseFloat(String(apiEntry.rate)) || 0,
      discount: typeof apiEntry.discount === 'number' ? apiEntry.discount : parseFloat(String(apiEntry.discount)) || 0,
      basic_size: typeof apiEntry.basic_size === 'number' ? apiEntry.basic_size : (apiEntry.basic_size ? parseFloat(String(apiEntry.basic_size)) : 0),
      least_count:
        typeof apiEntry.least_count === 'number'
          ? apiEntry.least_count
          : apiEntry.least_count
            ? parseFloat(String(apiEntry.least_count))
            : undefined,
      range_unit: apiEntry.range_unit || apiEntry.unit || '',
    };
    
    rateCard[masterGaugeId].push(normalizedEntry);
  });
  
  return rateCard;
};

const buildRateCardDocument = (
  entries: RateCardEntriesByGauge,
  source?: RateCardApiResponse | null,
  priceListOverride?: string | null
): RateCardApiResponse => {
  const nextDocument: RateCardApiResponse = { ...entries };
  const priceList =
    priceListOverride !== undefined
      ? priceListOverride
      : getRateCardPriceList(source ?? null);

  if (priceList !== undefined) {
    nextDocument.price_list = priceList;
  }

  return nextDocument;
};

const buildUpdateOptions = (source?: RateCardApiResponse | null) => {
  const priceList = getRateCardPriceList(source ?? null);

  return priceList !== undefined ? { priceList } : undefined;
};

/**
 * Query key factory for rate card queries
 */
export const rateCardKeys = {
  all: ['rate-cards'] as const,
  byOrg: (orgId: string) => [...rateCardKeys.all, orgId] as const,
};

/**
 * Hook to fetch rate card for an organization
 */
export const useRateCard = (orgId: string | undefined) => {
  return useQuery<RateCardApiResponse>({
    queryKey: orgId ? rateCardKeys.byOrg(orgId) : ['rate-cards', 'disabled'],
    queryFn: () => fetchRateCard(orgId!),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * Hook to get flattened entries for UI
 */
export const useRateCardEntries = (orgId: string | undefined) => {
  const { data: rateCard, ...rest } = useRateCard(orgId);
  const queryClient = useQueryClient();
  
  // Get existing flattened entries from cache to preserve gauge_name
  const existingEntries = queryClient.getQueryData<RateCardEntryWithId[]>(
    ['rate-card-entries', orgId]
  );
  
  const flattenedEntries = orgId && rateCard 
    ? flattenRateCard(rateCard, orgId, existingEntries) 
    : [];
  
  // Cache the flattened entries with gauge names for future use
  if (orgId && flattenedEntries.length > 0) {
    queryClient.setQueryData(['rate-card-entries', orgId], flattenedEntries);
  }
  
  return {
    ...rest,
    data: flattenedEntries,
    rateCard,
    priceList: getRateCardPriceList(rateCard ?? null),
  };
};

/**
 * Hook to add a rate card entry
 */
export const useAddRateCardEntry = (orgId: string | undefined) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (entry: RateCardEntryWithId) => {
      if (!orgId) throw new Error('Organization ID is required');
      
      // Get current rate card
      const currentRateCard = queryClient.getQueryData<RateCardApiResponse>(
        rateCardKeys.byOrg(orgId)
      ) || {};
      
      // Get current flattened entries
      const currentEntries = flattenRateCard(currentRateCard, orgId);
      
      // Add new entry
      const entryWithId: RateCardEntryWithId = {
        ...entry,
        id: entry.id || `${orgId}_${entry.gauge_id}_${Date.now()}`,
      };
      const updated = [...currentEntries, entryWithId];
      
      // Convert to API format
      const rateCard = unflattenRateCard(updated);
      
      // Update via API
      return updateRateCard(orgId, rateCard, buildUpdateOptions(currentRateCard));
    },
    onMutate: async () => {
      if (!orgId) return;
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: rateCardKeys.byOrg(orgId) });
      
      // Snapshot previous value
      const previousRateCard = queryClient.getQueryData<RateCardApiResponse>(
        rateCardKeys.byOrg(orgId)
      );
      
      return { previousRateCard };
    },
    onSuccess: (data) => {
      if (orgId) {
        // Get existing flattened entries to preserve gauge_name
        const existingEntries = queryClient.getQueryData<RateCardEntryWithId[]>(
          ['rate-card-entries', orgId]
        ) || [];
        
        // Update cache with server response
        queryClient.setQueryData(rateCardKeys.byOrg(orgId), data);
        
        // Re-flatten with preserved gauge names
        const newFlattened = flattenRateCard(data, orgId, existingEntries);
        queryClient.setQueryData(['rate-card-entries', orgId], newFlattened);
        
        toast.success('Rate card entry added successfully');
      }
    },
    onSettled: () => {
      // Don't invalidate to prevent unnecessary refetches that could cause unmounting
      // The cache is already updated with setQueryData above
    },
    onError: (error, _variables, context) => {
      if (orgId && context?.previousRateCard) {
        // Rollback on error
        queryClient.setQueryData(rateCardKeys.byOrg(orgId), context.previousRateCard);
      }
      console.error('Error adding rate card entry:', error);
      toast.error('Failed to add rate card entry');
    },
  });
};

/**
 * Hook to add multiple rate card entries in one rate-card update.
 */
export const useAddRateCardEntries = (orgId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entries: RateCardEntryWithId[]) => {
      if (!orgId) throw new Error('Organization ID is required');

      const currentRateCard = queryClient.getQueryData<RateCardApiResponse>(
        rateCardKeys.byOrg(orgId)
      ) || {};
      const currentEntries = flattenRateCard(currentRateCard, orgId);
      const timestamp = Date.now();
      const entriesWithIds = entries.map((entry, index) => ({
        ...entry,
        id: entry.id || `${orgId}_${entry.gauge_id}_${timestamp}_${index}`,
      }));
      const updated = [...currentEntries, ...entriesWithIds];
      const rateCard = unflattenRateCard(updated);

      return updateRateCard(orgId, rateCard, buildUpdateOptions(currentRateCard));
    },
    onMutate: async () => {
      if (!orgId) return;

      await queryClient.cancelQueries({ queryKey: rateCardKeys.byOrg(orgId) });

      const previousRateCard = queryClient.getQueryData<RateCardApiResponse>(
        rateCardKeys.byOrg(orgId)
      );

      return { previousRateCard };
    },
    onSuccess: (data, entries) => {
      if (!orgId) {
        return;
      }

      const existingEntries = queryClient.getQueryData<RateCardEntryWithId[]>(
        ['rate-card-entries', orgId]
      ) || [];

      queryClient.setQueryData(rateCardKeys.byOrg(orgId), data);
      queryClient.setQueryData(
        ['rate-card-entries', orgId],
        flattenRateCard(data, orgId, existingEntries)
      );

      toast.success(`${entries.length} rate card ${entries.length === 1 ? 'entry' : 'entries'} added successfully`);
    },
    onError: (error, _variables, context) => {
      if (orgId && context?.previousRateCard) {
        queryClient.setQueryData(rateCardKeys.byOrg(orgId), context.previousRateCard);
      }
      console.error('Error adding rate card entries:', error);
      toast.error('Failed to add rate card entries');
    },
  });
};

/**
 * Hook to update a rate card entry
 */
export const useUpdateRateCardEntry = (orgId: string | undefined) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (entry: RateCardEntryWithId) => {
      if (!orgId) throw new Error('Organization ID is required');
      
      // Get current rate card
      const currentRateCard = queryClient.getQueryData<RateCardApiResponse>(
        rateCardKeys.byOrg(orgId)
      ) || {};
      
      // Get current flattened entries
      const currentEntries = flattenRateCard(currentRateCard, orgId);
      
      // Update entry in flattened list
      const updated = currentEntries.map((e) => 
        e.id === entry.id ? { ...entry, id: entry.id } : e
      );
      
      // Convert to API format
      const rateCard = unflattenRateCard(updated);
      
      // Update via API
      return updateRateCard(orgId, rateCard, buildUpdateOptions(currentRateCard));
    },
    onMutate: async (entry) => {
      if (!orgId) return;
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: rateCardKeys.byOrg(orgId) });
      
      // Snapshot previous value
      const previousRateCard = queryClient.getQueryData<RateCardApiResponse>(
        rateCardKeys.byOrg(orgId)
      );
      
      // Optimistically update
      const currentRateCard = previousRateCard || {};
      const existingEntries = queryClient.getQueryData<RateCardEntryWithId[]>(
        ['rate-card-entries', orgId]
      ) || [];
      const currentEntries = flattenRateCard(currentRateCard, orgId, existingEntries);
      
      // Preserve gauge_name from entry if it exists, otherwise get from master data
      const gaugeName = entry.gauge_name || getGaugeName(entry.gauge_id);
      const updated = currentEntries.map((e) => 
        e.id === entry.id 
          ? { ...entry, id: entry.id, gauge_name: gaugeName || e.gauge_name } 
          : e
      );
      const optimisticRateCard = buildRateCardDocument(
        unflattenRateCard(updated),
        currentRateCard
      );
      
      queryClient.setQueryData(rateCardKeys.byOrg(orgId), optimisticRateCard);
      queryClient.setQueryData(['rate-card-entries', orgId], updated);
      
      return { previousRateCard };
    },
    onSuccess: (data) => {
      if (orgId) {
        // Get existing flattened entries to preserve gauge_name
        const existingEntries = queryClient.getQueryData<RateCardEntryWithId[]>(
          ['rate-card-entries', orgId]
        ) || [];
        
        // Update cache with server response
        queryClient.setQueryData(rateCardKeys.byOrg(orgId), data);
        
        // Re-flatten with preserved gauge names
        const newFlattened = flattenRateCard(data, orgId, existingEntries);
        queryClient.setQueryData(['rate-card-entries', orgId], newFlattened);
        
        toast.success('Rate card entry updated successfully');
      }
    },
    onSettled: () => {
      // Don't invalidate to prevent unnecessary refetches that could cause unmounting
      // The cache is already updated with setQueryData above
    },
    onError: (error, _variables, context) => {
      if (orgId && context?.previousRateCard) {
        // Rollback on error
        queryClient.setQueryData(rateCardKeys.byOrg(orgId), context.previousRateCard);
      }
      console.error('Error updating rate card entry:', error);
      toast.error('Failed to update rate card entry');
    },
  });
};

/**
 * Hook to delete a rate card entry
 */
export const useDeleteRateCardEntry = (orgId: string | undefined) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (entryId: string) => {
      if (!orgId) throw new Error('Organization ID is required');
      
      // Get current rate card
      const currentRateCard = queryClient.getQueryData<RateCardApiResponse>(
        rateCardKeys.byOrg(orgId)
      ) || {};
      
      // Get current flattened entries
      const currentEntries = flattenRateCard(currentRateCard, orgId);
      
      // Remove entry
      const updated = currentEntries.filter((e) => e.id !== entryId);
      
      // Convert to API format
      const rateCard = unflattenRateCard(updated);
      
      // Update via API
      return updateRateCard(orgId, rateCard, buildUpdateOptions(currentRateCard));
    },
    onMutate: async (entryId) => {
      if (!orgId) return;
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: rateCardKeys.byOrg(orgId) });
      
      // Snapshot previous value
      const previousRateCard = queryClient.getQueryData<RateCardApiResponse>(
        rateCardKeys.byOrg(orgId)
      );
      
      // Optimistically update
      const currentRateCard = previousRateCard || {};
      const existingEntries = queryClient.getQueryData<RateCardEntryWithId[]>(
        ['rate-card-entries', orgId]
      ) || [];
      const currentEntries = flattenRateCard(currentRateCard, orgId, existingEntries);
      const updated = currentEntries.filter((e) => e.id !== entryId);
      const optimisticRateCard = buildRateCardDocument(
        unflattenRateCard(updated),
        currentRateCard
      );
      
      queryClient.setQueryData(rateCardKeys.byOrg(orgId), optimisticRateCard);
      queryClient.setQueryData(['rate-card-entries', orgId], updated);
      
      return { previousRateCard };
    },
    onSuccess: (data) => {
      if (orgId) {
        // Get existing flattened entries to preserve gauge_name
        const existingEntries = queryClient.getQueryData<RateCardEntryWithId[]>(
          ['rate-card-entries', orgId]
        ) || [];
        
        // Update cache with server response
        queryClient.setQueryData(rateCardKeys.byOrg(orgId), data);
        
        // Re-flatten with preserved gauge names
        const newFlattened = flattenRateCard(data, orgId, existingEntries);
        queryClient.setQueryData(['rate-card-entries', orgId], newFlattened);
        
        toast.success('Rate card entry deleted successfully');
      }
    },
    onSettled: () => {
      // Don't invalidate to prevent unnecessary refetches that could cause unmounting
      // The cache is already updated with setQueryData above
    },
    onError: (error, _variables, context) => {
      if (orgId && context?.previousRateCard) {
        // Rollback on error
        queryClient.setQueryData(rateCardKeys.byOrg(orgId), context.previousRateCard);
      }
      console.error('Error deleting rate card entry:', error);
      toast.error('Failed to delete rate card entry');
    },
  });
};

/**
 * Hook to update the saved price-list PDF reference for a rate card.
 */
export const useUpdateRateCardPriceList = (orgId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (priceList: string | null) => {
      if (!orgId) throw new Error('Organization ID is required');

      const currentRateCard = queryClient.getQueryData<RateCardApiResponse>(
        rateCardKeys.byOrg(orgId)
      ) || {};
      const currentEntries = flattenRateCard(currentRateCard, orgId);
      const rateCard = unflattenRateCard(currentEntries);

      return updateRateCard(orgId, rateCard, { priceList });
    },
    onMutate: async (priceList) => {
      if (!orgId) return;

      await queryClient.cancelQueries({ queryKey: rateCardKeys.byOrg(orgId) });

      const previousRateCard = queryClient.getQueryData<RateCardApiResponse>(
        rateCardKeys.byOrg(orgId)
      );
      const existingEntries = queryClient.getQueryData<RateCardEntryWithId[]>(
        ['rate-card-entries', orgId]
      ) || [];
      const currentRateCard = previousRateCard || {};
      const currentEntries = flattenRateCard(currentRateCard, orgId, existingEntries);
      const optimisticRateCard = buildRateCardDocument(
        unflattenRateCard(currentEntries),
        currentRateCard,
        priceList
      );

      queryClient.setQueryData(rateCardKeys.byOrg(orgId), optimisticRateCard);
      queryClient.setQueryData(['rate-card-entries', orgId], currentEntries);

      return { previousRateCard };
    },
    onSuccess: (data) => {
      if (!orgId) {
        return;
      }

      const existingEntries = queryClient.getQueryData<RateCardEntryWithId[]>(
        ['rate-card-entries', orgId]
      ) || [];
      queryClient.setQueryData(rateCardKeys.byOrg(orgId), data);
      queryClient.setQueryData(
        ['rate-card-entries', orgId],
        flattenRateCard(data, orgId, existingEntries)
      );
      toast.success('Price list PDF updated successfully');
    },
    onError: (error, _variables, context) => {
      if (orgId && context?.previousRateCard) {
        queryClient.setQueryData(rateCardKeys.byOrg(orgId), context.previousRateCard);
      }
      console.error('Error updating price list PDF:', error);
      toast.error('Failed to update price list PDF');
    },
  });
};

/**
 * Hook to preview an Excel rate-card import without saving.
 */
export const usePreviewRateCardImport = (orgId: string | undefined) => {
  return useMutation<RateCardImportResult, Error, File>({
    mutationFn: async (file: File) => {
      if (!orgId) throw new Error('Organization ID is required');
      return importRateCardExcel(orgId, file, true);
    },
  });
};

/**
 * Hook to confirm an Excel rate-card import.
 */
export const useConfirmRateCardImport = (orgId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation<RateCardImportResult, Error, File>({
    mutationFn: async (file: File) => {
      if (!orgId) throw new Error('Organization ID is required');
      return importRateCardExcel(orgId, file, false);
    },
    onSuccess: (data) => {
      if (!orgId) {
        return;
      }

      const currentRateCard = queryClient.getQueryData<RateCardApiResponse>(
        rateCardKeys.byOrg(orgId)
      ) || {};

      if (data.rate_card) {
        const nextDocument = buildRateCardDocument(data.rate_card, currentRateCard);
        queryClient.setQueryData(rateCardKeys.byOrg(orgId), nextDocument);
        queryClient.setQueryData(
          ['rate-card-entries', orgId],
          flattenRateCard(nextDocument, orgId)
        );
      } else {
        queryClient.invalidateQueries({ queryKey: rateCardKeys.byOrg(orgId) });
      }

      toast.success(
        `Imported ${data.summary.imported_entries} rate card ${data.summary.imported_entries === 1 ? 'entry' : 'entries'}`
      );
    },
    onError: (error) => {
      console.error('Error importing rate card:', error);
      toast.error(error.message || 'Failed to import rate card');
    },
  });
};

/**
 * Rate Card Store – Aligned with FastAPI Schema
 * GET: Returns Record<string, RateCardEntry[]> (master_gauge_id -> entries[])
 * PATCH: Requires metadata + rate_card: Record<string, RateCardEntry[]>
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { ApiError } from '../services/apiService';
import { RateCardEntry } from '../types/types';
import { apiClient } from "../services/api";

// ======================
// TYPES
// ======================

export interface RateCardEntryWithId extends RateCardEntry {
    id: string;
    gauge_id?: string; // master_gauge_id
    gauge_name?: string;
}

// API Response format: Record<master_gauge_id, RateCardEntry[]>
type RateCardApiResponse = Record<string, RateCardEntry[]>;

// PATCH Payload format: only rate_card object
interface RateCardPatchPayload {
    rate_card: RateCardApiResponse;
}

interface RateCardState {
    rateCards: Record<string, RateCardApiResponse>; // orgId -> RateCardApiResponse
    flattenedEntries: Record<string, RateCardEntryWithId[]>; // orgId -> flattened entries for UI
    loading: Record<string, boolean>;
    errors: Record<string, string | null>;

    fetchRateCard: (orgId: string) => Promise<void>;
    addEntry: (orgId: string, entry: RateCardEntryWithId) => Promise<boolean>;
    updateEntry: (orgId: string, entry: RateCardEntryWithId) => Promise<boolean>;
    deleteEntry: (orgId: string, entryId: string) => Promise<boolean>;
    clearError: (orgId: string) => void;
}

// ======================
// HELPERS
// ======================

/**
 * Transform API response (Record<master_gauge_id, RateCardEntry[]>) to flattened entries for UI
 */
const flattenRateCard = (rateCard: RateCardApiResponse, orgId: string): RateCardEntryWithId[] => {
    const flattened: RateCardEntryWithId[] = [];
    
    Object.entries(rateCard).forEach(([masterGaugeId, entries]) => {
        entries.forEach((entry, index) => {
            flattened.push({
                ...entry,
                id: `${orgId}_${masterGaugeId}_${index}`,
                gauge_id: masterGaugeId,
            });
        });
    });
    
    return flattened;
};

/**
 * Transform flattened entries back to API format (Record<master_gauge_id, RateCardEntry[]>)
 */
const unflattenRateCard = (entries: RateCardEntryWithId[]): RateCardApiResponse => {
    const rateCard: RateCardApiResponse = {};
    
    entries.forEach((entry) => {
        const masterGaugeId = entry.gauge_id || '';
        if (!masterGaugeId) return;
        
        if (!rateCard[masterGaugeId]) {
            rateCard[masterGaugeId] = [];
        }
        
        // Remove UI-only fields before adding to API format
        const { id, gauge_id, gauge_name, ...apiEntry } = entry;
        
        // Ensure numeric fields are numbers
        const range = apiEntry.range || { min: 0, max: 0 };
        const normalizedEntry: RateCardEntry = {
            ...apiEntry,
            range: {
                min: typeof range.min === 'number' ? range.min : parseFloat(String(range.min)) || 0,
                max: typeof range.max === 'number' ? range.max : parseFloat(String(range.max)) || 0,
            },
            rate: typeof apiEntry.rate === 'number' ? apiEntry.rate : parseFloat(String(apiEntry.rate)) || 0,
            discount: typeof apiEntry.discount === 'number' ? apiEntry.discount : parseFloat(String(apiEntry.discount)) || 0,
            basic_size: typeof apiEntry.basic_size === 'number' ? apiEntry.basic_size : (apiEntry.basic_size ? parseFloat(String(apiEntry.basic_size)) : 0),
            range_unit: apiEntry.range_unit || apiEntry.unit || '',
        };
        
        rateCard[masterGaugeId].push(normalizedEntry);
    });
    
    return rateCard;
};


// ======================
// STORE
// ======================

export const useRateCardStore = create<RateCardState>()(
    devtools(
        immer((set, get) => ({
            rateCards: {},
            flattenedEntries: {},
            loading: {},
            errors: {},

            fetchRateCard: async (orgId) => {
                if (get().loading[orgId]) return;

                set((s) => {
                    s.loading[orgId] = true;
                    s.errors[orgId] = null;
                });

                try {
                    const res = await apiClient.getApiResponse<RateCardApiResponse>(`/organization/${orgId}/rate-card`);

                    // GET returns Record<string, RateCardEntry[]> directly
                    // Handle different response structures:
                    // 1. Direct: { "gauge-123": [...] }
                    // 2. Wrapped: { data: { "gauge-123": [...] } }
                    // 3. Nested: { data: { rate_card: { "gauge-123": [...] } } }
                    let rateCard: RateCardApiResponse = {};
                    
                    if (res) {
                        if (res.data) {
                            // Check if nested in rate_card property
                            const data = res.data as any;
                            rateCard = data.rate_card || data;
                        } else {
                            // Direct response (shouldn't happen with getApiResponse, but handle it)
                            rateCard = (res as unknown as RateCardApiResponse) || {};
                        }
                    }
                    
                    // Ensure it's an object (not array or null)
                    if (!rateCard || Array.isArray(rateCard)) {
                        rateCard = {};
                    }

                    set((s) => {
                        s.rateCards[orgId] = rateCard;
                        s.flattenedEntries[orgId] = flattenRateCard(rateCard, orgId);
                        s.loading[orgId] = false;
                    });
                } catch (e) {
                    set((s) => {
                        s.loading[orgId] = false;
                        s.errors[orgId] =
                            e instanceof ApiError ? e.message : 'Failed to fetch rate card';
                    });
                }
            },

            addEntry: async (orgId, entry) => {
                // Add entry to current flattened entries, then update
                const current = get().flattenedEntries[orgId] || [];
                const entryWithId: RateCardEntryWithId = {
                    ...entry,
                    id: entry.id || `${orgId}_${entry.gauge_id}_${Date.now()}`,
                };
                const updated = [...current, entryWithId];
                
                // Convert to API format
                const rateCard = unflattenRateCard(updated);
        
                try {
                    const response = await apiClient.patchApiResponse<RateCardApiResponse>(
                        `/organization/${orgId}/rate-card`,
                        rateCard
                    );

                    // PATCH response may return rate_card directly or wrapped
                    let updatedRateCard: RateCardApiResponse = {};
                    if (response) {
                        if (response) {
                            const data = response as any;
                            updatedRateCard = data.rate_card || data;
                        } else {
                            updatedRateCard = (response as unknown as RateCardApiResponse) || {};
                        }
                    }
                    if (!updatedRateCard || Array.isArray(updatedRateCard)) {
                        updatedRateCard = {};
                    }

                    set((s) => {
                        s.rateCards[orgId] = updatedRateCard;
                        s.flattenedEntries[orgId] = flattenRateCard(updatedRateCard, orgId);
                    });
                    return true;
                } catch {
                    return false;
                }
            },

            updateEntry: async (orgId, entry) => {
                const current = get().flattenedEntries[orgId] || [];
                
                // Update entry in flattened list
                const updated = current.map((e) => 
                    e.id === entry.id ? { ...entry, id: entry.id } : e
                );
                
                // Convert to API format
                const rateCard = unflattenRateCard(updated);
                
                // Build PATCH payload (only rate_card object)
                const payload: RateCardPatchPayload = {
                    rate_card: rateCard,
                };

                try {
                    const response = await apiClient.patchApiResponse<RateCardApiResponse>(
                        `/organization/${orgId}/rate-card`,
                        payload
                    );

                    // PATCH response may return rate_card directly or wrapped
                    let updatedRateCard: RateCardApiResponse = {};
                    if (response) {
                        if (response) {
                            const data = response as any;
                            updatedRateCard = data.rate_card || data;
                        } else {
                            updatedRateCard = (response as unknown as RateCardApiResponse) || {};
                        }
                    }
                    if (!updatedRateCard || Array.isArray(updatedRateCard)) {
                        updatedRateCard = {};
                    }

                    set((s) => {
                        s.rateCards[orgId] = updatedRateCard;
                        s.flattenedEntries[orgId] = flattenRateCard(updatedRateCard, orgId);
                    });
                    return true;
                } catch {
                    return false;
                }
            },

            deleteEntry: async (orgId, entryId) => {
                const current = get().flattenedEntries[orgId] || [];
                const updated = current.filter((e) => e.id !== entryId);
                
                // Convert to API format
                const rateCard = unflattenRateCard(updated);
                
                // Build PATCH payload (only rate_card object)
                const payload: RateCardPatchPayload = {
                    rate_card: rateCard,
                };

                try {
                    const response = await apiClient.patchApiResponse<RateCardApiResponse>(
                        `/organization/${orgId}/rate-card`,
                        payload
                    );

                    const updatedRateCard: RateCardApiResponse = response?.data || response || {};

                    set((s) => {
                        s.rateCards[orgId] = updatedRateCard;
                        s.flattenedEntries[orgId] = flattenRateCard(updatedRateCard, orgId);
                    });
                    return true;
                } catch {
                    return false;
                }
            },

            clearError: (orgId) =>
                set((s) => {
                    s.errors[orgId] = null;
                }),
        }))
    )
);

// ======================
// HOOK
// ======================

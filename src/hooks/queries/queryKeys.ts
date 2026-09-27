/**
 * TanStack Query Key Factory
 * Centralized query key management for consistent cache invalidation
 */

export const queryKeys = {
  // Organizations
  organizations: {
    all: ['organizations'] as const,
    lists: () => [...queryKeys.organizations.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.organizations.lists(), { filters }] as const,
    details: () => [...queryKeys.organizations.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.organizations.details(), id] as const,
  },

  accountDetails: {
    all: ['accountDetails'] as const,
    lists: () => [...queryKeys.accountDetails.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.accountDetails.lists(), { filters }] as const,
    details: () => [...queryKeys.accountDetails.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.accountDetails.details(), id] as const,
  },

  notifications: {
    all: ['notifications'] as const,
    settingsList: () => [...queryKeys.notifications.all, 'settings'] as const,
    settings: (organizationId: string) =>
      [...queryKeys.notifications.settingsList(), organizationId] as const,
    admin: (filters?: Record<string, unknown>) =>
      [...queryKeys.notifications.all, 'admin', { filters }] as const,
  },

  // Inward Entries
  inwards: {
    all: ['inwards'] as const,
    lists: () => [...queryKeys.inwards.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.inwards.lists(), { filters }] as const,
    details: () => [...queryKeys.inwards.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.inwards.details(), id] as const,
  },

  // Gauges
  gauges: {
    all: ['gauges'] as const,
    lists: () => [...queryKeys.gauges.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.gauges.lists(), { filters }] as const,
    byInward: (inwardId: string) => 
      [...queryKeys.gauges.all, 'by-inward', inwardId] as const,
    details: () => [...queryKeys.gauges.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.gauges.details(), id] as const,
    byInwardAndGauge: (inwardId: string, gaugeId: string) =>
      [...queryKeys.gauges.all, 'by-inward-gauge', inwardId, gaugeId] as const,
  },

  // Certificate Types
  certificateTypes: {
    all: ['certificateTypes'] as const,
    lists: () => [...queryKeys.certificateTypes.all, 'list'] as const,
    list: () => [...queryKeys.certificateTypes.lists()] as const,
    details: () => [...queryKeys.certificateTypes.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.certificateTypes.details(), id] as const,
  },

  // Gauge Masters
  gaugeMasters: {
    all: ['gaugeMasters'] as const,
    lists: () => [...queryKeys.gaugeMasters.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.gaugeMasters.lists(), { filters }] as const,
    details: () => [...queryKeys.gaugeMasters.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.gaugeMasters.details(), id] as const,
  },

  // Equipments
  equipments: {
    all: ['equipments'] as const,
    lists: () => [...queryKeys.equipments.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.equipments.lists(), { filters }] as const,
    details: () => [...queryKeys.equipments.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.equipments.details(), id] as const,
  },

  // Equipment Histories
  equipmentHistories: {
    all: ['equipmentHistories'] as const,
    lists: () => [...queryKeys.equipmentHistories.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.equipmentHistories.lists(), { filters }] as const,
    details: () => [...queryKeys.equipmentHistories.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.equipmentHistories.details(), id] as const,
  },

  // Format Numbers
  formatNumbers: {
    all: ['formatNumbers'] as const,
    lists: () => [...queryKeys.formatNumbers.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.formatNumbers.lists(), { filters }] as const,
    details: () => [...queryKeys.formatNumbers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.formatNumbers.details(), id] as const,
  },

  // Scope Masters
  scopeMasters: {
    all: ['scopeMasters'] as const,
    lists: () => [...queryKeys.scopeMasters.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.scopeMasters.lists(), { filters }] as const,
    details: () => [...queryKeys.scopeMasters.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.scopeMasters.details(), id] as const,
  },

  // Reading Masters
  readingMasters: {
    all: ['readingMasters'] as const,
    lists: () => [...queryKeys.readingMasters.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.readingMasters.lists(), { filters }] as const,
    details: () => [...queryKeys.readingMasters.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.readingMasters.details(), id] as const,
    byGauge: (gaugeId: string) => 
      [...queryKeys.readingMasters.all, 'by-gauge', gaugeId] as const,
  },

  surfacePlateReferenceStandards: {
    all: ['surfacePlateReferenceStandards'] as const,
    lists: () => [...queryKeys.surfacePlateReferenceStandards.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.surfacePlateReferenceStandards.lists(), { filters }] as const,
    details: () => [...queryKeys.surfacePlateReferenceStandards.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.surfacePlateReferenceStandards.details(), id] as const,
    tolerance: (filters?: Record<string, unknown>) =>
      [...queryKeys.surfacePlateReferenceStandards.all, 'tolerance', { filters }] as const,
  },

  // Thread Ring Plugs
  threadRingPlugs: {
    all: ['threadRingPlugs'] as const,
    lists: () => [...queryKeys.threadRingPlugs.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.threadRingPlugs.lists(), { filters }] as const,
    infinite: (filters?: Record<string, unknown>) =>
      [...queryKeys.threadRingPlugs.all, 'infinite', { filters }] as const,
    search: (term: string) =>
      [...queryKeys.threadRingPlugs.all, 'search', term] as const,
    details: () => [...queryKeys.threadRingPlugs.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.threadRingPlugs.details(), id] as const,
  },

  // Taper Thread Readings
  taperThreadReadings: {
    all: ['taperThreadReadings'] as const,
    lists: () => [...queryKeys.taperThreadReadings.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.taperThreadReadings.lists(), { filters }] as const,
    details: () => [...queryKeys.taperThreadReadings.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.taperThreadReadings.details(), id] as const,
  },

  // Outward Entries
  outwards: {
    all: ['outwards'] as const,
    lists: () => [...queryKeys.outwards.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) => 
      [...queryKeys.outwards.lists(), { filters }] as const,
    details: () => [...queryKeys.outwards.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.outwards.details(), id] as const,
  },

  // Invoices
  invoices: {
    all: ['invoices'] as const,
    lists: () => [...queryKeys.invoices.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.invoices.lists(), { filters }] as const,
    details: () => [...queryKeys.invoices.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.invoices.details(), id] as const,
    drafts: () => [...queryKeys.invoices.all, 'draft'] as const,
    draft: (clientOrgId: string, outwardId: string) =>
      [...queryKeys.invoices.drafts(), clientOrgId, outwardId] as const,
  },

  quotations: {
    all: ['quotations'] as const,
    lists: () => [...queryKeys.quotations.all, 'list'] as const,
    list: (params?: { page?: number; limit?: number }) =>
      [...queryKeys.quotations.lists(), params ?? {}] as const,
    details: () => [...queryKeys.quotations.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.quotations.details(), id] as const,
    revisions: (id: string) => [...queryKeys.quotations.all, 'revisions', id] as const,
  },

  // Repairs
  repairs: {
    all: ['repairs'] as const,
    lists: () => [...queryKeys.repairs.all, 'list'] as const,
    list: (filters?: Record<string, unknown>) =>
      [...queryKeys.repairs.lists(), { filters }] as const,
    details: () => [...queryKeys.repairs.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.repairs.details(), id] as const,
  },
} as const;

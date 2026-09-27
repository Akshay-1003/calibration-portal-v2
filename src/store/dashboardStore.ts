/**
 * Dashboard Store
 * Provides real-time dashboard data with proper state management and reporting
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';
import { useAppStore } from './appStore';

export interface CompanyDashboardData {
  companyId: string;
  companyName: string;
  totalInwards: number;
  totalGauges: number;
  gaugesByStatus: {
    pending: number;
    in_progress: number;
    completed: number;
    on_hold: number;
  };
  gauges: Array<{
    id: string;
    gaugeId: string;
    inwardId: string;
    name: string;
    identificationNumber: string;
    status: string;
    inwardDate: string;
    createdAt: string;
  }>;
}

export interface DashboardReport {
  period: 'day' | 'week' | 'month' | 'year';
  startDate: Date;
  endDate: Date;
  totalInwards: number;
  totalGauges: number;
  totalCertificates: number;
  companies: CompanyDashboardData[];
  statusBreakdown: {
    pending: number;
    in_progress: number;
    completed: number;
    on_hold: number;
  };
}

interface DashboardState {
  // Actions
  refreshDashboard: () => Promise<void>;
  getCompanyReport: (companyId: string, period: 'day' | 'week' | 'month' | 'year', organizations: any[], inwardEntries: any[], linkedGauges: any[]) => CompanyDashboardData | null;
  getPeriodReport: (period: 'day' | 'week' | 'month' | 'year', organizations: any[], inwardEntries: any[], linkedGauges: any[]) => DashboardReport;
  subscribeToUpdates: () => () => void; // Returns unsubscribe function (no-op, hooks handle reactivity)
}

export const useDashboardStore = create<DashboardState>()(
  devtools(
    immer((set, get) => {
      void set;
      void get;
      return {
        // Refresh dashboard data
        refreshDashboard: async () => {
          try {
            const appStore = useAppStore.getState();
            void appStore;
            await Promise.all([
              // appStore.actions.fetchOrganizations(true),
              // appStore.actions.fetchInwardEntries(true),
              // appStore.actions.fetchLinkedGauges(true),
            ]);
          } catch (error) {
            console.error('Error refreshing dashboard:', error);
            throw error;
          }
        },

        // Get company-specific report - pure function, no state updates
        // Uses gauge status (inward_received, calibration_completed) instead of certificates
        getCompanyReport: (companyId: string, period: 'day' | 'week' | 'month' | 'year', organizations: any[], inwardEntries: any[], linkedGauges: any[]) => {
          const periodStart = getPeriodStart(period);
          
          const company = organizations.find(org => org.id === companyId);
          if (!company) return null;

          const companyInwards = inwardEntries.filter(entry => {
            const entryDate = new Date(entry.created_at);
            return entry.client_org_id === companyId && entryDate >= periodStart;
          });

          const companyGauges = linkedGauges.filter(gauge => {
            const gaugeDate = new Date(gauge.created_at);
            return gauge.client_org_id === companyId && gaugeDate >= periodStart;
          });

          const gaugesByStatus = companyGauges.reduce((acc, gauge) => {
            const status = gauge.process_status || gauge.status || 'pending';
            acc[status as keyof typeof acc] = (acc[status as keyof typeof acc] || 0) + 1;
            return acc;
          }, {
            pending: 0,
            in_progress: 0,
            completed: 0,
            on_hold: 0,
          } as Record<string, number>);

          return {
            companyId: company.id,
            companyName: company.name,
            totalInwards: companyInwards.length,
            totalGauges: companyGauges.length,
            gaugesByStatus: {
              pending: gaugesByStatus.pending || gaugesByStatus.inward_received || 0,
              in_progress: gaugesByStatus.in_progress || 0,
              completed: gaugesByStatus.completed || gaugesByStatus.calibration_completed || 0,
              on_hold: gaugesByStatus.on_hold || 0,
            },
            gauges: companyGauges.map(gauge => ({
              id: gauge.id,
              gaugeId: gauge.gauge_id || gauge.id,
              inwardId: gauge.inward_id,
              name: gauge.master_gauge_name || gauge.name || 'Unknown',
              identificationNumber: gauge.identification_number || '',
              status: gauge.process_status || gauge.status || 'pending',
              inwardDate: gauge.inward_date || gauge.inward_info?.inward_date || gauge.created_at,
              createdAt: gauge.created_at,
            })),
          };
        },

        // Get period report - pure function, no state updates
        // Uses gauge status (inward_received, calibration_completed) instead of certificates
        getPeriodReport: (period: 'day' | 'week' | 'month' | 'year', organizations: any[], inwardEntries: any[], linkedGauges: any[]) => {
          const periodStart = getPeriodStart(period);
          const now = new Date();
          
          // Filter inwards by date
          const filteredInwards = inwardEntries.filter(entry => {
            const entryDate = new Date(entry.created_at || entry.inward_date);
            return entryDate >= periodStart;
          });

          // Filter gauges by date - check created_at or inward_date
          const filteredGauges = linkedGauges.filter(gauge => {
            const gaugeDate = new Date(gauge.created_at || gauge.inward_date || gauge.inward_info?.inward_date);
            return gaugeDate >= periodStart;
          });

          // Calculate completed certificates from gauge status
          const completedGauges = filteredGauges.filter(gauge => {
            const status = gauge.status || gauge.process_status || '';
            return status === 'calibration_completed' || status === 'calibration_complete' || status === 'completed';
          });

          // Group by company
          const companyMap = new Map<string, CompanyDashboardData>();
          
          organizations.forEach(org => {
            const companyInwards = filteredInwards.filter(entry => entry.client_org_id === org.id);
            const companyGauges = filteredGauges.filter(gauge => gauge.client_org_id === org.id);
            
            const gaugesByStatus = companyGauges.reduce((acc, gauge) => {
              const status = gauge.process_status || gauge.status || 'pending';
              acc[status as keyof typeof acc] = (acc[status as keyof typeof acc] || 0) + 1;
              return acc;
            }, {
              pending: 0,
              in_progress: 0,
              completed: 0,
              on_hold: 0,
            } as Record<string, number>);

            if (companyInwards.length > 0 || companyGauges.length > 0) {
              companyMap.set(org.id, {
                companyId: org.id,
                companyName: org.name,
                totalInwards: companyInwards.length,
                totalGauges: companyGauges.length,
                gaugesByStatus: {
                  pending: gaugesByStatus.pending || gaugesByStatus.inward_received || 0,
                  in_progress: gaugesByStatus.in_progress || 0,
                  completed: gaugesByStatus.completed || gaugesByStatus.calibration_completed || 0,
                  on_hold: gaugesByStatus.on_hold || 0,
                },
                gauges: companyGauges.map(gauge => ({
                  id: gauge.id,
                  gaugeId: gauge.gauge_id || gauge.id,
                  inwardId: gauge.inward_id,
                  name: gauge.master_gauge_name || gauge.name || 'Unknown',
                  identificationNumber: gauge.identification_number || '',
                  status: gauge.process_status || gauge.status || 'pending',
                  inwardDate: gauge.inward_date || gauge.inward_info?.inward_date || gauge.created_at,
                  createdAt: gauge.created_at,
                })),
              });
            }
          });

          const statusBreakdown = filteredGauges.reduce((acc, gauge) => {
            const status = gauge.process_status || gauge.status || 'pending';
            const normalizedStatus = 
              status === 'inward_received' ? 'pending' :
              status === 'calibration_completed' ? 'completed' :
              status;
            acc[normalizedStatus as keyof typeof acc] = (acc[normalizedStatus as keyof typeof acc] || 0) + 1;
            return acc;
          }, {
            pending: 0,
            in_progress: 0,
            completed: 0,
            on_hold: 0,
          } as Record<string, number>);

          const report: DashboardReport = {
            period,
            startDate: periodStart,
            endDate: now,
            totalInwards: filteredInwards.length,
            totalGauges: filteredGauges.length,
            totalCertificates: completedGauges.length, // Completed gauges count
            companies: Array.from(companyMap.values()),
            statusBreakdown: {
              pending: statusBreakdown.pending || 0,
              in_progress: statusBreakdown.in_progress || 0,
              completed: statusBreakdown.completed || 0,
              on_hold: statusBreakdown.on_hold || 0,
            },
          };

          // Don't update state during render - this is a pure getter function
          // The report is computed on-demand and doesn't need to be stored
          return report;
        },

        // Subscribe to store updates for real-time synchronization
        // Note: This is a no-op now - we use hooks directly in components for reactivity
        // Keeping for API compatibility but subscriptions are handled by Zustand hooks
        subscribeToUpdates: () => {
          // No-op - Zustand hooks handle reactivity automatically
          // Components using useAppStore hooks will automatically re-render on state changes
          return () => {
            // Cleanup function (no-op)
          };
        },
      };
    }),
    { name: 'dashboard-store' }
  )
);

// Helper function to get period start date
function getPeriodStart(period: 'day' | 'week' | 'month' | 'year'): Date {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (period) {
    case 'day':
      return today;
    case 'week':
      return new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'year':
      return new Date(now.getFullYear(), 0, 1);
    default:
      return new Date(0);
  }
}

import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  mapRepairApiToRepairEntry,
  mapRepairDraftToCreatePayload,
  useUpdateRepairItemMutation,
} from '../hooks/queries/repairs';
import { apiClient } from '../services/api';
import { RepairDraftForm } from '../components/form/RepairDraftForm';
import type { RepairItem } from '../types/repair';

afterEach(() => vi.restoreAllMocks());

describe('V2 repair workflow', () => {
  it('renders the HeroUI v3 repair draft form', () => {
    render(
      <RepairDraftForm
        organizations={[{ id: 'client-1', name: 'Client One' }]}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText('Create Repair Draft')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Draft' })).toBeInTheDocument();
  });

  it('maps multi-item repair records for the management table', () => {
    const entry = mapRepairApiToRepairEntry({
      id: 'repair-1',
      repair_no: '26-27/0005',
      repair_date: '2026-10-29',
      client_org_id: 'client-1',
      status: 'repair_in_progress',
      estimated_cost: 450,
      items: [{
        item_id: 'item-1',
        source: 'direct',
        manual_item_name: 'Plunger Dial',
        gauge_type: 'Plunger Dial',
        specifications: { description: '0.01-10mm' },
        repair_type: 'repair_and_calibration',
        repair_description: 'Service dial',
        status: 'pending',
        estimated_cost: 450,
        repair_charge: 450,
        additional_service_charges: 0,
      }],
    }, 'Client One');

    expect(entry).toMatchObject({
      repair_no: '26-27/0005',
      client_org_name: 'Client One',
      gauge_type: 'Plunger Dial',
      repair_type: 'repair_and_calibration',
      repair_status: 'repair_in_progress',
      item_count: 1,
    });
  });

  it('maps the initial form to a backend repair draft', () => {
    expect(mapRepairDraftToCreatePayload({
      repair_date: '2026-10-29',
      client_org_id: 'client-1',
      technician_name: ' Akshay ',
      estimated_completion_date: '',
      repair_status: 'pending',
    })).toEqual({
      repair_date: '2026-10-29',
      client_org_id: 'client-1',
      repaired_by: 'Akshay',
      estimated_date_of_completion: undefined,
      status: 'draft',
    });
  });

  it('updates an existing item through the repair item endpoint', async () => {
    const item: Omit<RepairItem, 'item_id'> = {
      source: 'direct',
      manual_item_name: 'Plunger Dial',
      gauge_type: 'Plunger Dial',
      specifications: { description: '0.01-10mm' },
      repair_type: 'repair_only',
      repair_description: 'Replace spring',
      status: 'pending',
      estimated_cost: 250,
      repair_charge: 250,
      additional_service_charges: 0,
    };
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({ id: 'repair-1', items: [] });
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useUpdateRepairItemMutation(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ repairId: 'repair-1', itemId: 'item-1', item });
    });

    expect(patch).toHaveBeenCalledWith('/gauge/repair/repair-1/items/item-1', item);
    client.clear();
  });
});

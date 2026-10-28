import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { apiClient } from '../services/api';
import { fetchRateCard } from '../services/apiServices';
import { rateCardKeys, useUpdateGaugeRates } from '../hooks/useRateCard';

const rows = [1, 2].map((number, index) => ({
  id: `row-${number}`, price_list_item_id: `row-${number}`, gauge_id: 'plug',
  range: { min: index ? 50 : 1, max: index ? 100 : 50 }, range_unit: 'mm',
  rate_type: 'discounted', rate: index ? 140 : 120, discount: 5, unit: 'rs/unit', description: '',
}));
const card = { plug: rows, other: [{ ...rows[0], price_list_item_id: 'other' }] };
afterEach(() => vi.restoreAllMocks());

it('drops retired PDF metadata while reading an older response', async () => {
  vi.spyOn(apiClient, 'getApiResponse').mockResolvedValue({ data: { rate_card: card, price_list: 'reference.pdf' } });
  expect(await fetchRateCard('customer')).toEqual(card);
});

it('sends one gauge-only PATCH for all edited ranges and retains other gauges in the cache', async () => {
  vi.spyOn(apiClient, 'getApiResponse').mockResolvedValue({ data: { rate_card: card, price_list: 'reference.pdf' } });
  const updated = rows.map(row => ({ ...row, rate: row.rate + 10 }));
  const patch = vi.spyOn(apiClient, 'patchApiResponse').mockResolvedValue({ data: { rate_card: { plug: updated } } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => useUpdateGaugeRates('customer'), { wrapper });
  await act(async () => { await result.current.mutateAsync({ original: rows, entries: updated }); });
  expect(patch).toHaveBeenCalledTimes(1);
  expect(patch).toHaveBeenCalledWith('/organization/customer/rate-card', { plug: updated });
  expect(client.getQueryData(rateCardKeys.byOrg('customer'))).toEqual({ plug: updated, other: card.other });
  client.clear();
});

it('does not send a PATCH when another editor has changed a rate', async () => {
  vi.spyOn(apiClient, 'getApiResponse').mockResolvedValue({ data: { rate_card: { ...card, plug: [{ ...rows[0], rate: 999 }, rows[1]] } } });
  const patch = vi.spyOn(apiClient, 'patchApiResponse');
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => useUpdateGaugeRates('customer'), { wrapper });
  await act(async () => { await expect(result.current.mutateAsync({ original: rows, entries: rows })).rejects.toThrow('Rates changed'); });
  expect(patch).not.toHaveBeenCalled();
  client.clear();
});

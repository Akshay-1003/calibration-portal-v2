import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../services/api';

describe('PO batch allocation errors', () => {
  beforeEach(() => vi.mocked(fetch).mockReset());

  it('preserves unresolved items from a 422 response for the invoice form', async () => {
    const unresolved = [{
      source_key: 'inward:gauge-1',
      label: 'Gauge 1',
      source: 'Outward 15863',
      reason: 'The matching Rate Card row has no active PO',
      options: [],
    }];
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Content',
      text: async () => JSON.stringify({ detail: { message: '1 selected item needs PO allocation.', unresolved } }),
    } as Response);

    await expect(apiClient.postApiResponse('/invoice/batches', {})).rejects.toMatchObject({
      status: 422,
      message: '1 selected item needs PO allocation.',
      details: { response: { detail: { unresolved } } },
    });
  });
});

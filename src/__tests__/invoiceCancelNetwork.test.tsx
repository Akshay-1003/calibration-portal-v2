import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCancelInvoiceMutation } from '../hooks/queries/invoices';
import { apiClient } from '../services/api';

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
);

const invoiceResponse = (status: string) => ({
  ok: true,
  status: 200,
  headers: new Headers({ 'content-type': 'application/json' }),
  json: async () => ({ id: 'test-id', invoice_number: 'INV-1', status }),
} as Response);

describe('invoice cancellation network errors', () => {
  beforeEach(() => vi.mocked(fetch).mockReset());

  it('does not label an uninformative fetch failure as CORS', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(apiClient.patchApiResponse('/invoice/test-id/cancel', { remarks: null }))
      .rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });

  it('confirms cancellation with a fresh read after a lost response', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    vi.mocked(fetch).mockResolvedValueOnce(invoiceResponse('cancelled'));
    const { result } = renderHook(() => useCancelInvoiceMutation(), { wrapper });

    await act(async () => {
      const invoice = await result.current.mutateAsync({ invoiceId: 'test-id' });
      expect(invoice.status).toBe('cancelled');
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fetch).mock.calls[1][1]).toMatchObject({ method: 'GET' });
  });

  it('keeps cancellation unconfirmed when the invoice is still generated', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    vi.mocked(fetch).mockResolvedValueOnce(invoiceResponse('generated'));
    const { result } = renderHook(() => useCancelInvoiceMutation(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({ invoiceId: 'test-id' }))
        .rejects.toMatchObject({ code: 'CANCEL_NOT_APPLIED' });
    });
  });
});

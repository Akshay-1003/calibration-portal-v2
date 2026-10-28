import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { InvoiceEditor } from '../pages/billing/invoice/edit';
import type { InvoiceBillingTableRow } from '../components/billing/invoiceItemTableShared';
import type { InvoiceRateCardEntriesByGauge } from '../utils/rateCardLookup';

const state = vi.hoisted(() => ({
  invoice: undefined as ReturnType<typeof makeInvoice> | undefined,
  rates: {} as InvoiceRateCardEntriesByGauge,
  fetchSpecification: vi.fn(),
}));

vi.mock('../hooks/queries/invoices', () => ({
  useInvoiceDetailQuery: () => ({ data: state.invoice, isLoading: !state.invoice }),
  useUpdateInvoiceMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useGenerateInvoiceMutation: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('../hooks/queries/organizations', () => ({
  useOrganizationsQuery: () => ({ data: { organizations: [] } }),
}));
vi.mock('../hooks/queries/accountDetails', () => ({ useAccountDetailQuery: () => ({}) }));
vi.mock('../hooks/useRateCard', () => ({
  useRateCard: () => ({ data: state.rates, isSuccess: true }),
}));
vi.mock('../services/threadRingPlugSpecifications', () => ({
  fetchThreadRingPlugById: (id: string) => state.fetchSpecification(id),
}));
vi.mock('../components/billing/InvoiceItemsBillingTable', () => ({
  default: ({ rows, onRateChange }: {
    rows: InvoiceBillingTableRow[];
    onRateChange: (index: number, id: string, value: string) => void;
  }) => <div>{rows.map((row) => <div key={row.gaugeIndex}>
    <input aria-label={`Rate ${row.gaugeIndex}`} value={row.itemData.hsnEntries[0].rate}
      onChange={(event) => onRateChange(row.gaugeIndex, row.itemData.hsnEntries[0].id, event.target.value)} />
    <output data-testid={`amount-${row.gaugeIndex}`}>{row.amount}</output>
  </div>)}</div>,
}));

function makeInvoice(status = 'draft', rate = 0, specifications: Record<string, unknown> = { basic_size: 68.0175 }) {
  return {
    id: 'invoice-1', status, client_org_id: 'customer-1', billing_date: '2026-10-28',
    invoice_details: {
      billing_items: [{
        gauge_id: 'physical-gauge', master_gauge_id: 'ring-master', inward_id: 'inward-1',
        price_list_item_id: undefined as string | undefined,
        master_gauge_name: 'Ring Gauge', specifications,
        billing_components: [{ process: 'calibration', rate, quantity: 3 }],
      }],
    },
  };
}

const rates: InvoiceRateCardEntriesByGauge = {
  'ring-master': [{ rate_type: 'discounted', range: { min: 50, max: 100 }, basic_size: 0, rate: 200, discount: 5 }],
};

function mountEditor() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ui = () => <QueryClientProvider client={client}><MemoryRouter>
    <InvoiceEditor invoiceId="invoice-1" />
  </MemoryRouter></QueryClientProvider>;
  const result = render(ui());
  return () => result.rerender(ui());
}

beforeAll(() => {
  class Observer { observe() {} unobserve() {} disconnect() {} }
  vi.stubGlobal('ResizeObserver', Observer);
  vi.stubGlobal('IntersectionObserver', Observer);
});
beforeEach(() => {
  state.invoice = undefined;
  state.rates = {};
  state.fetchSpecification.mockReset();
});

describe('invoice Rate Card autofill', () => {
  it('retains the assigned PO price-list ID when hydrating invoice items', async () => {
    state.invoice = makeInvoice();
    state.invoice.invoice_details.billing_items[0].price_list_item_id = 'assigned-rate';
    state.rates = { 'ring-master': [
      { price_list_item_id: 'other-rate', range: { min: 50, max: 100 }, rate: 100 },
      { price_list_item_id: 'assigned-rate', range: { min: 50, max: 100 }, rate: 200 },
    ] };
    mountEditor();
    await waitFor(() => expect(screen.getByLabelText('Rate 0')).toHaveValue('200'));
  });

  it('preserves a saved nonzero invoice rate', async () => {
    state.invoice = makeInvoice('draft', 175);
    state.rates = rates;
    mountEditor();
    await waitFor(() => expect(screen.getByLabelText('Rate 0')).toHaveValue('175'));
    expect(screen.getByTestId('amount-0')).toHaveTextContent('525');
  });

  it('keeps return-as-is lines unpriced', async () => {
    state.invoice = makeInvoice();
    state.invoice.invoice_details.billing_items[0].billing_components[0].process = 'return_as_is';
    state.rates = rates;
    mountEditor();
    await waitFor(() => expect(screen.getByLabelText('Rate 0')).toHaveValue('0'));
    expect(screen.getByTestId('amount-0')).toHaveTextContent('0');
  });

  it('maps cached rates after invoice hydration and applies the entered quantity', async () => {
    state.rates = rates;
    const refresh = mountEditor();
    state.invoice = makeInvoice();
    refresh();
    await waitFor(() => expect(screen.getByLabelText('Rate 0')).toHaveValue('190'));
    expect(screen.getByTestId('amount-0')).toHaveTextContent('570');
  });

  it('maps rates when the Rate Card arrives after invoice items', async () => {
    state.invoice = makeInvoice();
    const refresh = mountEditor();
    expect(screen.getByLabelText('Rate 0')).toHaveValue('0');
    state.rates = rates;
    refresh();
    await waitFor(() => expect(screen.getByLabelText('Rate 0')).toHaveValue('190'));
  });

  it.each(['77', '0'])('preserves a manually entered rate of %s when rates load', async (rate) => {
    state.invoice = makeInvoice('draft', 10);
    const refresh = mountEditor();
    fireEvent.change(screen.getByLabelText('Rate 0'), { target: { value: rate } });
    state.rates = rates;
    refresh();
    await waitFor(() => expect(screen.getByLabelText('Rate 0')).toHaveValue(rate));
  });

  it.each(['generated', 'paid', 'cancelled'])('does not reprice a %s invoice automatically', async (status) => {
    state.invoice = makeInvoice(status);
    state.rates = rates;
    mountEditor();
    await waitFor(() => expect(screen.getByLabelText('Rate 0')).toHaveValue('0'));
  });

  it('uses the resolved thread specification for pricing as well as display', async () => {
    state.invoice = makeInvoice('draft', 0, { standard_specification_id: 'thread-1' });
    state.rates = { 'ring-master': [{ standard_specification: 'M26 x 1.5 - 6H', rate: 350 }] };
    state.fetchSpecification.mockResolvedValue({ id: 'thread-1', standard_specification: 'M26X1.5-6H' });
    mountEditor();
    await waitFor(() => expect(screen.getByLabelText('Rate 0')).toHaveValue('350'));
    expect(state.fetchSpecification).toHaveBeenCalledTimes(1);
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeAll, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CreateInvoicePage from '../pages/billing/invoice/create';

const { repairs, create } = vi.hoisted(() => ({ repairs: vi.fn(), create: vi.fn() }));
vi.mock('../hooks/queries/organizations', () => ({ useOrganizationsQuery: () => ({ data: { organizations: [{ id: 'customer', name: 'Customer A' }, { id: 'customer-b', name: 'Customer B' }] } }) }));
vi.mock('../hooks/queries/accountDetails', () => ({ useAccountDetailsQuery: () => ({ data: { accountDetails: [] } }) }));
vi.mock('../hooks/queries/outwards', () => ({ useOutwardEntriesQuery: () => ({ data: [] }) }));
vi.mock('../hooks/queries/repairs', () => ({ useClientRepairsQuery: repairs }));
vi.mock('../hooks/queries/invoices', () => ({ useCreateInvoiceMutation: () => ({ mutateAsync: create }) }));
vi.mock('../hooks/queries/poInvoicing', () => ({
  useCustomerPos: () => ({ data: { items: [] } }),
  useCreatePoBatch: () => ({}), useBillingAvailability: () => ({}),
}));
beforeAll(() => {
  class Observer { observe() {} unobserve() {} disconnect() {} }
  vi.stubGlobal('ResizeObserver', Observer);
  vi.stubGlobal('IntersectionObserver', Observer);
  Element.prototype.scrollIntoView = vi.fn();
});

it('loads repairs when the customer changes and searches/selects the matching repair number', async () => {
  repairs.mockImplementation((customerId: string) => ({ isSuccess: true, data: customerId ? [
    { id: 'repair-1', repair_no: 'REP-26001', client_org_id: 'customer' },
    { id: 'repair-2', repair_no: 'REP-26002', client_org_id: 'customer' },
    { id: 'other', repair_no: 'REP-OTHER', client_org_id: 'another-customer' },
  ] : [] }));
  render(<MemoryRouter><CreateInvoicePage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: /Party/ }));
  fireEvent.click(await screen.findByRole('option', { name: 'Customer A' }));
  await waitFor(() => expect(repairs).toHaveBeenLastCalledWith('customer', { enabled: true, limit: 500 }));
  fireEvent.click(screen.getByRole('button', { name: /Repair Numbers/ }));
  const search = await screen.findByRole('searchbox', { name: 'Search repair numbers' });
  fireEvent.change(search, { target: { value: '26002' } });
  await waitFor(() => expect(screen.queryByRole('option', { name: 'REP-26001' })).not.toBeInTheDocument());
  expect(screen.queryByRole('option', { name: 'REP-OTHER' })).not.toBeInTheDocument();
  fireEvent.click(await screen.findByRole('option', { name: 'REP-26002' }));
  expect(await screen.findByRole('button', { name: 'Remove repair repair-2' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Party/ }));
  fireEvent.click(await screen.findByRole('option', { name: 'Customer B' }));
  await waitFor(() => expect(repairs).toHaveBeenLastCalledWith('customer-b', { enabled: true, limit: 500 }));
  expect(screen.queryByRole('button', { name: 'Remove repair repair-2' })).not.toBeInTheDocument();
  expect(screen.getByText('No repairs available for this customer.')).toBeInTheDocument();
});

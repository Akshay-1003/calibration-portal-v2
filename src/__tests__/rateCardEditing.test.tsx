import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeAll, beforeEach, expect, it, vi } from 'vitest';
import { RateCardBulkEditor } from '../components/rate-card/RateCardBulkEditor';
import { RateCardTable } from '../components/Tables/RateCardTable';
import { PoAssignmentPanel } from '../components/rate-card/PoAssignmentPanel';

const { save } = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock('../hooks/queries/poInvoicing', () => ({
  useCustomerPos: () => ({ data: { items: [{ id: 'po-1', po_number: 'PO-100', po_date: '2026-10-28', status: 'active', lines: [{ id: 'line-1', price_list_item_id: 'rate-1', description: 'Plain Plug Gauge: 1–50' }] }] }, isLoading: false }),
  useSaveCustomerPo: () => ({ mutateAsync: save, isPending: false }),
}));
beforeAll(() => {
  class Observer { observe() {} unobserve() {} disconnect() {} }
  vi.stubGlobal('ResizeObserver', Observer);
  vi.stubGlobal('IntersectionObserver', Observer);
  Element.prototype.scrollIntoView = vi.fn();
});
beforeEach(() => save.mockReset().mockResolvedValue({}));
const rows = [1, 2].map((number, index) => ({
  id: `rate-${number}`, price_list_item_id: `rate-${number}`, gauge_id: 'plug', gauge_name: 'Plain Plug Gauge',
  _internalId: `rate-${number}`, _internalGaugeId: 'plug', _internalGaugeName: 'Plain Plug Gauge',
  range: { min: index ? 50 : 1, max: index ? 100 : 50 }, range_unit: 'mm',
  rate_type: 'discounted', rate: index ? 140 : 120, discount: 5, unit: 'rs/unit',
  description: '', standard_specification: 'Calibration', basic_size: 0, least_count: 0.001,
}));

it('shows numeric ranges, without the obsolete columns or overlapping pinned PO cells', () => {
  render(<RateCardTable entries={rows} onEdit={vi.fn()} onDelete={vi.fn()} poLabels={{ 'rate-1': 'PO-100' }} />);
  expect(screen.getByText('1 - 50')).toBeInTheDocument();
  expect(screen.getByText('50 - 100')).toBeInTheDocument();
  expect(screen.queryByRole('columnheader', { name: 'RATE TYPE' })).not.toBeInTheDocument();
  expect(screen.queryByRole('columnheader', { name: 'LEAST COUNT' })).not.toBeInTheDocument();
  expect(screen.getByText('PO-100').closest('td')).not.toHaveClass('sticky');
});
it('edits multiple ranges and preserves their saved identities in one submission', async () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  render(<RateCardBulkEditor entries={rows} saving={false} onSave={onSave} onCancel={vi.fn()} />);
  fireEvent.change(screen.getByLabelText('Rate 1'), { target: { value: '125' } });
  fireEvent.change(screen.getByLabelText('Rate 2'), { target: { value: '145' } });
  fireEvent.change(screen.getByLabelText('Range maximum 2'), { target: { value: '120' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save 2 ranges' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  expect(onSave).toHaveBeenCalledWith([
    expect.objectContaining({ price_list_item_id: 'rate-1', rate: 125 }),
    expect.objectContaining({ price_list_item_id: 'rate-2', rate: 145, range: { min: 50, max: 120 } }),
  ]);
});
it('keeps the bulk editor open with an actionable save error', async () => {
  render(<RateCardBulkEditor entries={rows} saving={false} onSave={vi.fn().mockRejectedValue(new Error('Refresh changed rates'))} onCancel={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save 2 ranges' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Refresh changed rates');
  expect(screen.getByLabelText('Rate 1')).toHaveValue(120);
});
it('edits a saved PO without selecting rate rows and keeps all mappings', async () => {
  const assigned = vi.fn();
  render(<PoAssignmentPanel customerId="customer" selectedIds={[]} onAssigned={assigned} />);
  expect(screen.getByRole('button', { name: 'Assign / Manage PO' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Edit PO PO-100' }));
  const input = await screen.findByLabelText(/PO Number/);
  expect(input).toHaveValue('PO-100');
  fireEvent.change(input, { target: { value: 'PO-101' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save mappings' }));
  await waitFor(() => expect(save).toHaveBeenCalledWith({ id: 'po-1', po_number: 'PO-101', po_date: '2026-10-28', status: 'active', price_list_item_ids: ['rate-1'] }));
  expect(assigned).toHaveBeenCalledTimes(1);
});

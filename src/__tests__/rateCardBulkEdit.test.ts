import { describe, expect, it } from 'vitest';
import { applyRateCardEdits } from '../utils/rateCardBulkEdit';
import type { RateCardEntryWithId } from '../hooks/useRateCard';

const rows: RateCardEntryWithId[] = [1, 2].map((value, index) => ({
  id: `rate-${value}`, price_list_item_id: `rate-${value}`, gauge_id: 'plug', gauge_name: 'Plain Plug Gauge',
  range: { min: index ? 50 : 1, max: index ? 100 : 50 }, range_unit: 'mm',
  rate_type: 'discounted', rate: 120 + index * 20, discount: 5, unit: 'rs/unit',
  description: 'Imported gauge rate', basic_size: 0, standard_specification: 'Calibration', least_count: 0.001,
}));
const current = { plug: rows, other: [{ ...rows[0], price_list_item_id: 'other-rate' }] };

describe('bulk gauge rate updates', () => {
  it('updates every range while retaining row identities, PO references and other gauges', () => {
    const edits = rows.map(row => ({ ...row, rate: row.rate + 10 }));
    edits[1] = { ...edits[1], range: { min: 50, max: 120 } };
    const result = applyRateCardEdits(current, 'customer', rows, edits);
    expect(result.plug.map(row => row.rate)).toEqual([130, 150]);
    expect(result.plug.map(row => row.price_list_item_id)).toEqual(['rate-1', 'rate-2']);
    expect(result.plug[1].range.max).toBe(120);
    expect(result.plug[0].least_count).toBe(0.001);
    expect(result.other).toBe(current.other);
    expect(current.plug[0].rate).toBe(120);
  });
  it('matches saved row identities after reordering', () => {
    const result = applyRateCardEdits({ ...current, plug: [...rows].reverse() }, 'customer', rows, rows.map(row => ({ ...row, rate: 250 })));
    expect(result.plug.map(row => row.price_list_item_id)).toEqual(['rate-2', 'rate-1']);
    expect(result.plug.map(row => row.rate)).toEqual([250, 250]);
  });
  it('refuses stale or deleted rows instead of overwriting newer rates', () => {
    expect(() => applyRateCardEdits({ ...current, plug: [{ ...rows[0], rate: 500 }, rows[1]] }, 'customer', rows, rows)).toThrow('Rates changed');
    expect(() => applyRateCardEdits({ ...current, plug: [rows[0]] }, 'customer', rows, rows)).toThrow('removed');
  });
  it('rejects invalid ranges, discounts and duplicate row identities', () => {
    expect(() => applyRateCardEdits(current, 'customer', rows, [rows[0], rows[0]])).toThrow('changed');
    expect(() => applyRateCardEdits(current, 'customer', rows, [{ ...rows[0], discount: 101 }, rows[1]])).toThrow('Check');
    expect(() => applyRateCardEdits(current, 'customer', rows, [{ ...rows[0], range: { min: 60, max: 50 } }, rows[1]])).toThrow('Check');
  });
});

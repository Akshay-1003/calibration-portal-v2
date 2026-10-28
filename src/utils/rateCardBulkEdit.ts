import type { RateCardEntryWithId } from '../hooks/useRateCard';
import type { RateCardEntriesByGauge } from '../services/apiServices';
import type { RateCardEntry } from '../types/types';

const editableValues = (row: RateCardEntry) => JSON.stringify([
  row.range, row.basic_size, row.standard_specification, row.rate,
  row.discount, row.unit, row.description,
]);

/** Merge one gauge's edited rows without replacing another gauge or its PO identities. */
export function applyRateCardEdits(
  current: RateCardEntriesByGauge,
  orgId: string,
  original: RateCardEntryWithId[],
  edits: RateCardEntryWithId[],
): RateCardEntriesByGauge {
  const gaugeId = original[0]?.gauge_id;
  if (!gaugeId || !original.length || edits.length !== original.length ||
    original.some(row => row.gauge_id !== gaugeId) || edits.some(row => row.gauge_id !== gaugeId)) {
    throw new Error('Invalid gauge selection. Reopen the gauge editor.');
  }
  const originals = new Map(original.map(row => [row.id, row]));
  const edited = new Map(edits.map(row => [row.id, row]));
  if (edited.size !== original.length || edits.some(row => !originals.has(row.id))) {
    throw new Error('Rate rows have changed. Reopen the gauge editor.');
  }
  let matched = 0;
  const rows = (current[gaugeId] || []).map((row, index) => {
    const identity = row.price_list_item_id || `${orgId}_${gaugeId}_${index}`;
    const edit = edited.get(identity);
    if (!edit) return row;
    const before = originals.get(identity)!;
    if (editableValues(row) !== editableValues(before)) {
      throw new Error('Rates changed since this editor opened. Cancel and reopen it before saving.');
    }
    if (![edit.range.min, edit.range.max, edit.rate, edit.discount].every(Number.isFinite) ||
      edit.range.min > edit.range.max || edit.rate < 0 || edit.discount < 0 || edit.discount > 100 || !edit.unit.trim()) {
      throw new Error('Check the ranges, rates, discounts and units before saving.');
    }
    matched++;
    return { ...row, range: edit.range, basic_size: edit.basic_size,
      standard_specification: edit.standard_specification, rate: edit.rate,
      discount: edit.discount, unit: edit.unit, description: edit.description };
  });
  if (matched !== original.length) throw new Error('A rate row was removed. Reopen the gauge editor.');
  return { ...current, [gaugeId]: rows };
}

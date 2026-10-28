import { useState } from 'react';
import type { RateCardEntryWithId } from '../../hooks/useRateCard';
import { Button } from '../ui/button';

interface Props {
  entries: RateCardEntryWithId[];
  saving: boolean;
  onSave: (entries: RateCardEntryWithId[]) => Promise<void>;
  onCancel: () => void;
}

const inputClass = 'h-10 w-full min-w-24 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900';

export function RateCardBulkEditor({ entries, saving, onSave, onCancel }: Props) {
  const [rows, setRows] = useState(() => entries.map(row => ({ ...row, range: { ...row.range } })));
  const [error, setError] = useState('');
  const update = (index: number, patch: Partial<RateCardEntryWithId>) =>
    setRows(current => current.map((row, position) => position === index ? { ...row, ...patch } : row));

  return <form aria-label="Edit gauge rates" onSubmit={async event => {
    event.preventDefault();
    if (saving) return;
    const invalidRange = rows.some(row => row.range.min > row.range.max);
    if (invalidRange) { setError('Range maximum must be greater than or equal to its minimum.'); return; }
    setError('');
    try { await onSave(rows); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save gauge rates.'); }
  }}>
    <fieldset disabled={saving} className="min-w-0 space-y-4">
      <legend className="mb-2 text-lg font-semibold">Edit {entries[0]?.gauge_name || 'gauge'} · {rows.length} ranges</legend>
      <p className="text-sm text-slate-600">Update this gauge’s ranges and rates together. Existing PO assignments are retained.</p>
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 text-slate-700"><tr>
            <th className="p-3">SR NO</th><th className="p-3">RANGE / SPECIFICATION</th><th className="p-3">RATE</th><th className="p-3">DISCOUNT (%)</th><th className="p-3">UNIT</th>
          </tr></thead>
          <tbody>{rows.map((row, index) => {
            const hasRange = Boolean(entries[index].range.min || entries[index].range.max);
            const isSpecification = !hasRange && Boolean(entries[index].standard_specification);
            const isBasicSize = !hasRange && !isSpecification && entries[index].basic_size != null;
            return <tr key={row.id} className="border-t border-slate-200">
              <td className="p-3">{index + 1}</td>
              <td className="min-w-80 p-3">
                {isSpecification ? <input aria-label={`Specification ${index + 1}`} className={inputClass} required value={row.standard_specification || ''} onChange={event => update(index, { standard_specification: event.target.value })} />
                  : isBasicSize ? <input aria-label={`Basic size ${index + 1}`} className={inputClass} required type="number" step="any" value={row.basic_size} onChange={event => update(index, { basic_size: event.target.valueAsNumber })} />
                  : <div className="flex items-center gap-2">
                    <input aria-label={`Range minimum ${index + 1}`} className={inputClass} required type="number" step="any" value={row.range.min} onChange={event => update(index, { range: { ...row.range, min: event.target.valueAsNumber } })} />
                    <span>–</span>
                    <input aria-label={`Range maximum ${index + 1}`} className={inputClass} required type="number" step="any" value={row.range.max} onChange={event => update(index, { range: { ...row.range, max: event.target.valueAsNumber } })} />
                    <span>{row.range_unit}</span>
                  </div>}
                {hasRange && row.standard_specification && <p className="mt-1 text-xs text-slate-500">{row.standard_specification}</p>}
              </td>
              <td className="p-3"><input aria-label={`Rate ${index + 1}`} className={inputClass} required type="number" min="0" step="any" value={row.rate} onChange={event => update(index, { rate: event.target.valueAsNumber })} /></td>
              <td className="p-3"><input aria-label={`Discount ${index + 1}`} className={inputClass} required type="number" min="0" max="100" step="any" disabled={!['discount', 'discounted'].includes(row.rate_type)} value={row.discount} onChange={event => update(index, { discount: event.target.valueAsNumber })} /></td>
              <td className="p-3"><input aria-label={`Unit ${index + 1}`} className={inputClass} required value={row.unit} onChange={event => update(index, { unit: event.target.value })} /></td>
            </tr>;
          })}</tbody>
        </table>
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700" disabled={saving}>{saving ? 'Saving...' : `Save ${rows.length} ranges`}</Button>
      </div>
    </fieldset>
  </form>;
}

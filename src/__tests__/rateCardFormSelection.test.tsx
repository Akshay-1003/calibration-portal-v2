import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { RateCardForm } from '../components/rate-card/RateCardForm';

const { gauges } = vi.hoisted(() => ({
  gauges: [
    { id: 'od-master', name: 'Master Piece/ OD Master.' },
    { id: 'ring-master', name: 'Ring Gauge (ID Master)' },
    { id: 'vernier', name: 'Vernier Caliper' },
  ],
}));

vi.mock('../hooks/queries/masterData', () => ({
  useGaugeMastersQuery: () => ({ data: gauges, isPending: false }),
}));
vi.mock('../hooks/queries/threadRingPlugs', () => ({
  useThreadRingPlugsQuery: () => ({
    data: [{ standard_specification: 'M8 x 1.25' }, { standard_specification: 'M10 x 1.5' }],
    isPending: false,
  }),
}));
vi.mock('../hooks/queries/taperThreadReadings', () => ({
  useTaperThreadReadingsQuery: () => ({ data: [], isPending: false }),
}));

beforeAll(() => {
  // React Aria observes the listbox and scrolls the active option in browsers.
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal('ResizeObserver', Observer);
  vi.stubGlobal('IntersectionObserver', Observer);
  Element.prototype.scrollIntoView = vi.fn();
});

async function selectGauge(name: string) {
  const input = screen.getByPlaceholderText('Search gauge...');
  act(() => input.focus());
  fireEvent.click(input);
  fireEvent.change(input, { target: { value: 'master' } });
  fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
  const option = await screen.findByRole('option', { name });
  expect(screen.queryByRole('option', { name: 'Vernier Caliper' })).not.toBeInTheDocument();
  fireEvent.click(option);
  await waitFor(() => expect(input).toHaveValue(name));
}

describe('Rate Card gauge selection', () => {
  it('keeps a selected gauge and other entered fields when creating a rate', async () => {
    const onSave = vi.fn();
    render(<RateCardForm onSave={onSave} onCancel={vi.fn()} />);
    const description = screen.getByPlaceholderText('Enter description...');
    fireEvent.change(description, { target: { value: 'Keep this description' } });

    await selectGauge('Master Piece/ OD Master.');

    expect(description).toHaveValue('Keep this description');
    expect(screen.getByText('Master Piece/ OD Master. | 1 row')).toBeInTheDocument();
    fireEvent.submit(screen.getByRole('form', { name: 'Rate card entry form' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      gauge_id: 'od-master', description: 'Keep this description',
    })));
    expect(screen.getByPlaceholderText('Search gauge...')).toHaveValue('Master Piece/ OD Master.');
  });

  it('allows replacing a selection without resetting the form', async () => {
    render(<RateCardForm onSave={vi.fn()} onCancel={vi.fn()} />);
    await selectGauge('Master Piece/ OD Master.');
    await selectGauge('Ring Gauge (ID Master)');
    expect(screen.getByText('Ring Gauge (ID Master) | 1 row')).toBeInTheDocument();
  });
});

it('keeps an edited gauge and draft values when the existing entry rerenders', async () => {
  const entry = {
    gauge_id: 'od-master', rate_type: 'flat', range: { min: 1, max: 10 },
    rate: 125, discount: 0, unit: 'rs/unit', description: 'Saved description',
  };
  const onSave = vi.fn();
  const onCancel = vi.fn();
  const { rerender } = render(<RateCardForm entry={entry} onSave={onSave} onCancel={onCancel} />);
  const description = screen.getByPlaceholderText('Enter description...');
  fireEvent.change(description, { target: { value: 'Edited description' } });
  await selectGauge('Ring Gauge (ID Master)');
  rerender(<RateCardForm entry={entry} onSave={onSave} onCancel={onCancel} />);

  expect(description).toHaveValue('Edited description');
  fireEvent.submit(screen.getByRole('form', { name: 'Rate card entry form' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
    gauge_id: 'ring-master', description: 'Edited description', rate: 125,
    range: { min: 1, max: 10 }, rate_type: 'flat',
  })));
});

it('filters specifications and commits a keyboard selection to the save payload', async () => {
  const entry = {
    gauge_id: 'od-master', rate_type: 'flat', range: { min: 0, max: 0 },
    rate: 125, discount: 0, unit: 'rs/unit', description: '',
    standard_specification: 'M8 x 1.25',
  };
  const onSave = vi.fn();
  render(<RateCardForm entry={entry} onSave={onSave} onCancel={vi.fn()} />);
  const input = screen.getByPlaceholderText('Search spec...');
  act(() => input.focus());
  fireEvent.change(input, { target: { value: 'M10' } });
  await screen.findByRole('option', { name: /M10 x 1\.5/ });
  expect(screen.queryByRole('option', { name: /M8 x 1\.25/ })).not.toBeInTheDocument();
  fireEvent.keyDown(input, { key: 'ArrowDown', code: 'ArrowDown' });
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
  await waitFor(() => expect(input).toHaveValue('M10 x 1.5 (Plain)'));

  fireEvent.submit(screen.getByRole('form', { name: 'Rate card entry form' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
    gauge_id: 'od-master', standard_specification: 'M10 x 1.5', rate: 125,
  })));
});

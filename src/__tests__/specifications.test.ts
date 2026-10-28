import { describe, it, expect } from 'vitest';
import { isSpecArray, isSpecObject, normalizeSpecByType, isValidSpecForType } from '../utils/specifications';
import { formatSpecificationForPrint } from '../utils/specificationPrintFormatter';
import { extractSpecificationTypes } from '../utils/specificationParser';
import { transformOutwardToChalanData } from '../components/chalan/chalanUtils';

describe('specifications utils', () => {
  it('detects array and object specs', () => {
    expect(isSpecArray(['a'])).toBe(true);
    expect(isSpecArray({})).toBe(false);
    expect(isSpecObject({ go: {} })).toBe(true);
    expect(isSpecObject(['a'])).toBe(false);
  });

  it('normalizes OD/ID Limit to object shape', () => {
    const normalized = normalizeSpecByType('od limit gauge', undefined);
    expect(isSpecObject(normalized)).toBe(true);
    expect((normalized as Record<string, unknown>).go).toBeDefined();
    expect((normalized as Record<string, unknown>).no_go).toBeDefined();
  });

  it('normalizes Master Piece to array shape', () => {
    const normalized = normalizeSpecByType('master piece', undefined);
    expect(isSpecArray(normalized)).toBe(true);
  });

  it('normalizes Fixed Range to object shape', () => {
    const normalized = normalizeSpecByType('fixed range gauge', undefined);
    expect(isSpecObject(normalized)).toBe(true);
    // Check that the object has the expected structure (properties exist, even if undefined)
    expect(normalized).toHaveProperty('from');
    expect(normalized).toHaveProperty('to');
    expect(normalized).toHaveProperty('leastCount');
  });

  it('validates spec format for type', () => {
    expect(isValidSpecForType('master piece', ['x'])).toBe(true);
    expect(isValidSpecForType('master piece', { go: {} })).toBe(false);
    expect(isValidSpecForType('od limit gauge', { go: {} })).toBe(true);
    expect(isValidSpecForType('fixed range gauge', { from: 0 })).toBe(true);
  });

  it('formats fixed-range specs and least count as compact print text', () => {
    expect(formatSpecificationForPrint({
      range: { min: 35, max: 60 },
      least_count: 0.001,
    })).toBe('(35.00 - 60.00) mm; LC: 0.0010 mm');
  });

  it('adds the default unit for plain numeric print specifications', () => {
    expect(formatSpecificationForPrint('56.5500')).toBe('56.5500 mm');
    expect(formatSpecificationForPrint({ value: '24.7700' })).toBe('24.7700 mm');
    expect(formatSpecificationForPrint('18.00 mm')).toBe('18.00 mm');
  });

  it('prints concentric master-piece dimensions without size labels', () => {
    expect(formatSpecificationForPrint(
      { basic_size: [8.37, 50] },
      '5000',
      'Master Piece/ OD Master.(Concentric)',
    )).toBe('8.3700 mm / 50.00 mm');
  });

  it('extracts concentric dimensions as individually labeled sizes', () => {
    const types = extractSpecificationTypes(
      { basic_size: [8.37, 50] },
      'Master Piece/ OD Master.(Concentric)',
      '5000',
    );

    expect(types.map(({ label, value }) => [label, value])).toEqual([
      ['Size A', '8.3700 mm'],
      ['Size B', '50.00 mm'],
    ]);
  });

  it('prefers standard_specification over standard_specification_id for outward print', () => {
    const transformed = transformOutwardToChalanData(
      {
        outward_no: '26080005',
        outward_date: '2026-07-28',
        client_org: 'Test Client',
      },
      [
        {
          inward_id: 'inward-1',
          gauge_inward_id: 'gauge-inward-1',
          gauge_id: 'gauge-1',
          inward_gauge_lab_id: '26072930',
          master_gauge_name: 'Plain Thread Plug Gauge',
          identification_number: 'PTPG-26072930',
          manf_serial_number: '',
          inward_date: '2026-07-28',
          process: 'calibration',
          status: 'calibration_completed',
          specification: { standard_specification_id: '6968a34e638ed6339a82f102' },
          specifications: {
            standard_specification_id: '6968a34e638ed6339a82f102',
            standard_specification: 'M10 X 1.5 - 6H',
          },
        },
      ],
    );

    expect(formatSpecificationForPrint(transformed.items[0].specification)).toBe('M10 X 1.5 - 6H');
  });

  it('maps outward chalan DC date from client DC date instead of outward date', () => {
    const transformed = transformOutwardToChalanData(
      {
        outward_no: '15641',
        outward_date: '2026-10-03',
        client_org: 'Test Client',
      },
      [
        {
          inward_id: 'inward-1',
          gauge_inward_id: 'gauge-inward-1',
          gauge_id: 'gauge-1',
          inward_gauge_lab_id: '26100317',
          master_gauge_name: 'Plain Plug Gauge',
          identification_number: 'VC/PG/01',
          manf_serial_number: '',
          inward_date: '2026-10-01',
          process: 'calibration',
          status: 'calibration_completed',
          client_dc_no: '214',
          client_dc_date: '2026-10-01',
          dc_date: '2026-10-03',
          specifications: {},
        },
      ],
    );

    expect(transformed.items[0].dc_no).toBe('214');
    expect(transformed.items[0].dc_date).toBe('2026-10-01');
  });

  it('does not fall back to outward date as the DC date', () => {
    const transformed = transformOutwardToChalanData(
      {
        outward_no: '15641',
        outward_date: '2026-10-03',
        client_org: 'Test Client',
      },
      [
        {
          inward_id: 'inward-1',
          gauge_inward_id: 'gauge-inward-1',
          gauge_id: 'gauge-1',
          inward_gauge_lab_id: '26100317',
          master_gauge_name: 'Plain Plug Gauge',
          identification_number: 'VC/PG/01',
          manf_serial_number: '',
          inward_date: '2026-10-01',
          process: 'calibration',
          status: 'calibration_completed',
          client_dc_no: '214',
          dc_date: '2026-10-03',
          specifications: {},
        },
      ],
    );

    expect(transformed.items[0].dc_date).toBeUndefined();
  });
});

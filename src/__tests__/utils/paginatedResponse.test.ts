import { describe, expect, it } from 'vitest';
import { extractPaginatedList } from '../../utils/paginatedResponse';

describe('extractPaginatedList', () => {
  it('preserves pagination metadata nested with the response data', () => {
    const result = extractPaginatedList<{ id: string }>(
      {
        data: {
          items: [{ id: 'gauge-1' }],
          total: 28,
          page: 1,
          limit: 10,
          totalPages: 3,
        },
      },
      { arrayKeys: ['items'], fallbackLimit: 10 },
    );

    expect(result.items).toEqual([{ id: 'gauge-1' }]);
    expect(result.total).toBe(28);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.totalPages).toBe(3);
  });

  it('keeps root pagination metadata for the common API shape', () => {
    const result = extractPaginatedList<{ id: string }>(
      {
        data: [{ id: 'gauge-1' }],
        total: 28,
        page: 0,
        limit: 10,
        totalPages: 3,
      },
      { fallbackLimit: 10 },
    );

    expect(result.total).toBe(28);
    expect(result.page).toBe(0);
    expect(result.totalPages).toBe(3);
  });
});

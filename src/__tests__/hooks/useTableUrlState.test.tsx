import { act, renderHook } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTableUrlState } from '../../hooks/useTableUrlState';

describe('useTableUrlState', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('merges synchronous query and page updates', () => {
    window.history.replaceState({}, '', '/?customers_page=2');
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <BrowserRouter>{children}</BrowserRouter>
    );
    const { result } = renderHook(
      () => useTableUrlState({ prefix: 'customers', defaultRowsPerPage: 25 }),
      { wrapper },
    );

    act(() => {
      result.current.setQuery('Vikramaditya');
      result.current.setPage(1);
    });

    expect(result.current.state.query).toBe('Vikramaditya');
    expect(result.current.state.page).toBe(1);
    expect(new URLSearchParams(window.location.search).get('customers_q')).toBe('Vikramaditya');
  });
});

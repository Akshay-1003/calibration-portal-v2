import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  downloadRateCardTemplate,
  importRateCardExcel,
} from '../services/apiServices';

describe('rate card import API helpers', () => {
  beforeEach(() => {
    vi.mocked(fetch).mockReset();
  });

  it('downloads the generated Excel template as a blob', async () => {
    const blob = new Blob(['template'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      blob: async () => blob,
      headers: new Headers({
        'content-disposition': 'attachment; filename="Acme_Rate_Card_Template.xlsx"',
      }),
    } as Response);

    const result = await downloadRateCardTemplate('org-1');

    expect(result).toEqual({
      blob,
      filename: 'Acme_Rate_Card_Template.xlsx',
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/organization/org-1/rate-card/template'),
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('uploads Excel file for dry-run preview', async () => {
    const response = {
      dry_run: true,
      mode: 'replace_gauges',
      summary: {
        total_rows: 1,
        valid_rows: 1,
        error_rows: 0,
        warning_rows: 0,
        affected_gauges: 1,
        imported_gauges: 0,
        imported_entries: 0,
      },
      rows: [],
    };
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => response,
    } as Response);

    const file = new File(['xlsx'], 'rate_card_template.xlsx');
    const result = await importRateCardExcel('org-1', file, true);

    expect(result).toEqual(response);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/organization/org-1/rate-card/import?dry_run=true'),
      expect.objectContaining({
        method: 'POST',
        body: expect.any(FormData),
      })
    );
  });

  it('throws backend detail messages for failed import requests', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ detail: 'Please upload a .xlsx rate card template.' }),
    } as Response);

    const file = new File(['bad'], 'rates.xls');

    await expect(importRateCardExcel('org-1', file, true)).rejects.toThrow(
      'Please upload a .xlsx rate card template.'
    );
  });
});

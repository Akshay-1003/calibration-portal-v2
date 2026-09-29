import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getCalibrationAccessTokenExpiry,
  isUsableCalibrationAccessToken,
  parseCalibrationAccessTokenResponse,
} from '../../../features/auth/utils/calibrationToken';

function encodeBase64Url(value: unknown): string {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

function createToken(payload: Record<string, unknown>): string {
  return `${encodeBase64Url({ alg: 'none', typ: 'JWT' })}.${encodeBase64Url(payload)}.signature`;
}

describe('calibration token helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts the backend access-token response format for calibration portal sessions', () => {
    const now = 1_788_300_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const token = createToken({
      exp: Math.floor(now / 1000) + 300,
      portal: 'calibration',
    });

    const response = parseCalibrationAccessTokenResponse({
      access_token: token,
      token_type: 'bearer',
      portal: 'calibration',
      expires_in: 1800,
    });

    expect(response).toEqual({
      access_token: token,
      refresh_token: undefined,
      token_type: 'bearer',
      portal: 'calibration',
      expires_in: 1800,
    });
    expect(isUsableCalibrationAccessToken(token)).toBe(true);
    expect(getCalibrationAccessTokenExpiry(token)).toBe((Math.floor(now / 1000) + 300) * 1000);
  });

  it('rejects customer, missing-portal and expired tokens', () => {
    const now = 1_788_300_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const futureExp = Math.floor(now / 1000) + 300;

    expect(isUsableCalibrationAccessToken(createToken({ exp: futureExp, portal: 'customer' }))).toBe(false);
    expect(isUsableCalibrationAccessToken(createToken({ exp: futureExp }))).toBe(false);
    expect(isUsableCalibrationAccessToken(createToken({ exp: Math.floor(now / 1000) - 1, portal: 'calibration' }))).toBe(false);
  });

  it('rejects a response that declares the wrong portal', () => {
    const now = 1_788_300_000_000;
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const token = createToken({
      exp: Math.floor(now / 1000) + 300,
      portal: 'calibration',
    });

    expect(() =>
      parseCalibrationAccessTokenResponse({
        access_token: token,
        token_type: 'bearer',
        portal: 'customer',
      })
    ).toThrow('Invalid calibration portal session');
  });
});

import type { AccessTokenResponse } from '../types';

const CALIBRATION_PORTAL = 'calibration';
const MINIMUM_TOKEN_LIFETIME_MS = 1000;

export type CalibrationTokenPayload = {
  exp?: number;
  portal?: string;
  [key: string]: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const paddingLength = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(paddingLength);
  const decoded = globalThis.atob(padded);
  const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

export function decodeCalibrationAccessToken(token: string): CalibrationTokenPayload | null {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) {
      return null;
    }

    const parsed: unknown = JSON.parse(decodeBase64Url(payloadPart));
    if (!isRecord(parsed)) {
      return null;
    }

    return parsed as CalibrationTokenPayload;
  } catch {
    return null;
  }
}

export function getCalibrationAccessTokenExpiry(token: string): number | null {
  const payload = decodeCalibrationAccessToken(token);
  return typeof payload?.exp === 'number' ? payload.exp * 1000 : null;
}

export function isUsableCalibrationAccessToken(
  token: string | null | undefined,
  now = Date.now()
): token is string {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const payload = decodeCalibrationAccessToken(token);
  const expiry = typeof payload?.exp === 'number' ? payload.exp * 1000 : null;

  return Boolean(
    payload?.portal === CALIBRATION_PORTAL &&
      expiry &&
      expiry > now + MINIMUM_TOKEN_LIFETIME_MS
  );
}

export function parseCalibrationAccessTokenResponse(payload: unknown): AccessTokenResponse {
  if (!isRecord(payload) || typeof payload.access_token !== 'string' || payload.access_token.trim() === '') {
    throw new Error('Invalid response format from server');
  }

  if (typeof payload.token_type === 'string' && payload.token_type.toLowerCase() !== 'bearer') {
    throw new Error('Invalid response format from server');
  }

  if (typeof payload.portal === 'string' && payload.portal !== CALIBRATION_PORTAL) {
    throw new Error('Invalid calibration portal session');
  }

  if (!isUsableCalibrationAccessToken(payload.access_token)) {
    throw new Error('Invalid calibration portal session');
  }

  return {
    access_token: payload.access_token,
    refresh_token: typeof payload.refresh_token === 'string' ? payload.refresh_token : undefined,
    token_type: 'bearer',
    portal: CALIBRATION_PORTAL,
    expires_in: typeof payload.expires_in === 'number' ? payload.expires_in : undefined,
  };
}

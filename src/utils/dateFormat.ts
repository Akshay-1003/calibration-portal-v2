import type { DateValue } from '@internationalized/date';

/**
 * Convert an ISO date string (YYYY-MM-DD) to DD/MM/YYYY.
 */
export function isoToDdMmYyyy(iso: string): string {
  const parts = iso.trim().split('-');
  if (parts.length !== 3) return iso;
  const [yyyy, mm, dd] = parts;
  return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy.padStart(4, '0')}`;
}

/**
 * Convert ISO (YYYY-MM-DD) to DD/MM/YYYY; returns undefined if input isn't ISO.
 */
export function tryIsoToDdMmYyyy(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const trimmed = iso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined;
  return isoToDdMmYyyy(trimmed);
}

/**
 * Convert a DateValue (from @internationalized/date / HeroUI DatePicker) to ISO YYYY-MM-DD.
 */
export function dateValueToIso(date: DateValue | null): string | undefined {
  if (!date) return undefined;
  // For CalendarDate/DateValue, toString() is ISO-like (YYYY-MM-DD)
  const iso = String(date);
  return iso.trim() ? iso : undefined;
}

/**
 * Convert a DateValue to DD/MM/YYYY for API filters.
 */
export function dateValueToDdMmYyyy(date: DateValue | null): string | undefined {
  const iso = dateValueToIso(date);
  if (!iso) return undefined;
  return isoToDdMmYyyy(iso);
}

/**
 * Convert DD/MM/YYYY to ISO (YYYY-MM-DD) for parsing to CalendarDate.
 */
export function ddMmYyyyToIso(ddMmYyyy: string | undefined): string | undefined {
  if (!ddMmYyyy) return undefined;
  const trimmed = ddMmYyyy.trim();
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return undefined;
  const [dd, mm, yyyy] = trimmed.split('/');
  return `${yyyy}-${mm}-${dd}`;
}



/**
 * Date Adapter - Single source of truth for date format conversions
 * 
 * Formats:
 * - UI (DatePicker): ISO YYYY-MM-DD (CalendarDate from @internationalized/date)
 * - Frontend Display: DD/MM/YYYY (with slashes)
 * - Backend API: DD-MM-YYYY (with dashes)
 */

import type { DateValue } from '@internationalized/date';
import { parseDate } from '@internationalized/date';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type IsoDate = string; // YYYY-MM-DD
export type DisplayDate = string; // DD/MM/YYYY
export type ApiDate = string; // DD-MM-YYYY

// ============================================================================
// VALIDATION
// ============================================================================

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_PREFIX_REGEX = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/;
const DISPLAY_DATE_REGEX = /^\d{2}\/\d{2}\/\d{4}$/;
const API_DATE_REGEX = /^\d{2}-\d{2}-\d{4}$/;

export function isValidIsoDate(date: string): boolean {
  return ISO_DATE_REGEX.test(date);
}

export function isValidDisplayDate(date: string): boolean {
  return DISPLAY_DATE_REGEX.test(date);
}

export function isValidApiDate(date: string): boolean {
  return API_DATE_REGEX.test(date);
}

// ============================================================================
// CONVERSIONS: ISO ↔ Display ↔ API
// ============================================================================

/**
 * Convert ISO (YYYY-MM-DD) to Display format (DD/MM/YYYY)
 */
export function isoToDisplay(iso: IsoDate): DisplayDate {
  if (!isValidIsoDate(iso)) {
    throw new Error(`Invalid ISO date format: ${iso}. Expected YYYY-MM-DD`);
  }
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}/${mm}/${yyyy}`;
}

export function getIsoDatePart(date: string): IsoDate | undefined {
  const match = date.trim().match(ISO_DATE_PREFIX_REGEX);
  if (!match) return undefined;

  const [, yyyy, mm, dd] = match;
  const isoDate = `${yyyy}-${mm}-${dd}`;
  return isValidIsoDate(isoDate) ? isoDate : undefined;
}

export function formatDateStringForDisplay(
  date: string | null | undefined,
  fallback = '',
): string {
  if (!date) return fallback;

  const trimmedDate = date.trim();
  if (!trimmedDate) return fallback;

  const isoDate = getIsoDatePart(trimmedDate);
  if (isoDate) return isoToDisplay(isoDate);
  if (isValidApiDate(trimmedDate)) return apiToDisplay(trimmedDate);
  if (isValidDisplayDate(trimmedDate)) return trimmedDate;

  return trimmedDate;
}

/**
 * Convert Display (DD/MM/YYYY) to ISO format (YYYY-MM-DD)
 */
export function displayToIso(display: DisplayDate): IsoDate {
  if (!isValidDisplayDate(display)) {
    throw new Error(`Invalid display date format: ${display}. Expected DD/MM/YYYY`);
  }
  const [dd, mm, yyyy] = display.split('/');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Convert ISO (YYYY-MM-DD) to API format (DD-MM-YYYY)
 */
export function isoToApi(iso: IsoDate): ApiDate {
  if (!isValidIsoDate(iso)) {
    throw new Error(`Invalid ISO date format: ${iso}. Expected YYYY-MM-DD`);
  }
  const [yyyy, mm, dd] = iso.split('-');
  return `${dd}-${mm}-${yyyy}`;
}

/**
 * Convert API (DD-MM-YYYY) to ISO format (YYYY-MM-DD)
 */
export function apiToIso(api: ApiDate): IsoDate {
  if (!isValidApiDate(api)) {
    throw new Error(`Invalid API date format: ${api}. Expected DD-MM-YYYY`);
  }
  const [dd, mm, yyyy] = api.split('-');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Convert Display (DD/MM/YYYY) to API format (DD-MM-YYYY)
 */
export function displayToApi(display: DisplayDate): ApiDate {
  if (!isValidDisplayDate(display)) {
    throw new Error(`Invalid display date format: ${display}. Expected DD/MM/YYYY`);
  }
  return display.replace(/\//g, '-');
}

/**
 * Convert API (DD-MM-YYYY) to Display format (DD/MM/YYYY)
 */
export function apiToDisplay(api: ApiDate): DisplayDate {
  if (!isValidApiDate(api)) {
    throw new Error(`Invalid API date format: ${api}. Expected DD-MM-YYYY`);
  }
  return api.replace(/-/g, '/');
}

// ============================================================================
// CALENDAR DATE (DatePicker) CONVERSIONS
// ============================================================================

/**
 * Convert CalendarDate to ISO format (YYYY-MM-DD)
 */
export function calendarDateToIso(date: DateValue | null): IsoDate | undefined {
  if (!date) return undefined;
  return String(date); // CalendarDate.toString() returns ISO format
}

/**
 * Convert CalendarDate to API format (DD-MM-YYYY)
 */
export function calendarDateToApi(date: DateValue | null): ApiDate | undefined {
  const iso = calendarDateToIso(date);
  if (!iso) return undefined;
  return isoToApi(iso);
}

/**
 * Convert CalendarDate to Display format (DD/MM/YYYY)
 */
export function calendarDateToDisplay(date: DateValue | null): DisplayDate | undefined {
  const iso = calendarDateToIso(date);
  if (!iso) return undefined;
  return isoToDisplay(iso);
}

/**
 * Convert ISO to CalendarDate
 */
export function isoToCalendarDate(iso: IsoDate | undefined): DateValue | null {
  if (!iso) return null;
  try {
    if (!isValidIsoDate(iso)) return null;
    return parseDate(iso);
  } catch {
    return null;
  }
}

/**
 * Convert API date to CalendarDate
 */
export function apiToCalendarDate(api: ApiDate | undefined): DateValue | null {
  if (!api) return null;
  try {
    const iso = apiToIso(api);
    return parseDate(iso);
  } catch {
    return null;
  }
}

/**
 * Convert Display date to CalendarDate
 */
export function displayToCalendarDate(display: DisplayDate | undefined): DateValue | null {
  if (!display) return null;
  try {
    const iso = displayToIso(display);
    return parseDate(iso);
  } catch {
    return null;
  }
}

// ============================================================================
// SAFE CONVERSIONS (returns undefined on error)
// ============================================================================

export function safeIsoToApi(iso: string | undefined): ApiDate | undefined {
  if (!iso) return undefined;
  try {
    return isoToApi(iso);
  } catch {
    return undefined;
  }
}

export function safeApiToIso(api: string | undefined): IsoDate | undefined {
  if (!api) return undefined;
  try {
    return apiToIso(api);
  } catch {
    return undefined;
  }
}

export function safeDisplayToApi(display: string | undefined): ApiDate | undefined {
  if (!display) return undefined;
  try {
    return displayToApi(display);
  } catch {
    return undefined;
  }
}

export function safeApiToDisplay(api: string | undefined): DisplayDate | undefined {
  if (!api) return undefined;
  try {
    return apiToDisplay(api);
  } catch {
    return undefined;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get current date in ISO format
 */
export function getCurrentIsoDate(): IsoDate {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get current date in API format
 */
export function getCurrentApiDate(): ApiDate {
  return isoToApi(getCurrentIsoDate());
}

/**
 * Get current date in Display format
 */
export function getCurrentDisplayDate(): DisplayDate {
  return isoToDisplay(getCurrentIsoDate());
}

/**
 * Format date for display (handles various input formats)
 */
export function formatDateForDisplay(date: string | DateValue | null): string {
  if (!date) return '';
  
  if (typeof date === 'string') {
    return formatDateStringForDisplay(date);
  }
  
  // DateValue
  return calendarDateToDisplay(date) || '';
}

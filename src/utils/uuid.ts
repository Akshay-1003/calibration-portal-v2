/**
 * UUID Generation Utility
 * Provides cross-browser compatible UUID v4 generation
 */

/**
 * Generate a UUID v4 with fallback for environments that don't support crypto.randomUUID
 * This ensures compatibility with older browsers and production environments
 * 
 * @returns A valid UUID v4 string (format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
 */
export function generateUUID(): string {
  // Use native crypto.randomUUID if available (modern browsers)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // Fallback: Generate UUID v4 manually using Math.random()
  // Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // Where 4 indicates version 4 and y is one of 8, 9, A, or B
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Alias for generateUUID for easier usage
 */
export const uuid = generateUUID;


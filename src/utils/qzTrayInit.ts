/**
 * QZ Tray Initialization Utility
 * 
 * Simplified approach - uses QZ Tray's native certificate handling
 * No backend certificate/signing required
 */

import { getQz } from './qzTray';

let isInitialized = false;

/**
 * Initialize QZ Tray (minimal setup)
 * Just checks if QZ Tray is available - no certificate setup needed
 */
export async function initializeQzTray(): Promise<void> {
  // Return immediately if already initialized
  if (isInitialized) {
    return Promise.resolve();
  }

  try {
    // Check if QZ Tray library is available
    if (typeof window === 'undefined') {
      console.warn('QZ Tray initialization skipped: not in browser environment');
      return;
    }

    const qz = getQz();

    // Set up connection closed callback
    qz.websocket.setClosedCallbacks(() => {
      console.log('QZ Tray connection closed');
    });

    isInitialized = true;
    console.log('QZ Tray initialized successfully');
  } catch (error) {
    console.warn('QZ Tray not available (browser print mode still available):', error);
    // Don't throw - allow app to continue without QZ Tray
    // User can still use browser print mode
    isInitialized = false;
  }
}

/**
 * Connect to QZ Tray websocket
 * Should be called before printing
 * QZ Tray will handle certificate prompts natively
 */
export async function connectQzTray(): Promise<void> {
  try {
    const qz = getQz();

    // Ensure initialized first
    if (!isInitialized) {
      await initializeQzTray();
    }

    // Connect if not already connected
    // QZ Tray will show certificate prompt if needed (user accepts once)
    if (!qz.websocket.isActive()) {
      await qz.websocket.connect();
      console.log('QZ Tray connected');
    }
  } catch (error) {
    console.error('Failed to connect to QZ Tray:', error);
    const detail = error instanceof Error ? error.message : String(error || "");
    throw new Error(
      `QZ Tray is not available or not running. Please start QZ Tray and try QZ Tray Print again.${detail ? ` Details: ${detail}` : ""}`
    );
  }
}

/**
 * Check if QZ Tray is available and initialized
 */
export function isQzTrayAvailable(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const qz = getQz();
    return isInitialized && qz.websocket.isActive();
  } catch {
    return false;
  }
}

/**
 * Reset initialization state (useful for testing or re-initialization)
 */
export function resetQzTrayInit(): void {
  isInitialized = false;
}

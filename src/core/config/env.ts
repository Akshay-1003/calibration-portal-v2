const RAW_API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const DEFAULT_API_BASE_URL = 'https://api.metrologydesk.com/api/v1';

const resolveApiBaseUrl = (value: string | undefined): string => {
  const baseUrl = value?.trim() || DEFAULT_API_BASE_URL;

  // API URLs are compiled into the frontend bundle. Rejecting an insecure
  // production value prevents a bad deployment from silently causing mixed
  // content failures in the browser.
  if (import.meta.env.PROD) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(baseUrl);
    } catch {
      throw new Error(`CRITICAL: Invalid VITE_API_BASE_URL: ${baseUrl}`);
    }

    if (parsedUrl.protocol !== 'https:') {
      throw new Error(
        'CRITICAL: VITE_API_BASE_URL must use HTTPS in production. ' +
        'Use https://api.metrologydesk.com/api/v1.'
      );
    }
  }

  return baseUrl.replace(/\/+$/, '');
};

// Environment configuration
export const ENV = {
  // API Configuration
  API_BASE_URL: resolveApiBaseUrl(RAW_API_BASE_URL),
  API_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000'),
  API_RETRY_ATTEMPTS: parseInt(import.meta.env.VITE_API_RETRY_ATTEMPTS || '3'),
  API_RETRY_DELAY: parseInt(import.meta.env.VITE_API_RETRY_DELAY || '1000'),
  API_POWERED_BY_URL: import.meta.env.VITE_API_POWERED_BY_URL || 'https://ezytechwebsite-git-main-akshays-projects-36a47d4b.vercel.app/',
  API_WEBSITE_URL: import.meta.env.VITE_API_WEBSITE_URL || 'https://www.vikramadityacalibration.com/',
  // App Configuration
  APP_NAME: import.meta.env.VITE_APP_NAME || 'VACL Calibration System',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  NODE_ENV: import.meta.env.NODE_ENV || 'development',
  
  // Feature Flags
  ENABLE_DEVTOOLS: import.meta.env.VITE_ENABLE_DEVTOOLS === 'true',
  ENABLE_LOGGING: import.meta.env.VITE_ENABLE_LOGGING === 'true',
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  
  // TEMP DEV AUTH FLOW: Use localStorage for refresh tokens (dev only)
  // Set to false to use HttpOnly cookies (production mode)
  USE_LOCALSTORAGE_REFRESH_TOKEN: import.meta.env.VITE_USE_LOCALSTORAGE_REFRESH_TOKEN === 'true',
  
  // Google OAuth
  GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
} as const;

// Type-safe environment validation
export const validateEnvironment = () => {
  // Required environment variables in production
  // In production, fail fast if required vars are missing
  if (import.meta.env.PROD) {
    const missing: string[] = [];

    if (!RAW_API_BASE_URL || RAW_API_BASE_URL.trim() === '') {
      missing.push('VITE_API_BASE_URL');
    }
    
    if (missing.length > 0) {
      throw new Error(
        `CRITICAL: Missing required environment variables in production: ${missing.join(', ')}\n` +
        `Please set these environment variables before deploying to production.`
      );
    }
    
    // Additional production checks
    if (
      ENV.API_BASE_URL.includes('localhost') ||
      ENV.API_BASE_URL.includes('127.0.0.1') ||
      ENV.API_BASE_URL.includes('98.95.117.131') ||
      ENV.API_BASE_URL.includes('35.172.1.180')
    ) {
      throw new Error(
        'CRITICAL: API_BASE_URL points to a non-production host in production. ' +
        'This is not allowed. Please set VITE_API_BASE_URL to a production endpoint.'
      );
    }
  }
  
  return true;
};

// Validate environment on import (only in browser context)
if (typeof window !== 'undefined') {
  try {
    validateEnvironment();
  } catch (error) {
    // Import logger here to avoid circular dependency
    // In production, log and throw to prevent app from running
    if (import.meta.env.PROD) {
      console.error('Environment validation failed:', error);
      throw error;
    }
    // In development, warn but allow app to continue
    console.warn('Environment validation warning:', error);
  }
}

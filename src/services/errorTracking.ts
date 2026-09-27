/**
 * Error Tracking Service
 * Production error monitoring with Sentry integration
 */

import React from 'react';
import { createRoutesFromChildren, matchRoutes, useLocation, useNavigationType } from 'react-router-dom';
import { logger } from '../utils/logger';
import { sanitizeErrorForLogging } from '../utils/errorSanitizer';
import { ENV } from '../core/config/env';

// Sentry will be loaded dynamically to avoid bundle size in development
let Sentry: any = null;

// Check if Sentry should be initialized
const shouldInitialize = (): boolean => {
  if (typeof window === 'undefined') return false; // SSR
  if (import.meta.env.DEV) return false; // Development
  if (!import.meta.env.VITE_SENTRY_DSN) return false; // No DSN configured
  return true;
};

/**
 * Initialize error tracking service
 */
export const initErrorTracking = async (): Promise<void> => {
  if (!shouldInitialize()) {
    logger.debug('Error tracking disabled (dev mode or no DSN)');
    return;
  }

  try {
    // Dynamically import Sentry only in production
    const SentryModule = await import('@sentry/react');
    Sentry = SentryModule;

    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (!dsn) {
      logger.warn('Sentry DSN not configured. Error tracking disabled.');
      return;
    }

    const routingIntegration =
      typeof Sentry.reactRouterV7BrowserTracingIntegration === 'function'
        ? Sentry.reactRouterV7BrowserTracingIntegration({
            useEffect: React.useEffect,
            useLocation,
            useNavigationType,
            createRoutesFromChildren,
            matchRoutes,
          })
        : typeof Sentry.reactRouterV6BrowserTracingIntegration === 'function'
          ? Sentry.reactRouterV6BrowserTracingIntegration({
              useEffect: React.useEffect,
              useLocation,
              useNavigationType,
              createRoutesFromChildren,
              matchRoutes,
            })
          : Sentry.browserTracingIntegration();

    const apiOrigin = (() => {
      try {
        return new URL(ENV.API_BASE_URL).origin;
      } catch {
        return ENV.API_BASE_URL;
      }
    })();

    Sentry.init({
      dsn,
      environment: import.meta.env.MODE || 'production',
      integrations: [
        routingIntegration,
        Sentry.replayIntegration({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
      // Performance Monitoring
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% of transactions in production
      tracePropagationTargets: [apiOrigin],
      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% of sessions
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

      beforeSend(
        event: { exception?: { values?: Array<{ value?: string; stacktrace?: { frames?: unknown[] } }> }; message?: string },
        hint: { originalException?: unknown },
      ) {
        // Sanitize error before sending to Sentry
        if (hint.originalException) {
          const sanitized = sanitizeErrorForLogging(hint.originalException);
          
          // Update event with sanitized data
          if (event.exception?.values?.[0]) {
            event.exception.values[0].value = sanitized.message;
            if (sanitized.stack) {
              event.exception.values[0].stacktrace = {
                frames: sanitized.stack.split('\n').map((line, index) => ({
                  filename: line,
                  lineno: index,
                  function: '',
                })),
              };
            }
          }
        }

        // Don't send events without valid error data
        if (!event.exception && !event.message) {
          return null;
        }

        return event;
      },

      ignoreErrors: [
        // Browser extensions
        'ResizeObserver loop limit exceeded',
        'Non-Error promise rejection captured',
        // Network errors (handled separately)
        'NetworkError',
        'Failed to fetch',
        // User cancellations
        'AbortError',
      ],
    });

    logger.info('Error tracking initialized');
  } catch (error) {
    logger.error('Failed to initialize error tracking:', error);
  }
};

/**
 * Capture an exception
 */
export const captureException = (error: unknown, context?: Record<string, any>): void => {
  if (!Sentry) {
    // Fallback to console logging if Sentry not available
    const sanitized = sanitizeErrorForLogging(error);
    logger.error('Error (Sentry not available):', sanitized, context);
    return;
  }

  try {
    // Sanitize error before sending
    const sanitized = sanitizeErrorForLogging(error);
    
    Sentry.captureException(error, {
      contexts: {
        custom: {
          ...sanitized,
          ...context,
        },
      },
      tags: {
        source: 'error-tracking-service',
      },
    });
  } catch (err) {
    logger.error('Failed to capture exception:', err);
  }
};

/**
 * Capture a message
 */
export const captureMessage = (
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  context?: Record<string, any>
): void => {
  if (!Sentry) {
    logger[level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'info'](message, context);
    return;
  }

  try {
    Sentry.captureMessage(message, {
      level,
      contexts: context ? { custom: context } : undefined,
      tags: {
        source: 'error-tracking-service',
      },
    });
  } catch (error) {
    logger.error('Failed to capture message:', error);
  }
};

/**
 * Set user context for error tracking
 */
export const setUserContext = (user: {
  id?: string;
  email?: string;
  username?: string;
  [key: string]: any;
}): void => {
  if (!Sentry) return;

  try {
    Sentry.setUser(user);
  } catch (error) {
    logger.error('Failed to set user context:', error);
  }
};

/**
 * Add breadcrumb for debugging
 */
export const addBreadcrumb = (
  message: string,
  category?: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, any>
): void => {
  if (!Sentry) return;

  try {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
      timestamp: Date.now() / 1000,
    });
  } catch (error) {
    logger.error('Failed to add breadcrumb:', error);
  }
};

/**
 * Set tags for filtering errors
 */
export const setTag = (key: string, value: string): void => {
  if (!Sentry) return;

  try {
    Sentry.setTag(key, value);
  } catch (error) {
    logger.error('Failed to set tag:', error);
  }
};

/**
 * Set context data
 */
export const setContext = (name: string, context: Record<string, any>): void => {
  if (!Sentry) return;

  try {
    Sentry.setContext(name, context);
  } catch (error) {
    logger.error('Failed to set context:', error);
  }
};

/**
 * Clear user context (on logout)
 */
export const clearUserContext = (): void => {
  if (!Sentry) return;

  try {
    Sentry.setUser(null);
  } catch (error) {
    logger.error('Failed to clear user context:', error);
  }
};

/**
 * Check if error tracking is enabled
 */
export const isErrorTrackingEnabled = (): boolean => {
  return Sentry !== null && shouldInitialize();
};


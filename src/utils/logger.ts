/**
 * Logger Utility
 * Centralized logging that respects environment flags
 * All console.log statements should be replaced with this logger
 */

import { ENV } from '../core/config/env';

type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: any;
  timestamp: string;
}

/**
 * Logger class that gates console output based on environment
 */
class Logger {
  private isDev(): boolean {
    return import.meta.env.DEV || ENV.NODE_ENV === 'development';
  }

  private shouldLog(level: LogLevel): boolean {
    // Always log errors
    if (level === 'error') {
      return true;
    }

    // In production, only log if explicitly enabled
    if (import.meta.env.PROD) {
      return ENV.ENABLE_LOGGING === true;
    }

    // In development, always log
    return this.isDev();
  }

  private formatMessage(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Log a general message
   * Only shown in development or if ENABLE_LOGGING is true in production
   */
  log(message: string, ...args: any[]): void {
    if (!this.shouldLog('log')) return;

    const entry = this.formatMessage('log', message, args.length > 0 ? args : undefined);
    if (entry.data) {
      console.log(`[LOG] ${entry.message}`, ...args);
    } else {
      console.log(`[LOG] ${entry.message}`);
    }
  }

  /**
   * Log an info message
   * Only shown in development or if ENABLE_LOGGING is true in production
   */
  info(message: string, ...args: any[]): void {
    if (!this.shouldLog('info')) return;

    const entry = this.formatMessage('info', message, args.length > 0 ? args : undefined);
    if (entry.data) {
      console.info(`[INFO] ${entry.message}`, ...args);
    } else {
      console.info(`[INFO] ${entry.message}`);
    }
  }

  /**
   * Log a warning message
   * Always shown (but can be filtered in production)
   */
  warn(message: string, ...args: any[]): void {
    if (!this.shouldLog('warn')) return;

    const entry = this.formatMessage('warn', message, args.length > 0 ? args : undefined);
    if (entry.data) {
      console.warn(`[WARN] ${entry.message}`, ...args);
    } else {
      console.warn(`[WARN] ${entry.message}`);
    }
  }

  /**
   * Log an error message
   * Always shown (errors are critical)
   */
  error(message: string, error?: unknown, ...args: any[]): void {
    // Errors are always logged
    const entry = this.formatMessage('error', message, error || args.length > 0 ? args : undefined);

    if (error) {
      if (error instanceof Error) {
        console.error(`[ERROR] ${entry.message}`, error, ...args);
      } else {
        console.error(`[ERROR] ${entry.message}`, error, ...args);
      }
    } else if (args.length > 0) {
      console.error(`[ERROR] ${entry.message}`, ...args);
    } else {
      console.error(`[ERROR] ${entry.message}`);
    }

    // In production, send to error tracking service (if configured)
    if (import.meta.env.PROD && typeof window !== 'undefined') {
      // This will be enhanced when error tracking is implemented
      // errorTrackingService?.captureException(error, { message, ...args });
    }
  }

  /**
   * Log a debug message
   * Only shown in development
   */
  debug(message: string, ...args: any[]): void {
    // Debug only in development
    if (!this.isDev()) return;

    const entry = this.formatMessage('debug', message, args.length > 0 ? args : undefined);
    if (entry.data) {
      console.debug(`[DEBUG] ${entry.message}`, ...args);
    } else {
      console.debug(`[DEBUG] ${entry.message}`);
    }
  }

  /**
   * Log grouped messages (useful for debugging)
   * Only shown in development
   */
  group(label: string, callback: () => void): void {
    if (!this.isDev()) {
      callback();
      return;
    }

    console.group(label);
    try {
      callback();
    } finally {
      console.groupEnd();
    }
  }

  /**
   * Log a table (useful for arrays/objects)
   * Only shown in development
   */
  table(data: any): void {
    if (!this.isDev()) return;
    console.table(data);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export default for convenience
export default logger;







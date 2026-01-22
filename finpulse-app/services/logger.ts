/**
 * Logger Utility
 * Centralized logging with environment-based filtering
 * Suppresses logs in production, verbose in development
 */

import * as Sentry from '@sentry/react';

interface LogContext {
  [key: string]: unknown;
}

// Helper to normalize unknown errors to Error | LogContext
function normalizeError(err: unknown): Error | LogContext {
  if (err instanceof Error) return err;
  if (typeof err === 'object' && err !== null) return err as LogContext;
  return { value: String(err) };
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private prefix: string;

  constructor(prefix: string) {
    this.prefix = `[${prefix}]`;
  }

  /**
   * Debug logs - only shown in development
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(`${this.prefix} ${message}`, context || '');
    }
  }

  /**
   * Info logs - shown in all environments
   */
  info(message: string, context?: LogContext): void {
    console.info(`${this.prefix} ${message}`, context || '');
  }

  /**
   * Warning logs - shown in all environments
   */
  warn(message: string, context?: LogContext | unknown): void {
    const ctx = context ? normalizeError(context) : '';
    console.warn(`${this.prefix} ${message}`, ctx);
  }

  /**
   * Error logs - always shown and sent to Sentry in production
   * Accepts unknown type for catch block compatibility
   */
  error(message: string, error?: unknown, _context?: LogContext): void {
    const normalizedError = error ? normalizeError(error) : '';
    console.error(`${this.prefix} ${message}`, normalizedError);

    // Send to Sentry in production
    if (!this.isDevelopment && normalizedError instanceof Error) {
      try {
        Sentry.captureException(normalizedError, { tags: { module: this.prefix } });
      } catch {
        // Sentry not available, ignore
      }
    }
  }

  /**
   * Performance timing - logs how long an operation takes
   */
  time(operation: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      if (this.isDevelopment) {
        this.debug(`${operation} completed in ${duration.toFixed(2)}ms`);
      }
    };
  }
}

/**
 * Factory function to create module-specific loggers
 */
export function createLogger(moduleName: string): Logger {
  return new Logger(moduleName);
}

// Export default loggers for common modules
export const authLogger = createLogger('Auth');
export const apiLogger = createLogger('API');
export const syncLogger = createLogger('Sync');
export const wsLogger = createLogger('WebSocket');
export const storeLogger = createLogger('Store');
export const componentLogger = createLogger('Component');

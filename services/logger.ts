/**
 * Logger Utility
 * Centralized logging with environment-based filtering
 * Suppresses logs in production, verbose in development
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
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
  warn(message: string, context?: LogContext): void {
    console.warn(`${this.prefix} ${message}`, context || '');
  }

  /**
   * Error logs - always shown and sent to Sentry in production
   */
  error(message: string, error?: Error | LogContext, context?: LogContext): void {
    console.error(`${this.prefix} ${message}`, error || '');

    // Send to Sentry in production
    if (!this.isDevelopment) {
      const { captureException } = require('@sentry/react');
      if (error instanceof Error) {
        captureException(error, { tags: { module: this.prefix } });
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

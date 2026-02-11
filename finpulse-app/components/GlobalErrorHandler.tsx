/**
 * GlobalErrorHandler Component
 * Catches unhandled promise rejections and provides global error boundaries
 *
 * This complements the existing ErrorBoundary (which catches synchronous React errors)
 * by handling async errors that would otherwise go unnoticed.
 */

import { useEffect, useCallback, useState } from 'react';
import { storeLogger } from '../services/logger';

interface GlobalErrorState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

interface GlobalErrorHandlerProps {
  children: React.ReactNode;
  onError?: (error: Error, info: string) => void;
}

/**
 * Global error handler for unhandled promise rejections
 * Should be placed at the root of the app, inside ErrorBoundary
 */
export function GlobalErrorHandler({ children, onError }: GlobalErrorHandlerProps) {
  const [errorState, setErrorState] = useState<GlobalErrorState>({
    hasError: false,
    error: null,
    errorInfo: null,
  });

  /**
   * Handle unhandled promise rejections
   */
  const handleUnhandledRejection = useCallback((event: Event) => {
    const rejectionEvent = event as unknown as { reason: unknown; preventDefault: () => void };
    // Prevent default logging (we'll handle it ourselves)
    rejectionEvent.preventDefault();

    const error = rejectionEvent.reason instanceof Error
      ? rejectionEvent.reason
      : new Error(String(rejectionEvent.reason) || 'Unknown async error');

    // Log to our structured logger
    storeLogger.error('[GlobalErrorHandler] Unhandled promise rejection:', error);

    // Notify parent if callback provided
    onError?.(error, 'unhandled_rejection');

    // For network errors, auth errors, etc. - don't crash the UI
    // Just log them for debugging
    const isRecoverable = isRecoverableError(error);

    if (!isRecoverable) {
      setErrorState({
        hasError: true,
        error,
        errorInfo: 'An unexpected error occurred. Please refresh the page.',
      });
    }
  }, [onError]);

  /**
   * Handle global errors (window.onerror equivalent)
   */
  const handleGlobalError = useCallback((event: Event) => {
    const errorEvent = event as unknown as { error?: Error; message?: string; filename?: string; lineno?: number; colno?: number };
    const error = errorEvent.error instanceof Error
      ? errorEvent.error
      : new Error(errorEvent.message || 'Unknown error');

    storeLogger.error('[GlobalErrorHandler] Global error:', error, {
      filename: errorEvent.filename,
      lineno: errorEvent.lineno,
      colno: errorEvent.colno,
    });

    onError?.(error, 'global_error');
  }, [onError]);

  useEffect(() => {
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  }, [handleUnhandledRejection, handleGlobalError]);

  /**
   * Reset error state
   */
  const handleRetry = () => {
    setErrorState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  if (errorState.hasError) {
    return (
      <div className="min-h-screen bg-[#0a1628] flex items-center justify-center p-4">
        <div className="bg-[#1a2942] border border-red-500/30 rounded-xl p-8 max-w-md text-center">
          <div className="text-red-400 text-6xl mb-4">!</div>
          <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
          <p className="text-gray-400 mb-6">
            {errorState.errorInfo || 'An unexpected error occurred.'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-[#00e5ff]/20 text-[#00e5ff] rounded-lg hover:bg-[#00e5ff]/30 transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors"
            >
              Refresh Page
            </button>
          </div>
          {import.meta.env.DEV && errorState.error && (
            <details className="mt-4 text-left">
              <summary className="text-gray-500 cursor-pointer text-sm">Error details</summary>
              <pre className="mt-2 p-3 bg-black/50 rounded text-xs text-red-300 overflow-auto max-h-48">
                {errorState.error.stack || errorState.error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Determine if an error is recoverable (shouldn't crash the UI)
 */
function isRecoverableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Network errors - usually transient
  if (message.includes('network') || message.includes('fetch')) {
    return true;
  }

  // Auth errors - user needs to re-authenticate, not crash
  if (message.includes('401') || message.includes('unauthorized')) {
    return true;
  }

  // AbortError - usually intentional cancellation
  if (name === 'aborterror' || message.includes('aborted')) {
    return true;
  }

  // Timeout errors
  if (message.includes('timeout')) {
    return true;
  }

  // Rate limiting
  if (message.includes('429') || message.includes('rate limit')) {
    return true;
  }

  return false;
}

/**
 * Hook to report errors to GlobalErrorHandler
 * Can be used from any component
 */
export function useErrorReporter() {
  const reportError = useCallback((error: Error, context?: string) => {
    storeLogger.error(`[ErrorReporter] ${context || 'Manual error report'}:`, error);

    // In production, this could send to an error tracking service
    if (import.meta.env.PROD) {
      // Sentry.captureException(error) or similar
    }
  }, []);

  return { reportError };
}

export default GlobalErrorHandler;

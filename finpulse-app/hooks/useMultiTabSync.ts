/**
 * Multi-Tab State Synchronization Hook
 *
 * Listens to localStorage 'storage' events to sync state across browser tabs.
 * When portfolio data changes in one tab, all other tabs will automatically
 * rehydrate their Zustand stores.
 *
 * This solves the issue where portfolio changes don't sync across tabs (Issue H).
 */

import { useEffect, useCallback, useRef } from 'react';
import { usePortfolioStore } from '../store/portfolioStore';
import { storeLogger } from '../services/logger';

// Storage key used by Zustand persist middleware
const PORTFOLIO_STORAGE_KEY = 'finpulse-portfolio-v2';

// Debounce time for rehydration (prevent rapid updates)
const REHYDRATE_DEBOUNCE_MS = 100;

interface MultiTabSyncOptions {
  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;

  /**
   * Callback when sync event is received
   */
  onSync?: () => void;

  /**
   * Whether to automatically reload data from backend after sync
   * @default false
   */
  reloadFromBackend?: boolean;
}

/**
 * Hook to sync portfolio state across browser tabs
 *
 * Usage:
 * ```tsx
 * function App() {
 *   useMultiTabSync({ debug: import.meta.env.DEV });
 *   return <Portfolio />;
 * }
 * ```
 */
export function useMultiTabSync(options: MultiTabSyncOptions = {}) {
  const { debug = false, onSync, reloadFromBackend = false } = options;

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(0);
  const loadFromBackend = usePortfolioStore((state) => state.loadFromBackend);

  /**
   * Rehydrate store from localStorage
   * Called when storage event is detected from another tab
   */
  const rehydrateStore = useCallback(async () => {
    if (debug) {
      storeLogger.debug('[MultiTabSync] Rehydrating store from localStorage');
    }

    try {
      // Access the persist API to rehydrate
      const persistApi = usePortfolioStore.persist;

      if (persistApi && typeof persistApi.rehydrate === 'function') {
        await persistApi.rehydrate();

        if (debug) {
          storeLogger.debug('[MultiTabSync] Store rehydrated successfully');
        }

        // Optionally reload from backend for freshest data
        if (reloadFromBackend) {
          await loadFromBackend();
          if (debug) {
            storeLogger.debug('[MultiTabSync] Reloaded from backend');
          }
        }

        // Notify callback
        onSync?.();
      } else {
        if (debug) {
          storeLogger.warn('[MultiTabSync] Persist API not available');
        }
      }
    } catch (error) {
      storeLogger.error('[MultiTabSync] Failed to rehydrate:', error);
    }
  }, [debug, onSync, reloadFromBackend, loadFromBackend]);

  /**
   * Handle storage events from other tabs
   */
  const handleStorageEvent = useCallback(
    (event: Event) => {
      // Cast to StorageEvent-like interface for browser compatibility
      const storageEvent = event as unknown as {
        key: string | null;
        newValue: string | null;
        oldValue: string | null;
      };
      // Only handle our portfolio storage key
      if (storageEvent.key !== PORTFOLIO_STORAGE_KEY) {
        return;
      }

      // Ignore if the value was cleared (logout in another tab)
      if (storageEvent.newValue === null) {
        if (debug) {
          storeLogger.debug('[MultiTabSync] Storage cleared in another tab');
        }
        // Force page reload on logout for security
        window.location.reload();
        return;
      }

      // Ignore if no actual change
      if (storageEvent.oldValue === storageEvent.newValue) {
        return;
      }

      // Debounce rapid updates
      const now = Date.now();
      if (now - lastSyncRef.current < REHYDRATE_DEBOUNCE_MS) {
        if (debug) {
          storeLogger.debug('[MultiTabSync] Debouncing rapid sync event');
        }
        return;
      }
      lastSyncRef.current = now;

      // Clear any pending debounce
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Debounce the rehydration
      debounceRef.current = setTimeout(() => {
        rehydrateStore();
      }, REHYDRATE_DEBOUNCE_MS);

      if (debug) {
        storeLogger.debug('[MultiTabSync] Storage change detected, scheduling rehydrate');
      }
    },
    [debug, rehydrateStore]
  );

  /**
   * Handle visibility change (tab becomes active)
   * Optionally refresh data when user returns to tab
   */
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible' && reloadFromBackend) {
      if (debug) {
        storeLogger.debug('[MultiTabSync] Tab became visible, checking for updates');
      }

      // Small delay to avoid race conditions
      setTimeout(() => {
        loadFromBackend().catch((error) => {
          storeLogger.error('[MultiTabSync] Failed to refresh on visibility:', error);
        });
      }, 500);
    }
  }, [debug, reloadFromBackend, loadFromBackend]);

  useEffect(() => {
    // Add event listeners
    window.addEventListener('storage', handleStorageEvent);

    // Optionally listen for visibility changes
    if (reloadFromBackend) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    if (debug) {
      storeLogger.debug('[MultiTabSync] Initialized multi-tab sync');
    }

    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageEvent);
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (debug) {
        storeLogger.debug('[MultiTabSync] Cleaned up multi-tab sync');
      }
    };
  }, [handleStorageEvent, handleVisibilityChange, debug, reloadFromBackend]);
}

/**
 * Hook to get multi-tab sync status
 * Useful for showing sync indicators in the UI
 */
export function useMultiTabSyncStatus() {
  const syncStatus = usePortfolioStore((state) => state.syncStatus);
  const lastSyncTime = usePortfolioStore((state) => state.lastSyncTime);
  const isSyncing = usePortfolioStore((state) => state.isSyncing);

  return {
    syncStatus,
    lastSyncTime,
    isSyncing,
    isOnline: navigator.onLine,
  };
}

export default useMultiTabSync;

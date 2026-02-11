import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Holding } from '../types';
import { portfolioService } from '../services/portfolioService';
import { storeLogger } from '../services/logger';

type AssetType = 'CRYPTO' | 'STOCK' | 'COMMODITY';

interface WatchlistItem {
  symbol: string;
  name: string;
  type: AssetType;
  addedAt: string;
  alertPrice?: number;
  alertType?: 'above' | 'below';
}

interface PortfolioState {
  // Current user ID for data isolation
  currentUserId: string | null;

  // User-scoped data maps
  userHoldings: Record<string, Holding[]>;
  userWatchlists: Record<string, WatchlistItem[]>;

  // Enhanced sync state
  isSyncing: boolean;
  lastSyncError: string | null;
  lastSyncTime: number | null;
  syncStatus: 'idle' | 'syncing' | 'error' | 'offline';
  pendingOperations: Array<{
    id: string;
    type: 'add' | 'update' | 'remove';
    symbol: string;
    data?: Holding;
    retryCount: number;
    createdAt: number;
  }>;

  // Race condition prevention
  loadPromise: Promise<void> | null;
  
  // UI state (not user-scoped)
  isPrivate: boolean;
  search: string;
  filterType: string | null;
  
  // User management
  setCurrentUser: (userId: string) => Promise<void>;
  clearCurrentUser: () => void;
  
  // UI actions
  setIsPrivate: (value: boolean) => void;
  setSearch: (value: string) => void;
  setFilterType: (value: string | null) => void;
  
  // Holdings actions (user-scoped) - now with backend sync
  setHoldings: (holdings: Holding[]) => void;
  addHolding: (holding: Holding, syncToBackend?: boolean) => Promise<void>;
  updateHolding: (symbol: string, holding: Holding, syncToBackend?: boolean) => Promise<void>;
  removeHolding: (symbol: string, syncToBackend?: boolean) => Promise<void>;
  
  // Backend sync actions
  loadFromBackend: () => Promise<void>;
  syncToBackend: () => Promise<void>;
  retryPendingOperations: () => Promise<void>;
  clearSyncError: () => void;
  
  // Watchlist actions (user-scoped)
  addToWatchlist: (item: Omit<WatchlistItem, 'addedAt'>) => void;
  removeFromWatchlist: (symbol: string) => void;
  isInWatchlist: (symbol: string) => boolean;
  setWatchlistAlert: (symbol: string, alertPrice: number | undefined, alertType?: 'above' | 'below') => void;
  
  // Computed getters
  getHoldings: () => Holding[];
  getWatchlist: () => WatchlistItem[];
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentUserId: null,
      userHoldings: {},
      userWatchlists: {},
      isSyncing: false,
      lastSyncError: null,
      lastSyncTime: null,
      syncStatus: 'idle',
      pendingOperations: [],
      loadPromise: null,
      isPrivate: false,
      search: '',
      filterType: null,
      
      // Computed holdings for current user
      getHoldings: () => {
        const { currentUserId, userHoldings } = get();
        if (!currentUserId) return [];
        return userHoldings[currentUserId] || [];
      },
      
      // Computed watchlist for current user
      getWatchlist: () => {
        const { currentUserId, userWatchlists } = get();
        if (!currentUserId) return [];
        return userWatchlists[currentUserId] || [];
      },
      
      // Set current user on login/restore - also loads from backend
      // Now async to ensure callers can await the backend load
      setCurrentUser: async (userId: string) => {
        set((state) => {
          const userHoldings = { ...state.userHoldings };
          const userWatchlists = { ...state.userWatchlists };

          if (!userHoldings[userId]) {
            userHoldings[userId] = [];
          }
          if (!userWatchlists[userId]) {
            userWatchlists[userId] = [];
          }

          return { currentUserId: userId, userHoldings, userWatchlists };
        });

        // Load from backend after setting user - now awaited
        await get().loadFromBackend();
      },
      
      // Clear current user on logout
      clearCurrentUser: () => {
        set({ currentUserId: null });
      },
      
      // UI actions
      setIsPrivate: (value) => set({ isPrivate: value }),
      setSearch: (value) => set({ search: value }),
      setFilterType: (value) => set({ filterType: value }),
      
      // Load holdings from backend with race condition protection and retry logic
      loadFromBackend: async () => {
        const state = get();
        const { currentUserId, loadPromise } = state;
        if (!currentUserId) return;

        // If already loading, return existing promise (deduplication)
        if (loadPromise) {
          storeLogger.info('[Portfolio] Load already in progress, reusing promise');
          return loadPromise;
        }

        // Retry configuration
        const MAX_RETRIES = 3;
        const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

        // Create new load promise with retry logic
        const newLoadPromise = (async () => {
          set({ isSyncing: true, lastSyncError: null, syncStatus: 'syncing' });

          let lastError: Error | null = null;

          for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
            try {
              const portfolio = await portfolioService.getPortfolio();
              const holdings: Holding[] = portfolio.holdings.map(h => ({
                symbol: h.symbol,
                name: h.name,
                type: h.type,
                quantity: h.quantity,
                avgCost: h.avgCost,
                currentPrice: h.currentPrice || h.avgCost,
                dayPL: 0,
                addedAt: h.addedAt,
              }));

              set((state) => ({
                isSyncing: false,
                syncStatus: 'idle',
                lastSyncTime: Date.now(),
                loadPromise: null,
                userHoldings: {
                  ...state.userHoldings,
                  [currentUserId]: holdings
                }
              }));

              storeLogger.info(`Loaded ${holdings.length} holdings from backend`);
              return; // Success - exit retry loop
            } catch (error) {
              lastError = error as Error;

              // Don't retry on auth errors (401) - they need re-authentication
              if ((error as { status?: number }).status === 401) {
                storeLogger.warn('[Portfolio] Auth error, not retrying');
                break;
              }

              // Check if we should retry
              if (attempt < MAX_RETRIES - 1) {
                const delay = RETRY_DELAYS[attempt];
                storeLogger.warn(`[Portfolio] Load failed, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          }

          // All retries failed
          storeLogger.error('[Portfolio] Failed to load from backend after retries:', lastError);
          set({
            isSyncing: false,
            loadPromise: null,
            lastSyncError: lastError ? String(lastError) : 'Unknown error',
            syncStatus: navigator.onLine ? 'error' : 'offline'
          });
          // Keep local data if backend fails
        })();

        // Store promise in state
        set({ loadPromise: newLoadPromise });
        return newLoadPromise;
      },
      
      // Sync all local holdings to backend
      syncToBackend: async () => {
        const { currentUserId, userHoldings } = get();
        if (!currentUserId) return;
        
        const holdings = userHoldings[currentUserId] || [];
        set({ isSyncing: true, lastSyncError: null, syncStatus: 'syncing' });
        
        try {
          await portfolioService.syncLocalToBackend(holdings);
          set({ isSyncing: false, syncStatus: 'idle', lastSyncTime: Date.now() });
          storeLogger.info(`Synced ${holdings.length} holdings to backend`);
        } catch (error) {
          storeLogger.error('Failed to sync to backend:', error as Error);
          set({ 
            isSyncing: false, 
            lastSyncError: String(error),
            syncStatus: navigator.onLine ? 'error' : 'offline'
          });
        }
      },

      // Retry failed pending operations with exponential backoff
      retryPendingOperations: async () => {
        const { pendingOperations, currentUserId } = get();
        if (!currentUserId || pendingOperations.length === 0) return;

        storeLogger.info(`Retrying ${pendingOperations.length} pending operations`);
        set({ syncStatus: 'syncing' });

        const maxRetries = 3;
        const remainingOps: typeof pendingOperations = [];

        for (const op of pendingOperations) {
          if (op.retryCount >= maxRetries) {
            storeLogger.warn(`Operation ${op.id} exceeded max retries, discarding`, { symbol: op.symbol, type: op.type });
            continue;
          }

          try {
            switch (op.type) {
              case 'add':
                if (op.data) await portfolioService.addHolding(op.data);
                break;
              case 'update':
                if (op.data) await portfolioService.updateHolding(op.symbol, op.data);
                break;
              case 'remove':
                await portfolioService.removeHolding(op.symbol);
                break;
            }
            storeLogger.info(`Retry succeeded for ${op.type} ${op.symbol}`);
          } catch {
            storeLogger.warn(`Retry failed for ${op.type} ${op.symbol}`, { retryCount: op.retryCount + 1 });
            remainingOps.push({ ...op, retryCount: op.retryCount + 1 });
          }
        }

        set({ 
          pendingOperations: remainingOps,
          syncStatus: remainingOps.length > 0 ? 'error' : 'idle',
          lastSyncError: remainingOps.length > 0 ? `${remainingOps.length} operations pending` : null,
          lastSyncTime: Date.now()
        });
      },

      // Clear sync error state
      clearSyncError: () => {
        set({ lastSyncError: null, syncStatus: 'idle' });
      },
      
      // Holdings actions - user-scoped with backend sync
      setHoldings: (holdings) => {
        const { currentUserId } = get();
        if (!currentUserId) return;
        
        set((state) => ({
          userHoldings: {
            ...state.userHoldings,
            [currentUserId]: holdings
          }
        }));
      },
      
      addHolding: async (holding, syncToBackend = true) => {
        const { currentUserId, userHoldings } = get();
        if (!currentUserId) return;
        
        const currentHoldings = userHoldings[currentUserId] || [];
        const operationId = `add-${holding.symbol}-${Date.now()}`;
        
        // Update local state immediately (optimistic update)
        set((state) => ({
          userHoldings: {
            ...state.userHoldings,
            [currentUserId]: [...currentHoldings, {
              ...holding,
              addedAt: holding.addedAt || new Date().toISOString()
            }]
          }
        }));
        
        // Sync to backend with rollback on failure
        if (syncToBackend) {
          try {
            await portfolioService.addHolding(holding);
            storeLogger.info(`Added ${holding.symbol} to backend`);
            set({ lastSyncTime: Date.now(), syncStatus: 'idle' });
          } catch (error) {
            storeLogger.error(`Failed to add ${holding.symbol} to backend:`, error as Error);
            // Add to pending operations for retry instead of silent failure
            set((state) => ({
              pendingOperations: [...state.pendingOperations, {
                id: operationId,
                type: 'add' as const,
                symbol: holding.symbol,
                data: holding,
                retryCount: 0,
                createdAt: Date.now()
              }],
              syncStatus: 'error',
              lastSyncError: `Failed to sync ${holding.symbol}: ${String(error)}`
            }));
          }
        }
      },
      
      updateHolding: async (symbol, holding, syncToBackend = true) => {
        const { currentUserId, userHoldings } = get();
        if (!currentUserId) return;
        
        const currentHoldings = userHoldings[currentUserId] || [];
        const operationId = `update-${symbol}-${Date.now()}`;
        
        // Update local state immediately (optimistic update)
        set((state) => ({
          userHoldings: {
            ...state.userHoldings,
            [currentUserId]: currentHoldings.map(h => h.symbol === symbol ? holding : h)
          }
        }));
        
        // Sync to backend with rollback on failure
        if (syncToBackend) {
          try {
            await portfolioService.updateHolding(symbol, holding);
            storeLogger.info(`Updated ${symbol} in backend`);
            set({ lastSyncTime: Date.now(), syncStatus: 'idle' });
          } catch (error) {
            storeLogger.error(`Failed to update ${symbol} in backend:`, error as Error);
            // Add to pending operations for retry
            set((state) => ({
              pendingOperations: [...state.pendingOperations, {
                id: operationId,
                type: 'update' as const,
                symbol,
                data: holding,
                retryCount: 0,
                createdAt: Date.now()
              }],
              syncStatus: 'error',
              lastSyncError: `Failed to sync update for ${symbol}: ${String(error)}`
            }));
          }
        }
      },
      
      removeHolding: async (symbol, syncToBackend = true) => {
        const { currentUserId, userHoldings } = get();
        if (!currentUserId) return;
        
        const currentHoldings = userHoldings[currentUserId] || [];
        const removedHolding = currentHoldings.find(h => h.symbol === symbol);
        const operationId = `remove-${symbol}-${Date.now()}`;
        
        // Update local state immediately (optimistic update)
        set((state) => ({
          userHoldings: {
            ...state.userHoldings,
            [currentUserId]: currentHoldings.filter(h => h.symbol !== symbol)
          }
        }));
        
        // Sync to backend with rollback on failure
        if (syncToBackend) {
          try {
            await portfolioService.removeHolding(symbol);
            storeLogger.info(`Removed ${symbol} from backend`);
            set({ lastSyncTime: Date.now(), syncStatus: 'idle' });
          } catch (error) {
            storeLogger.error(`Failed to remove ${symbol} from backend:`, error as Error);
            // Rollback: restore the holding locally if backend delete failed
            if (removedHolding) {
              set((state) => ({
                userHoldings: {
                  ...state.userHoldings,
                  [currentUserId]: [...(state.userHoldings[currentUserId] || []), removedHolding]
                },
                pendingOperations: [...state.pendingOperations, {
                  id: operationId,
                  type: 'remove' as const,
                  symbol,
                  retryCount: 0,
                  createdAt: Date.now()
                }],
                syncStatus: 'error',
                lastSyncError: `Failed to remove ${symbol}: ${String(error)}`
              }));
            }
          }
        }
      },
      
      // Watchlist actions - user-scoped
      addToWatchlist: (item) => {
        const { currentUserId, userWatchlists } = get();
        if (!currentUserId) return;
        
        const currentWatchlist = userWatchlists[currentUserId] || [];
        const newItem: WatchlistItem = { ...item, addedAt: new Date().toISOString() };
        
        set((state) => ({
          userWatchlists: {
            ...state.userWatchlists,
            [currentUserId]: [...currentWatchlist, newItem]
          }
        }));
      },
      
      removeFromWatchlist: (symbol) => {
        const { currentUserId, userWatchlists } = get();
        if (!currentUserId) return;
        
        const currentWatchlist = userWatchlists[currentUserId] || [];
        set((state) => ({
          userWatchlists: {
            ...state.userWatchlists,
            [currentUserId]: currentWatchlist.filter(w => w.symbol !== symbol)
          }
        }));
      },
      
      isInWatchlist: (symbol) => {
        const { currentUserId, userWatchlists } = get();
        if (!currentUserId) return false;
        
        const currentWatchlist = userWatchlists[currentUserId] || [];
        return currentWatchlist.some(w => w.symbol.toUpperCase() === symbol.toUpperCase());
      },
      
      setWatchlistAlert: (symbol, alertPrice, alertType) => {
        const { currentUserId, userWatchlists } = get();
        if (!currentUserId) return;
        
        const currentWatchlist = userWatchlists[currentUserId] || [];
        set((state) => ({
          userWatchlists: {
            ...state.userWatchlists,
            [currentUserId]: currentWatchlist.map(w => 
              w.symbol === symbol ? { ...w, alertPrice, alertType } : w
            )
          }
        }));
      },
    }),
    {
      name: 'finpulse-portfolio-v2',
      version: 2,
      partialize: (state) => ({
        currentUserId: state.currentUserId,
        userHoldings: state.userHoldings,
        userWatchlists: state.userWatchlists,
        isPrivate: state.isPrivate,
      }),
    }
  )
);

export type { Holding, WatchlistItem, AssetType };

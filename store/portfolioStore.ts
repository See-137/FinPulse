import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Holding } from '../types';
import { portfolioService } from '../services/portfolioService';

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
  
  // Sync state
  isSyncing: boolean;
  lastSyncError: string | null;
  
  // UI state (not user-scoped)
  isPrivate: boolean;
  search: string;
  filterType: string | null;
  
  // User management
  setCurrentUser: (userId: string) => void;
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
      setCurrentUser: (userId: string) => {
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
        
        // Load from backend after setting user
        get().loadFromBackend();
      },
      
      // Clear current user on logout
      clearCurrentUser: () => {
        set({ currentUserId: null });
      },
      
      // UI actions
      setIsPrivate: (value) => set({ isPrivate: value }),
      setSearch: (value) => set({ search: value }),
      setFilterType: (value) => set({ filterType: value }),
      
      // Load holdings from backend
      loadFromBackend: async () => {
        const { currentUserId } = get();
        if (!currentUserId) return;
        
        set({ isSyncing: true, lastSyncError: null });
        
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
          }));
          
          set((state) => ({
            isSyncing: false,
            userHoldings: {
              ...state.userHoldings,
              [currentUserId]: holdings
            }
          }));
          
          console.log(`Loaded ${holdings.length} holdings from backend`);
        } catch (error) {
          console.error('Failed to load from backend:', error);
          set({ isSyncing: false, lastSyncError: String(error) });
          // Keep local data if backend fails
        }
      },
      
      // Sync all local holdings to backend
      syncToBackend: async () => {
        const { currentUserId, userHoldings } = get();
        if (!currentUserId) return;
        
        const holdings = userHoldings[currentUserId] || [];
        set({ isSyncing: true, lastSyncError: null });
        
        try {
          await portfolioService.syncLocalToBackend(holdings);
          set({ isSyncing: false });
          console.log(`Synced ${holdings.length} holdings to backend`);
        } catch (error) {
          console.error('Failed to sync to backend:', error);
          set({ isSyncing: false, lastSyncError: String(error) });
        }
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
        
        // Update local state immediately
        set((state) => ({
          userHoldings: {
            ...state.userHoldings,
            [currentUserId]: [...currentHoldings, holding]
          }
        }));
        
        // Sync to backend
        if (syncToBackend) {
          try {
            await portfolioService.addHolding(holding);
            console.log(`Added ${holding.symbol} to backend`);
          } catch (error) {
            console.error(`Failed to add ${holding.symbol} to backend:`, error);
          }
        }
      },
      
      updateHolding: async (symbol, holding, syncToBackend = true) => {
        const { currentUserId, userHoldings } = get();
        if (!currentUserId) return;
        
        const currentHoldings = userHoldings[currentUserId] || [];
        
        // Update local state immediately
        set((state) => ({
          userHoldings: {
            ...state.userHoldings,
            [currentUserId]: currentHoldings.map(h => h.symbol === symbol ? holding : h)
          }
        }));
        
        // Sync to backend
        if (syncToBackend) {
          try {
            await portfolioService.updateHolding(symbol, holding);
            console.log(`Updated ${symbol} in backend`);
          } catch (error) {
            console.error(`Failed to update ${symbol} in backend:`, error);
          }
        }
      },
      
      removeHolding: async (symbol, syncToBackend = true) => {
        const { currentUserId, userHoldings } = get();
        if (!currentUserId) return;
        
        const currentHoldings = userHoldings[currentUserId] || [];
        
        // Update local state immediately
        set((state) => ({
          userHoldings: {
            ...state.userHoldings,
            [currentUserId]: currentHoldings.filter(h => h.symbol !== symbol)
          }
        }));
        
        // Sync to backend
        if (syncToBackend) {
          try {
            await portfolioService.removeHolding(symbol);
            console.log(`Removed ${symbol} from backend`);
          } catch (error) {
            console.error(`Failed to remove ${symbol} from backend:`, error);
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

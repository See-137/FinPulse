import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type AssetType = 'CRYPTO' | 'STOCK' | 'COMMODITY';

interface Holding {
  symbol: string;
  name: string;
  type: AssetType;
  quantity: number;
  avgCost: number;
  currentPrice: number;
  dayPL: number;
}

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
  
  // Holdings actions (user-scoped)
  setHoldings: (holdings: Holding[]) => void;
  addHolding: (holding: Holding) => void;
  updateHolding: (symbol: string, holding: Holding) => void;
  removeHolding: (symbol: string) => void;
  
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
      
      // Set current user on login/restore
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
      },
      
      // Clear current user on logout
      clearCurrentUser: () => {
        set({ currentUserId: null });
      },
      
      // UI actions
      setIsPrivate: (value) => set({ isPrivate: value }),
      setSearch: (value) => set({ search: value }),
      setFilterType: (value) => set({ filterType: value }),
      
      // Holdings actions - user-scoped
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
      
      addHolding: (holding) => {
        const { currentUserId, userHoldings } = get();
        if (!currentUserId) return;
        
        const currentHoldings = userHoldings[currentUserId] || [];
        set((state) => ({
          userHoldings: {
            ...state.userHoldings,
            [currentUserId]: [...currentHoldings, holding]
          }
        }));
      },
      
      updateHolding: (symbol, holding) => {
        const { currentUserId, userHoldings } = get();
        if (!currentUserId) return;
        
        const currentHoldings = userHoldings[currentUserId] || [];
        set((state) => ({
          userHoldings: {
            ...state.userHoldings,
            [currentUserId]: currentHoldings.map(h => h.symbol === symbol ? holding : h)
          }
        }));
      },
      
      removeHolding: (symbol) => {
        const { currentUserId, userHoldings } = get();
        if (!currentUserId) return;
        
        const currentHoldings = userHoldings[currentUserId] || [];
        set((state) => ({
          userHoldings: {
            ...state.userHoldings,
            [currentUserId]: currentHoldings.filter(h => h.symbol !== symbol)
          }
        }));
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

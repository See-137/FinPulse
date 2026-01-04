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
  alertPrice?: number; // Optional price alert
  alertType?: 'above' | 'below';
}

interface PortfolioState {
  isPrivate: boolean;
  search: string;
  filterType: string | null;
  holdings: Holding[];
  watchlist: WatchlistItem[];
  setIsPrivate: (value: boolean) => void;
  setSearch: (value: string) => void;
  setFilterType: (value: string | null) => void;
  setHoldings: (holdings: Holding[]) => void;
  addHolding: (holding: Holding) => void;
  updateHolding: (symbol: string, holding: Holding) => void;
  removeHolding: (symbol: string) => void;
  // Watchlist actions
  addToWatchlist: (item: Omit<WatchlistItem, 'addedAt'>) => void;
  removeFromWatchlist: (symbol: string) => void;
  isInWatchlist: (symbol: string) => boolean;
  setWatchlistAlert: (symbol: string, alertPrice: number | undefined, alertType?: 'above' | 'below') => void;
}

const STORAGE_KEY = 'finpulse_mirror_holdings';
const WATCHLIST_STORAGE_KEY = 'finpulse_watchlist';

// Load initial holdings from localStorage
const loadInitialHoldings = (): Holding[] => {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
};

// Load initial watchlist from localStorage
const loadInitialWatchlist = (): WatchlistItem[] => {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(WATCHLIST_STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
};

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      isPrivate: false,
      search: '',
      filterType: null,
      holdings: loadInitialHoldings(),
      watchlist: loadInitialWatchlist(),
      setIsPrivate: (value) => set({ isPrivate: value }),
      setSearch: (value) => set({ search: value }),
      setFilterType: (value) => set({ filterType: value }),
      setHoldings: (holdings) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
        set({ holdings });
      },
      addHolding: (holding) => {
        const holdings = [...get().holdings, holding];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
        set({ holdings });
      },
      updateHolding: (symbol, holding) => {
        const holdings = get().holdings.map(h => h.symbol === symbol ? holding : h);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
        set({ holdings });
      },
      removeHolding: (symbol) => {
        const holdings = get().holdings.filter(h => h.symbol !== symbol);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
        set({ holdings });
      },
      // Watchlist actions
      addToWatchlist: (item) => {
        const watchlist = [...get().watchlist, { ...item, addedAt: new Date().toISOString() }];
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
        set({ watchlist });
      },
      removeFromWatchlist: (symbol) => {
        const watchlist = get().watchlist.filter(w => w.symbol !== symbol);
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
        set({ watchlist });
      },
      isInWatchlist: (symbol) => {
        return get().watchlist.some(w => w.symbol.toUpperCase() === symbol.toUpperCase());
      },
      setWatchlistAlert: (symbol, alertPrice, alertType) => {
        const watchlist = get().watchlist.map(w => 
          w.symbol === symbol ? { ...w, alertPrice, alertType } : w
        );
        localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist));
        set({ watchlist });
      },
    }),
    {
      name: 'finpulse-portfolio-preferences',
      partialize: (state) => ({ 
        isPrivate: state.isPrivate,
        // Don't persist holdings/watchlist here - we use separate localStorage keys
      }),
    }
  )
);

export type { Holding, WatchlistItem, AssetType };

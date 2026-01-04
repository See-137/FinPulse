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

interface PortfolioState {
  isPrivate: boolean;
  search: string;
  filterType: string | null;
  holdings: Holding[];
  setIsPrivate: (value: boolean) => void;
  setSearch: (value: string) => void;
  setFilterType: (value: string | null) => void;
  setHoldings: (holdings: Holding[]) => void;
  addHolding: (holding: Holding) => void;
  updateHolding: (symbol: string, holding: Holding) => void;
  removeHolding: (symbol: string) => void;
}

const STORAGE_KEY = 'finpulse_mirror_holdings';

// Load initial holdings from localStorage
const loadInitialHoldings = (): Holding[] => {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
};

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      isPrivate: false,
      search: '',
      filterType: null,
      holdings: loadInitialHoldings(),
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
    }),
    {
      name: 'finpulse-portfolio-preferences',
      partialize: (state) => ({ 
        isPrivate: state.isPrivate,
        // Don't persist holdings here - we use separate localStorage key
      }),
    }
  )
);

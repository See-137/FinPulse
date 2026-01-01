import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PortfolioState {
  isPrivate: boolean;
  search: string;
  filterType: string | null;
  setIsPrivate: (value: boolean) => void;
  setSearch: (value: string) => void;
  setFilterType: (value: string | null) => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
      isPrivate: false,
      search: '',
      filterType: null,
      setIsPrivate: (value) => set({ isPrivate: value }),
      setSearch: (value) => set({ search: value }),
      setFilterType: (value) => set({ filterType: value }),
    }),
    {
      name: 'finpulse-portfolio-preferences',
    }
  )
);

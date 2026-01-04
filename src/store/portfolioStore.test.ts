/**
 * Portfolio Store Tests
 * Tests for Zustand portfolio state management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePortfolioStore } from '../../store/portfolioStore';

describe('portfolioStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    usePortfolioStore.setState({
      holdings: [],
      isPrivate: false,
      search: '',
      filterType: null,
    });
  });

  describe('addHolding', () => {
    it('should add a new holding to the portfolio', () => {
      const store = usePortfolioStore.getState();
      
      store.addHolding({
        symbol: 'BTC',
        name: 'Bitcoin',
        quantity: 1,
        avgCost: 45000,
        type: 'CRYPTO',
        currentPrice: 48000,
        dayPL: 2.5,
      });

      const state = usePortfolioStore.getState();
      expect(state.holdings).toHaveLength(1);
      expect(state.holdings[0].symbol).toBe('BTC');
    });

    it('should add multiple different holdings', () => {
      const store = usePortfolioStore.getState();
      
      store.addHolding({
        symbol: 'ETH',
        name: 'Ethereum',
        quantity: 2,
        avgCost: 2500,
        type: 'CRYPTO',
        currentPrice: 2800,
        dayPL: -1.2,
      });

      store.addHolding({
        symbol: 'BTC',
        name: 'Bitcoin',
        quantity: 3,
        avgCost: 2800,
        type: 'CRYPTO',
        currentPrice: 48000,
        dayPL: 3.0,
      });

      const state = usePortfolioStore.getState();
      expect(state.holdings).toHaveLength(2);
    });
  });

  describe('removeHolding', () => {
    it('should remove a holding by symbol', () => {
      const store = usePortfolioStore.getState();
      
      store.addHolding({
        symbol: 'BTC',
        name: 'Bitcoin',
        quantity: 1,
        avgCost: 45000,
        type: 'CRYPTO',
        currentPrice: 48000,
        dayPL: 2.5,
      });

      store.removeHolding('BTC');

      const state = usePortfolioStore.getState();
      expect(state.holdings).toHaveLength(0);
    });
  });

  describe('updateHolding', () => {
    it('should update an existing holding', () => {
      const store = usePortfolioStore.getState();
      
      store.addHolding({
        symbol: 'BTC',
        name: 'Bitcoin',
        quantity: 1,
        avgCost: 45000,
        type: 'CRYPTO',
        currentPrice: 48000,
        dayPL: 2.5,
      });

      store.updateHolding('BTC', {
        symbol: 'BTC',
        name: 'Bitcoin',
        quantity: 2,
        avgCost: 46000,
        type: 'CRYPTO',
        currentPrice: 50000,
        dayPL: 4.0,
      });

      const state = usePortfolioStore.getState();
      expect(state.holdings).toHaveLength(1);
      expect(state.holdings[0].quantity).toBe(2);
      expect(state.holdings[0].avgCost).toBe(46000);
    });
  });

  describe('privacy toggle', () => {
    it('should toggle privacy mode', () => {
      const store = usePortfolioStore.getState();
      
      expect(store.isPrivate).toBe(false);
      
      store.setIsPrivate(true);
      
      expect(usePortfolioStore.getState().isPrivate).toBe(true);
    });
  });

  describe('search and filter', () => {
    it('should update search term', () => {
      const store = usePortfolioStore.getState();
      
      store.setSearch('BTC');
      
      expect(usePortfolioStore.getState().search).toBe('BTC');
    });

    it('should update filter type', () => {
      const store = usePortfolioStore.getState();
      
      store.setFilterType('CRYPTO');
      
      expect(usePortfolioStore.getState().filterType).toBe('CRYPTO');
    });
  });
});

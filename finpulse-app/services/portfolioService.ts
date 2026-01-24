/**
 * Portfolio API Service
 * Handles backend persistence of user holdings and watchlist
 */

import { config } from '../config';
import { Holding } from '../types';
import { createLogger } from './logger';

const portfolioLogger = createLogger('Portfolio');

export type { Holding };

export interface PortfolioData {
  holdings: Holding[];
  totalValue?: number;
  lastUpdated?: string;
}

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('finpulse_id_token');
};

// API helper with auth
const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(`${config.apiUrl}${endpoint}`, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }
  
  return response.json();
};

/**
 * Portfolio API Service
 */
export const portfolioService = {
  /**
   * Get user's portfolio from backend
   */
  async getPortfolio(): Promise<PortfolioData> {
    try {
      const result = await fetchWithAuth('/portfolio');
      if (result.success) {
        // Lambda returns { success: true, data: { holdings: [...], ... } }
        const data = result.data || result;
        const holdings = data.holdings || [];
        return {
          holdings: holdings.map((h: any) => ({
            symbol: h.symbol,
            name: h.name || h.symbol,
            type: h.type?.toUpperCase() || 'CRYPTO',
            quantity: h.quantity,
            avgCost: h.avgBuyPrice || h.avgCost || 0,
            currentPrice: h.currentPrice || 0,
            notes: h.notes || '',
            addedAt: h.addedAt,
          })),
          totalValue: data.totalValue,
          lastUpdated: data.lastUpdated,
        };
      }
      throw new Error(result.error || 'Failed to get portfolio');
    } catch (error) {
      portfolioLogger.error('Failed to fetch portfolio:', error as Error);
      throw error;
    }
  },

  /**
   * Add a new holding to portfolio
   */
  async addHolding(holding: Holding): Promise<Holding> {
    try {
      const result = await fetchWithAuth('/portfolio/holdings', {
        method: 'POST',
        body: JSON.stringify({
          symbol: holding.symbol.toUpperCase(),
          name: holding.name,
          type: holding.type.toLowerCase(),
          quantity: holding.quantity,
          avgBuyPrice: holding.avgCost,
          currentPrice: holding.currentPrice || holding.avgCost,
        }),
      });
      
      if (result.success) {
        // Lambda returns { success: true, data: holding }
        const data = result.data || result.holding;
        return {
          symbol: data.symbol,
          name: data.name || data.symbol,
          type: data.type?.toUpperCase() || holding.type,
          quantity: data.quantity,
          avgCost: data.avgBuyPrice || data.avgCost,
          currentPrice: data.currentPrice,
          dayPL: data.dayPL ?? 0,
        };
      }
      throw new Error(result.error || 'Failed to add holding');
    } catch (error) {
      portfolioLogger.error('Failed to add holding:', error as Error);
      throw error;
    }
  },

  /**
   * Update an existing holding
   */
  async updateHolding(symbol: string, updates: Partial<Holding>): Promise<Holding> {
    try {
      const result = await fetchWithAuth(`/portfolio/holdings/${symbol}`, {
        method: 'PUT',
        body: JSON.stringify({
          quantity: updates.quantity,
          avgBuyPrice: updates.avgCost,
          currentPrice: updates.currentPrice,
        }),
      });
      
      if (result.success) {
        // Lambda returns { success: true, data: holding }
        const data = result.data || result.holding;
        return {
          symbol: data.symbol,
          name: data.name || data.symbol,
          type: data.type?.toUpperCase() || 'CRYPTO',
          quantity: data.quantity,
          avgCost: data.avgBuyPrice || data.avgCost,
          currentPrice: data.currentPrice,
          dayPL: data.dayPL ?? 0,
        };
      }
      throw new Error(result.error || 'Failed to update holding');
    } catch (error) {
      portfolioLogger.error('Failed to update holding:', error as Error);
      throw error;
    }
  },

  /**
   * Remove a holding from portfolio
   */
  async removeHolding(symbol: string): Promise<void> {
    try {
      const result = await fetchWithAuth(`/portfolio/holdings/${symbol}`, {
        method: 'DELETE',
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove holding');
      }
    } catch (error) {
      portfolioLogger.error('Failed to remove holding:', error as Error);
      throw error;
    }
  },

  /**
   * Batch sync holdings to backend (10x faster than sequential)
   * Uses parallel processing on backend
   */
  async batchSync(holdings: Holding[], operations?: ('add' | 'update' | 'remove')[]): Promise<{
    added: Holding[];
    updated: Holding[];
    failed: { symbol: string; error: string }[];
  }> {
    if (holdings.length === 0) {
      return { added: [], updated: [], failed: [] };
    }

    portfolioLogger.info(`Batch syncing ${holdings.length} holdings to backend...`);

    try {
      const result = await fetchWithAuth('/portfolio/batch', {
        method: 'POST',
        body: JSON.stringify({
          holdings: holdings.map(h => ({
            symbol: h.symbol.toUpperCase(),
            name: h.name,
            type: h.type.toLowerCase(),
            quantity: h.quantity,
            avgBuyPrice: h.avgCost,
            currentPrice: h.currentPrice || h.avgCost,
          })),
          operations: operations || holdings.map(() => 'add'),
        }),
      });

      if (result.success) {
        portfolioLogger.info(`Batch sync complete: ${result.summary?.added || 0} added, ${result.summary?.failed || 0} failed`);
        return result.data;
      }
      throw new Error(result.error || 'Batch sync failed');
    } catch (error) {
      portfolioLogger.error('Batch sync failed:', error as Error);
      throw error;
    }
  },

  /**
   * Sync local holdings to backend (for migration)
   * Uses batch endpoint for 10x faster sync
   */
  async syncLocalToBackend(holdings: Holding[]): Promise<void> {
    portfolioLogger.info(`Syncing ${holdings.length} holdings to backend...`);

    // Use batch sync for better performance
    try {
      const result = await this.batchSync(holdings);
      portfolioLogger.info(`Synced ${result.added.length} holdings, ${result.failed.length} failed`);

      if (result.failed.length > 0) {
        portfolioLogger.warn('Some holdings failed to sync:', result.failed);
      }
    } catch (error) {
      portfolioLogger.error('Batch sync failed, falling back to sequential:', error as Error);

      // Fallback to sequential for older backends
      for (const holding of holdings) {
        try {
          await this.addHolding(holding);
          portfolioLogger.debug(`Synced: ${holding.symbol}`);
        } catch (err) {
          portfolioLogger.error(`Failed to sync ${holding.symbol}:`, err as Error);
        }
      }
    }
  },

  /**
   * Check if user has any data in backend
   */
  async hasBackendData(): Promise<boolean> {
    try {
      const portfolio = await this.getPortfolio();
      return portfolio.holdings.length > 0;
    } catch {
      return false;
    }
  },
};

export default portfolioService;

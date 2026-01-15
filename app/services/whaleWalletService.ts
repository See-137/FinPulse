/**
 * Whale Wallet Service
 *
 * Aggregates whale wallet activity from multiple sources and converts
 * to WhaleSignal format for the signal analysis framework.
 */

import { getWhaleAlertClient } from './dataProviders/whaleAlertAPI';
import { cacheService, getWhaleDataCacheKey } from './cacheService';
import { apiConfig } from '../config/apiKeys';
import type { WhaleTransaction, WhaleMetrics, WhaleSignal, SignalDirection } from '../types';

export class WhaleWalletService {
  /**
   * Get whale metrics for a symbol (cached)
   */
  async getWhaleMetrics(symbol: string): Promise<WhaleMetrics> {
    // Check if live data enabled
    if (!apiConfig.features.liveWhaleData || !apiConfig.whaleAlert.enabled) {
      return this.generateMockMetrics(symbol);
    }

    // Try cache first
    const cacheKey = getWhaleDataCacheKey(symbol);
    const cached = await cacheService.getOrSet(
      cacheKey,
      () => this.fetchWhaleMetrics(symbol),
      apiConfig.cache.whaleDataTTL
    );

    return cached;
  }

  /**
   * Fetch whale metrics from API
   */
  private async fetchWhaleMetrics(symbol: string): Promise<WhaleMetrics> {
    try {
      const client = getWhaleAlertClient();
      const transactions = await client.getTransactionsBySymbol(symbol, 1000000); // $1M+

      return this.calculateMetrics(symbol, transactions);
    } catch (error) {
      console.error(`Error fetching whale metrics for ${symbol}:`, error);
      // Fallback to mock data
      return this.generateMockMetrics(symbol);
    }
  }

  /**
   * Calculate aggregated metrics from transactions
   */
  private calculateMetrics(symbol: string, transactions: WhaleTransaction[]): WhaleMetrics {
    let totalInflow = 0;
    let totalOutflow = 0;
    let largeTransfers = 0;

    const now = Date.now();
    const last24h = now - 86400000;

    // Filter to last 24h and aggregate
    const recentTxs = transactions.filter(tx => tx.timestamp >= last24h);

    for (const tx of recentTxs) {
      if (tx.amountUSD >= 1000000) {
        largeTransfers++;
      }

      if (tx.type === 'exchange_inflow') {
        totalInflow += tx.amountUSD;
      } else if (tx.type === 'exchange_outflow') {
        totalOutflow += tx.amountUSD;
      }
    }

    const netFlow = totalOutflow - totalInflow; // Positive = accumulation (leaving exchanges)

    return {
      symbol,
      netFlow24h: netFlow,
      largeTransfers,
      topHolderChange: 0, // Would need additional data source
      exchangeReserves: {
        inflow: totalInflow,
        outflow: totalOutflow,
        net: netFlow,
      },
    };
  }

  /**
   * Get recent large transactions
   */
  async getLargeTransactions(
    symbol: string,
    minUSD: number = 1000000
  ): Promise<WhaleTransaction[]> {
    if (!apiConfig.features.liveWhaleData || !apiConfig.whaleAlert.enabled) {
      return this.generateMockTransactions(symbol, 5);
    }

    try {
      const client = getWhaleAlertClient();
      return await client.getTransactionsBySymbol(symbol, minUSD);
    } catch (error) {
      console.error(`Error fetching large transactions for ${symbol}:`, error);
      return this.generateMockTransactions(symbol, 5);
    }
  }

  /**
   * Convert whale metrics to WhaleSignal format
   */
  convertToWhaleSignal(metrics: WhaleMetrics): WhaleSignal {
    // Determine direction based on net flow
    let direction: SignalDirection = 'neutral';
    let activity: 'accumulation' | 'distribution' | 'neutral' = 'neutral';

    const flowThreshold = 10000000; // $10M threshold

    if (metrics.netFlow24h > flowThreshold) {
      direction = 'bullish';
      activity = 'accumulation'; // Whales removing from exchanges = bullish
    } else if (metrics.netFlow24h < -flowThreshold) {
      direction = 'bearish';
      activity = 'distribution'; // Whales moving to exchanges = bearish
    }

    // Calculate confidence score (0-100)
    // Based on magnitude of net flow and number of large transfers
    const flowMagnitude = Math.abs(metrics.netFlow24h) / 1000000; // In millions
    const transferBonus = Math.min(metrics.largeTransfers * 2, 20); // Max 20 points

    let score = Math.min(100, flowMagnitude + transferBonus);

    // Neutral signals get lower scores
    if (direction === 'neutral') {
      score = Math.max(30, score * 0.5);
    }

    return {
      symbol: metrics.symbol,
      direction,
      score: Math.round(score),
      activity,
      volumeIndicator: Math.abs(metrics.netFlow24h) / 1000000, // In millions
      timestamp: Date.now(),
    };
  }

  /**
   * Generate mock metrics for testing
   */
  private generateMockMetrics(symbol: string): WhaleMetrics {
    // Generate realistic mock data
    const netFlow = (Math.random() - 0.5) * 50000000; // -$25M to +$25M
    const largeTransfers = Math.floor(Math.random() * 20) + 5; // 5-25 transfers

    return {
      symbol,
      netFlow24h: netFlow,
      largeTransfers,
      topHolderChange: (Math.random() - 0.5) * 2, // -1% to +1%
      exchangeReserves: {
        inflow: Math.abs(Math.min(0, netFlow)),
        outflow: Math.abs(Math.max(0, netFlow)),
        net: netFlow,
      },
    };
  }

  /**
   * Generate mock transactions for testing
   */
  private generateMockTransactions(symbol: string, count: number = 5): WhaleTransaction[] {
    const transactions: WhaleTransaction[] = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const amountUSD = Math.random() * 10000000 + 1000000; // $1M-$11M
      const type: WhaleTransaction['type'] =
        Math.random() > 0.5 ? 'exchange_inflow' : 'exchange_outflow';

      transactions.push({
        blockchain: symbol === 'BTC' ? 'bitcoin' : 'ethereum',
        symbol,
        from: `0x${Math.random().toString(16).slice(2, 42)}`,
        to: `0x${Math.random().toString(16).slice(2, 42)}`,
        amount: amountUSD / 50000, // Approximate token amount
        amountUSD,
        timestamp: now - Math.random() * 86400000, // Last 24h
        txHash: `0x${Math.random().toString(16).slice(2, 66)}`,
        type,
      });
    }

    return transactions.sort((a, b) => b.timestamp - a.timestamp);
  }
}

// Singleton instance
let whaleServiceInstance: WhaleWalletService | null = null;

export function getWhaleWalletService(): WhaleWalletService {
  if (!whaleServiceInstance) {
    whaleServiceInstance = new WhaleWalletService();
  }
  return whaleServiceInstance;
}

export default WhaleWalletService;

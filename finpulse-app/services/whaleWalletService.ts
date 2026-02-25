/**
 * Whale Wallet Service
 *
 * Aggregates whale wallet activity from multiple sources and converts
 * to WhaleSignal format for the signal analysis framework.
 */

import { getWhaleAlertClient, isWhaleAlertSupported } from './dataProviders/whaleAlertAPI';
import { cacheService, getWhaleDataCacheKey } from './cacheService';
import { apiConfig } from '../config/apiKeys';
import { WHALE_THRESHOLDS, DEFAULT_WHALE_THRESHOLD } from '../constants';
import type { WhaleTransaction, WhaleMetrics, WhaleSignal, SignalDirection } from '../types';

/**
 * Deterministic hash for consistent mock values per symbol.
 * Same algorithm as signalService.ts hashSymbol().
 */
function hashSymbol(symbol: string): number {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    const char = symbol.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export class WhaleWalletService {
  /** Tracks whether the last getWhaleMetrics call returned mock data */
  private _lastResultWasMock = false;

  /** True if the most recent getWhaleMetrics() call used mock data */
  get wasMockData(): boolean {
    return this._lastResultWasMock;
  }

  /**
   * Get whale metrics for a symbol (cached)
   */
  async getWhaleMetrics(symbol: string): Promise<WhaleMetrics> {
    // Check if live data enabled
    if (!apiConfig.features.liveWhaleData || !apiConfig.whaleAlert.enabled) {
      this._lastResultWasMock = true;
      return this.generateMockMetrics(symbol);
    }

    // Skip API call for symbols not supported by Whale Alert (stocks, commodities, unmapped tokens)
    if (!isWhaleAlertSupported(symbol)) {
      this._lastResultWasMock = true;
      return this.generateMockMetrics(symbol);
    }

    // Try cache first
    const cacheKey = getWhaleDataCacheKey(symbol);
    try {
      const cached = await cacheService.getOrSet(
        cacheKey,
        () => this.fetchWhaleMetrics(symbol),
        apiConfig.cache.whaleDataTTL
      );
      this._lastResultWasMock = false;
      return cached;
    } catch (error) {
      const isKeyMissing = error instanceof Error && error.message.includes('not configured');
      if (!isKeyMissing) {
        console.error(`[WhaleService] Cache/fetch failed for ${symbol}, falling back to mock:`, error);
      }
      this._lastResultWasMock = true;
      return this.generateMockMetrics(symbol);
    }
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
      const isKeyMissing = error instanceof Error && error.message.includes('not configured');
      if (!isKeyMissing) {
        console.error(`Error fetching whale metrics for ${symbol}:`, error);
      }
      // Fallback to mock data
      this._lastResultWasMock = true;
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
      const isKeyMissing = error instanceof Error && error.message.includes('not configured');
      if (!isKeyMissing) {
        console.error(`Error fetching large transactions for ${symbol}:`, error);
      }
      return this.generateMockTransactions(symbol, 5);
    }
  }

  /**
   * Convert whale metrics to WhaleSignal format
   * Uses per-symbol thresholds from constants
   */
  convertToWhaleSignal(metrics: WhaleMetrics): WhaleSignal {
    // Determine direction based on net flow with per-symbol thresholds
    let direction: SignalDirection = 'neutral';
    let activity: 'accumulation' | 'distribution' | 'neutral' = 'neutral';

    const flowThreshold = WHALE_THRESHOLDS[metrics.symbol] ?? DEFAULT_WHALE_THRESHOLD;

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
   * Generate deterministic mock metrics.
   * Uses symbol hash so values are stable across re-renders.
   */
  private generateMockMetrics(symbol: string): WhaleMetrics {
    const h = hashSymbol(symbol);

    // Deterministic values derived from hash
    const netFlowSign = (h % 3) === 0 ? -1 : 1; // ~33% negative
    const netFlowMagnitude = ((h % 50) + 1) * 1_000_000; // $1M–$50M
    const netFlow = netFlowSign * netFlowMagnitude;
    const largeTransfers = (h % 20) + 5; // 5–24 transfers
    const topHolderChange = ((h % 200) - 100) / 100; // -1.00 to +0.99

    return {
      symbol,
      netFlow24h: netFlow,
      largeTransfers,
      topHolderChange,
      exchangeReserves: {
        inflow: Math.abs(Math.min(0, netFlow)),
        outflow: Math.abs(Math.max(0, netFlow)),
        net: netFlow,
      },
    };
  }

  /**
   * Generate deterministic mock transactions.
   * Uses symbol hash + index so values are stable across re-renders.
   */
  private generateMockTransactions(symbol: string, count: number = 5): WhaleTransaction[] {
    const transactions: WhaleTransaction[] = [];
    const baseHash = hashSymbol(symbol);
    const baseTime = Date.now();

    for (let i = 0; i < count; i++) {
      const h = hashSymbol(`${symbol}-${i}`);
      const amountUSD = ((h % 10) + 1) * 1_000_000; // $1M–$10M
      const type: WhaleTransaction['type'] =
        h % 2 === 0 ? 'exchange_inflow' : 'exchange_outflow';

      // Fixed offsets at 2h intervals instead of random timestamps
      const timestamp = baseTime - (i + 1) * 7200000;

      transactions.push({
        blockchain: symbol === 'BTC' ? 'bitcoin' : 'ethereum',
        symbol,
        from: `0x${baseHash.toString(16).padStart(40, 'a')}`,
        to: `0x${h.toString(16).padStart(40, 'b')}`,
        amount: amountUSD / 50000, // Approximate token amount
        amountUSD,
        timestamp,
        txHash: `0x${(baseHash + i).toString(16).padStart(64, '0')}`,
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

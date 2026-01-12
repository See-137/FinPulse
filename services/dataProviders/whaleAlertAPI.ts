/**
 * Whale Alert API Client
 *
 * Integrates with Whale Alert API to fetch large cryptocurrency transactions
 * https://docs.whale-alert.io/
 *
 * Rate Limit: 30 calls/min (free tier), 1000 calls/min (pro)
 */

import { throttle } from '../rateLimiter';
import { apiConfig } from '../../config/apiKeys';
import type { WhaleTransaction } from '../../types';

const WHALE_ALERT_API_BASE = 'https://api.whale-alert.io/v1';

interface WhaleAlertTransaction {
  blockchain: string;
  symbol: string;
  id: string;
  transaction_type: string;
  hash: string;
  from: {
    address: string;
    owner?: string;
    owner_type?: string;
  };
  to: {
    address: string;
    owner?: string;
    owner_type?: string;
  };
  timestamp: number;
  amount: number;
  amount_usd: number;
  transaction_count?: number;
}

interface WhaleAlertResponse {
  result: string;
  cursor?: string;
  count: number;
  transactions: WhaleAlertTransaction[];
}

/**
 * Whale Alert API Client
 */
export class WhaleAlertAPI {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || apiConfig.whaleAlert.apiKey || '';

    if (!this.apiKey) {
      console.warn('⚠️  Whale Alert API key not configured - using mock data');
    }
  }

  /**
   * Check if API is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Fetch recent whale transactions
   * @param minValue Minimum transaction value in USD (default: $500k)
   * @param start Start timestamp (default: 24h ago)
   * @param end End timestamp (default: now)
   */
  async getTransactions(
    minValue: number = 500000,
    start?: number,
    end?: number
  ): Promise<WhaleTransaction[]> {
    if (!this.isConfigured()) {
      throw new Error('Whale Alert API key not configured');
    }

    // Default time range: last 24 hours
    const endTime = end || Math.floor(Date.now() / 1000);
    const startTime = start || endTime - 86400; // 24h ago

    const url = new URL(`${WHALE_ALERT_API_BASE}/transactions`);
    url.searchParams.append('api_key', this.apiKey);
    url.searchParams.append('start', startTime.toString());
    url.searchParams.append('end', endTime.toString());
    url.searchParams.append('min_value', minValue.toString());

    try {
      const response = await throttle('whaleAlert', async () => {
        const res = await fetch(url.toString());

        if (!res.ok) {
          if (res.status === 429) {
            throw new Error('Whale Alert rate limit exceeded');
          }
          throw new Error(`Whale Alert API error: ${res.status} ${res.statusText}`);
        }

        return res.json();
      });

      const data = response as WhaleAlertResponse;

      if (data.result !== 'success') {
        throw new Error(`Whale Alert API returned error: ${data.result}`);
      }

      return data.transactions.map(this.transformTransaction);
    } catch (error) {
      console.error('Error fetching whale transactions:', error);
      throw error;
    }
  }

  /**
   * Get transactions for specific blockchain
   */
  async getTransactionsByBlockchain(
    blockchain: string,
    minValue: number = 500000
  ): Promise<WhaleTransaction[]> {
    const transactions = await this.getTransactions(minValue);
    return transactions.filter(tx => tx.blockchain === blockchain);
  }

  /**
   * Get transactions for specific symbol
   */
  async getTransactionsBySymbol(
    symbol: string,
    minValue: number = 500000
  ): Promise<WhaleTransaction[]> {
    const transactions = await this.getTransactions(minValue);
    return transactions.filter(tx => tx.symbol === symbol);
  }

  /**
   * Detect transaction type (exchange inflow/outflow vs wallet transfer)
   */
  private detectTransactionType(tx: WhaleAlertTransaction): WhaleTransaction['type'] {
    const fromType = tx.from.owner_type;
    const toType = tx.to.owner_type;

    // To exchange = inflow
    if (toType === 'exchange') {
      return 'exchange_inflow';
    }

    // From exchange = outflow
    if (fromType === 'exchange') {
      return 'exchange_outflow';
    }

    // Wallet to wallet
    return 'wallet_transfer';
  }

  /**
   * Transform Whale Alert response to internal format
   */
  private transformTransaction = (tx: WhaleAlertTransaction): WhaleTransaction => {
    return {
      blockchain: tx.blockchain,
      symbol: tx.symbol,
      from: tx.from.address,
      to: tx.to.address,
      amount: tx.amount,
      amountUSD: tx.amount_usd,
      timestamp: tx.timestamp * 1000, // Convert to ms
      txHash: tx.hash,
      type: this.detectTransactionType(tx),
    };
  };
}

/**
 * Get symbol map for Whale Alert API
 * Maps our internal symbols to Whale Alert symbols
 */
export function mapSymbolToWhaleAlert(symbol: string): string {
  const symbolMap: Record<string, string> = {
    BTC: 'bitcoin',
    ETH: 'ethereum',
    USDT: 'tether',
    USDC: 'usd-coin',
    BNB: 'binance-coin',
    XRP: 'ripple',
    ADA: 'cardano',
    SOL: 'solana',
    DOGE: 'dogecoin',
    // Add more as needed
  };

  return symbolMap[symbol] || symbol.toLowerCase();
}

// Singleton instance
let whaleAlertInstance: WhaleAlertAPI | null = null;

export function getWhaleAlertClient(): WhaleAlertAPI {
  if (!whaleAlertInstance) {
    whaleAlertInstance = new WhaleAlertAPI();
  }
  return whaleAlertInstance;
}

export default WhaleAlertAPI;

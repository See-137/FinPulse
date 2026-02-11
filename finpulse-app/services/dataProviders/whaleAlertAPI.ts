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
   * @param currency Optional Whale Alert currency name for server-side filtering
   * @param start Start timestamp (default: 24h ago)
   * @param end End timestamp (default: now)
   */
  async getTransactions(
    minValue: number = 500000,
    currency?: string,
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
    if (currency) {
      url.searchParams.append('currency', currency);
    }

    try {
      const data = await this.fetchWithRetry(url.toString());

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
   * Get transactions for specific symbol (server-side filtered)
   */
  async getTransactionsBySymbol(
    symbol: string,
    minValue: number = 500000
  ): Promise<WhaleTransaction[]> {
    const currency = mapSymbolToWhaleAlert(symbol);
    return this.getTransactions(minValue, currency);
  }

  /**
   * Fetch with retry and exponential backoff
   * Retries on 429 (rate limit) and 5xx (server error)
   * @param url Full URL to fetch
   * @param maxRetries Maximum retry attempts (default: 3)
   */
  private async fetchWithRetry(
    url: string,
    maxRetries: number = 3
  ): Promise<WhaleAlertResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await throttle('whaleAlert', async () => {
          const res = await fetch(url);

          if (!res.ok) {
            const isRetryable = res.status === 429 || res.status >= 500;
            const err = new Error(`Whale Alert API error: ${res.status} ${res.statusText}`);
            (err as any).status = res.status;
            (err as any).retryable = isRetryable;
            throw err;
          }

          return res.json();
        });

        return response as WhaleAlertResponse;
      } catch (error: any) {
        lastError = error;

        // Don't retry on non-retryable errors or final attempt
        if (!error.retryable || attempt === maxRetries) {
          break;
        }

        // Exponential backoff: 1s, 2s, 4s + 10% jitter
        const baseDelay = Math.pow(2, attempt) * 1000;
        const jitter = baseDelay * 0.1 * Math.random();
        const delay = baseDelay + jitter;

        console.warn(
          `[WhaleAlert] Retry ${attempt + 1}/${maxRetries} after ${Math.round(delay)}ms (status: ${error.status})`
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Whale Alert API request failed');
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
 * Map of symbols that Whale Alert API actually supports.
 * Only these symbols should be queried; anything else will error.
 */
const WHALE_ALERT_SYMBOL_MAP: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  USDC: 'usd-coin',
  BNB: 'binance-coin',
  XRP: 'ripple',
  ADA: 'cardano',
  SOL: 'solana',
  DOGE: 'dogecoin',
  PAXG: 'pax-gold',
  AVAX: 'avalanche',
  DOT: 'polkadot',
  MATIC: 'polygon',
  LINK: 'chainlink',
  UNI: 'uniswap',
  LTC: 'litecoin',
  SHIB: 'shiba-inu',
  TRX: 'tron',
};

/**
 * Check if a symbol is supported by the Whale Alert API.
 * Stocks, commodities, and unmapped tokens are NOT supported.
 */
export function isWhaleAlertSupported(symbol: string): boolean {
  return symbol.toUpperCase() in WHALE_ALERT_SYMBOL_MAP;
}

export function mapSymbolToWhaleAlert(symbol: string): string {
  return WHALE_ALERT_SYMBOL_MAP[symbol.toUpperCase()] || symbol.toLowerCase();
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

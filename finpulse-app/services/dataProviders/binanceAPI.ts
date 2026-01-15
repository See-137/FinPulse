/**
 * Binance API Client
 *
 * Integrates with Binance public API for OHLCV (candlestick) data
 * https://binance-docs.github.io/apidocs/spot/en/
 *
 * Rate Limit: 1200 requests/min (no auth required for public endpoints)
 */

import { throttle } from '../rateLimiter';
import type { OHLCV } from '../../types';

const BINANCE_API_BASE = 'https://api.binance.com/api/v3';

interface BinanceKline {
  0: number;  // Open time
  1: string;  // Open
  2: string;  // High
  3: string;  // Low
  4: string;  // Close
  5: string;  // Volume
  6: number;  // Close time
  7: string;  // Quote asset volume
  8: number;  // Number of trades
  9: string;  // Taker buy base asset volume
  10: string; // Taker buy quote asset volume
  11: string; // Unused field
}

/**
 * Binance API Client
 */
export class BinanceAPI {
  /**
   * Fetch OHLCV candlestick data
   * @param symbol Trading pair (e.g., 'BTCUSDT')
   * @param interval Timeframe ('1m', '5m', '15m', '1h', '4h', '1d')
   * @param limit Number of candles (default: 100, max: 1000)
   */
  async getKlines(
    symbol: string,
    interval: string = '1h',
    limit: number = 100
  ): Promise<OHLCV[]> {
    try {
      const url = new URL(`${BINANCE_API_BASE}/klines`);
      url.searchParams.append('symbol', this.formatSymbol(symbol));
      url.searchParams.append('interval', interval);
      url.searchParams.append('limit', Math.min(limit, 1000).toString());

      const response = await throttle('binance', async () => {
        const res = await fetch(url.toString());

        if (!res.ok) {
          if (res.status === 429) {
            throw new Error('Binance rate limit exceeded');
          }
          throw new Error(`Binance API error: ${res.status} ${res.statusText}`);
        }

        return res.json();
      });

      const klines = response as BinanceKline[];
      return klines.map(this.transformKline);
    } catch (error) {
      console.error(`Error fetching klines for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get current ticker price
   */
  async getTickerPrice(symbol: string): Promise<number> {
    try {
      const url = new URL(`${BINANCE_API_BASE}/ticker/price`);
      url.searchParams.append('symbol', this.formatSymbol(symbol));

      const response = await throttle('binance', async () => {
        const res = await fetch(url.toString());

        if (!res.ok) {
          throw new Error(`Binance API error: ${res.status}`);
        }

        return res.json();
      });

      return parseFloat(response.price);
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Get 24h ticker statistics
   */
  async get24hTicker(symbol: string) {
    try {
      const url = new URL(`${BINANCE_API_BASE}/ticker/24hr`);
      url.searchParams.append('symbol', this.formatSymbol(symbol));

      const response = await throttle('binance', async () => {
        const res = await fetch(url.toString());

        if (!res.ok) {
          throw new Error(`Binance API error: ${res.status}`);
        }

        return res.json();
      });

      return {
        symbol: response.symbol,
        priceChange: parseFloat(response.priceChange),
        priceChangePercent: parseFloat(response.priceChangePercent),
        volume: parseFloat(response.volume),
        quoteVolume: parseFloat(response.quoteVolume),
        openPrice: parseFloat(response.openPrice),
        highPrice: parseFloat(response.highPrice),
        lowPrice: parseFloat(response.lowPrice),
        lastPrice: parseFloat(response.lastPrice),
      };
    } catch (error) {
      console.error(`Error fetching 24h ticker for ${symbol}:`, error);
      throw error;
    }
  }

  /**
   * Format symbol to Binance format
   * BTC -> BTCUSDT, ETH -> ETHUSDT
   */
  private formatSymbol(symbol: string): string {
    // If already formatted (contains USDT), return as-is
    if (symbol.includes('USDT')) {
      return symbol.toUpperCase();
    }

    // Otherwise append USDT
    return `${symbol.toUpperCase()}USDT`;
  }

  /**
   * Transform Binance kline to OHLCV format
   */
  private transformKline = (kline: BinanceKline): OHLCV => {
    return {
      timestamp: kline[0],
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5]),
    };
  };
}

/**
 * Map interval to Binance format
 */
export function mapIntervalToBinance(interval: string): string {
  const intervalMap: Record<string, string> = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1h',
    '4h': '4h',
    '1d': '1d',
    '1w': '1w',
  };

  return intervalMap[interval] || '1h';
}

// Singleton instance
let binanceInstance: BinanceAPI | null = null;

export function getBinanceClient(): BinanceAPI {
  if (!binanceInstance) {
    binanceInstance = new BinanceAPI();
  }
  return binanceInstance;
}

export default BinanceAPI;

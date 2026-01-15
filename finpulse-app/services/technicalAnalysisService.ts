/**
 * Technical Analysis Service
 *
 * Performs technical pattern detection and volume analysis using OHLCV data.
 * Converts to TradeSignal format for the signal analysis framework.
 */

import { getBinanceClient } from './dataProviders/binanceAPI';
import { cacheService, getTechnicalCacheKey } from './cacheService';
import { apiConfig } from '../config/apiKeys';
import type {
  OHLCV,
  TechnicalPattern,
  VolumeAnalysis,
  TradeSignal,
  SignalDirection,
} from '../types';

export class TechnicalAnalysisService {
  /**
   * Get OHLCV data (cached)
   * @param symbol Asset symbol
   * @param timeframe Candlestick interval
   * @param limit Number of candles
   */
  async getOHLCV(
    symbol: string,
    timeframe: string = '1h',
    limit: number = 100
  ): Promise<OHLCV[]> {
    if (!apiConfig.features.liveTechnical) {
      return this.generateMockOHLCV(symbol, limit);
    }

    const cacheKey = getTechnicalCacheKey(symbol, timeframe);
    const cached = await cacheService.getOrSet(
      cacheKey,
      () => this.fetchOHLCV(symbol, timeframe, limit),
      apiConfig.cache.technicalTTL
    );

    return cached;
  }

  /**
   * Fetch OHLCV from Binance
   */
  private async fetchOHLCV(
    symbol: string,
    timeframe: string,
    limit: number
  ): Promise<OHLCV[]> {
    try {
      const client = getBinanceClient();
      return await client.getKlines(symbol, timeframe, limit);
    } catch (error) {
      console.error(`Error fetching OHLCV for ${symbol}:`, error);
      return this.generateMockOHLCV(symbol, limit);
    }
  }

  /**
   * Detect technical patterns
   */
  detectPatterns(candles: OHLCV[], timeframe: string = '1h'): TechnicalPattern[] {
    if (candles.length < 20) {
      return [];
    }

    const patterns: TechnicalPattern[] = [];

    // 1. Breakout Detection
    const breakout = this.detectBreakout(candles);
    if (breakout) patterns.push({ ...breakout, timeframe });

    // 2. Support/Resistance
    const supportResistance = this.detectSupportResistance(candles);
    if (supportResistance) patterns.push({ ...supportResistance, timeframe });

    // 3. Double Top/Bottom (requires more data)
    if (candles.length >= 50) {
      const doublePattern = this.detectDoublePattern(candles);
      if (doublePattern) patterns.push({ ...doublePattern, timeframe });
    }

    return patterns;
  }

  /**
   * Detect price breakout
   */
  private detectBreakout(candles: OHLCV[]): TechnicalPattern | null {
    const recent = candles.slice(-10); // Last 10 candles
    const historical = candles.slice(-50, -10); // Previous 40 candles

    if (recent.length === 0 || historical.length === 0) return null;

    // Calculate high/low ranges
    const historicalHigh = Math.max(...historical.map(c => c.high));
    const historicalLow = Math.min(...historical.map(c => c.low));
    const currentPrice = recent[recent.length - 1].close;

    // Breakout above resistance
    if (currentPrice > historicalHigh * 1.02) {
      // 2% above historical high
      return {
        type: 'breakout',
        confidence: 75,
        priceLevel: historicalHigh,
        timeframe: '',
      };
    }

    // Breakdown below support
    if (currentPrice < historicalLow * 0.98) {
      // 2% below historical low
      return {
        type: 'support',
        confidence: 70,
        priceLevel: historicalLow,
        timeframe: '',
      };
    }

    return null;
  }

  /**
   * Detect support/resistance levels
   */
  private detectSupportResistance(candles: OHLCV[]): TechnicalPattern | null {
    const currentPrice = candles[candles.length - 1].close;

    // Find price clusters (support/resistance zones)
    const prices = candles.flatMap(c => [c.high, c.low, c.close]);
    const sorted = prices.sort((a, b) => a - b);

    // Look for price levels with multiple touches
    const tolerance = currentPrice * 0.01; // 1% tolerance
    const clusters: { price: number; count: number }[] = [];

    for (const price of sorted) {
      const existing = clusters.find(c => Math.abs(c.price - price) <= tolerance);
      if (existing) {
        existing.count++;
      } else {
        clusters.push({ price, count: 1 });
      }
    }

    // Find strongest level near current price
    const nearbyLevels = clusters.filter(
      c => Math.abs(c.price - currentPrice) / currentPrice <= 0.05 // Within 5%
    );

    if (nearbyLevels.length === 0) return null;

    const strongest = nearbyLevels.sort((a, b) => b.count - a.count)[0];

    // Determine if support or resistance
    const type = strongest.price < currentPrice ? 'support' : 'resistance';

    return {
      type,
      confidence: Math.min(strongest.count * 10, 90),
      priceLevel: strongest.price,
      timeframe: '',
    };
  }

  /**
   * Detect double top/bottom patterns
   */
  private detectDoublePattern(candles: OHLCV[]): TechnicalPattern | null {
    // Find peaks and troughs
    const peaks: number[] = [];
    const troughs: number[] = [];

    for (let i = 2; i < candles.length - 2; i++) {
      const prev2 = candles[i - 2];
      const prev1 = candles[i - 1];
      const current = candles[i];
      const next1 = candles[i + 1];
      const next2 = candles[i + 2];

      // Peak: higher than surrounding candles
      if (
        current.high > prev2.high &&
        current.high > prev1.high &&
        current.high > next1.high &&
        current.high > next2.high
      ) {
        peaks.push(current.high);
      }

      // Trough: lower than surrounding candles
      if (
        current.low < prev2.low &&
        current.low < prev1.low &&
        current.low < next1.low &&
        current.low < next2.low
      ) {
        troughs.push(current.low);
      }
    }

    // Look for two similar peaks (double top)
    if (peaks.length >= 2) {
      const lastTwo = peaks.slice(-2);
      const diff = Math.abs(lastTwo[0] - lastTwo[1]) / lastTwo[0];

      if (diff < 0.02) {
        // Within 2%
        return {
          type: 'double_top',
          confidence: 65,
          priceLevel: (lastTwo[0] + lastTwo[1]) / 2,
          timeframe: '',
        };
      }
    }

    // Look for two similar troughs (double bottom)
    if (troughs.length >= 2) {
      const lastTwo = troughs.slice(-2);
      const diff = Math.abs(lastTwo[0] - lastTwo[1]) / lastTwo[0];

      if (diff < 0.02) {
        return {
          type: 'double_bottom',
          confidence: 65,
          priceLevel: (lastTwo[0] + lastTwo[1]) / 2,
          timeframe: '',
        };
      }
    }

    return null;
  }

  /**
   * Analyze volume
   */
  analyzeVolume(candles: OHLCV[]): VolumeAnalysis {
    if (candles.length === 0) {
      return {
        currentVolume: 0,
        averageVolume: 0,
        volumeSpike: 1,
        trend: 'stable',
      };
    }

    // Current volume (last candle)
    const currentVolume = candles[candles.length - 1].volume;

    // Average volume (last 50 candles or all available)
    const volumeWindow = candles.slice(-50);
    const averageVolume =
      volumeWindow.reduce((sum, c) => sum + c.volume, 0) / volumeWindow.length;

    // Volume spike (multiple of average)
    const volumeSpike = averageVolume > 0 ? currentVolume / averageVolume : 1;

    // Volume trend
    const recentAvg = candles.slice(-10).reduce((sum, c) => sum + c.volume, 0) / 10;
    const olderAvg = candles.slice(-20, -10).reduce((sum, c) => sum + c.volume, 0) / 10;

    let trend: VolumeAnalysis['trend'] = 'stable';
    if (recentAvg > olderAvg * 1.2) trend = 'increasing';
    else if (recentAvg < olderAvg * 0.8) trend = 'decreasing';

    return {
      currentVolume,
      averageVolume,
      volumeSpike,
      trend,
    };
  }

  /**
   * Convert technical data to TradeSignal format
   */
  convertToTradeSignal(
    symbol: string,
    patterns: TechnicalPattern[],
    volumeAnalysis: VolumeAnalysis
  ): TradeSignal {
    // Determine direction based on patterns
    let direction: SignalDirection = 'neutral';
    let score = 50; // Base score

    for (const pattern of patterns) {
      if (pattern.type === 'breakout') {
        direction = 'bullish';
        score += pattern.confidence * 0.4;
      } else if (pattern.type === 'double_bottom') {
        direction = 'bullish';
        score += pattern.confidence * 0.3;
      } else if (pattern.type === 'double_top') {
        direction = 'bearish';
        score += pattern.confidence * 0.3;
      } else if (pattern.type === 'support') {
        // Near support = potential bounce (bullish)
        direction = 'bullish';
        score += pattern.confidence * 0.2;
      } else if (pattern.type === 'resistance') {
        // Near resistance = potential rejection (bearish)
        direction = 'bearish';
        score += pattern.confidence * 0.2;
      }
    }

    // Volume spike increases confidence
    if (volumeAnalysis.volumeSpike > 1.5) {
      score += 15; // Bonus for high volume
    }

    // Determine primary pattern
    const primaryPattern = patterns.length > 0 ? patterns[0].type : 'consolidation';

    return {
      symbol,
      direction,
      score: Math.min(100, Math.max(0, Math.round(score))),
      technicalPattern: primaryPattern,
      timestamp: Date.now(),
    };
  }

  /**
   * Generate mock OHLCV for testing
   */
  private generateMockOHLCV(symbol: string, count: number): OHLCV[] {
    const candles: OHLCV[] = [];
    let basePrice = 50000; // Default base price

    // Symbol-specific base prices
    if (symbol === 'BTC' || symbol.includes('BTC')) basePrice = 50000;
    else if (symbol === 'ETH' || symbol.includes('ETH')) basePrice = 3000;
    else if (symbol === 'SOL' || symbol.includes('SOL')) basePrice = 100;

    const now = Date.now();
    const interval = 3600000; // 1 hour

    for (let i = count - 1; i >= 0; i--) {
      const open = basePrice + (Math.random() - 0.5) * basePrice * 0.02;
      const close = open + (Math.random() - 0.5) * basePrice * 0.03;
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = Math.random() * 1000000;

      candles.push({
        timestamp: now - i * interval,
        open,
        high,
        low,
        close,
        volume,
      });

      // Trend for next candle
      basePrice = close;
    }

    return candles;
  }
}

// Singleton instance
let technicalServiceInstance: TechnicalAnalysisService | null = null;

export function getTechnicalAnalysisService(): TechnicalAnalysisService {
  if (!technicalServiceInstance) {
    technicalServiceInstance = new TechnicalAnalysisService();
  }
  return technicalServiceInstance;
}

export default TechnicalAnalysisService;

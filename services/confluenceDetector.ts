/**
 * Confluence Detector
 *
 * Detects multi-signal confluence (alignment) and divergences (contradictions).
 * Implements time-window correlation and confidence boost logic.
 */

import type {
  WhaleSignal,
  SentimentSignal,
  TradeSignal,
  ConfluenceAlert,
  SignalDirection,
} from '../types';

export class ConfluenceDetector {
  /**
   * Detect confluence between signals (within time window)
   * @param whale Whale wallet signal
   * @param sentiment Social sentiment signal
   * @param technical Technical analysis signal
   * @param timeWindowHours Time window for signal alignment (default: 2 hours)
   * @param currentPrice Current asset price
   */
  detectConfluence(
    whale: WhaleSignal | null,
    sentiment: SentimentSignal | null,
    technical: TradeSignal | null,
    timeWindowHours: number = 2,
    currentPrice?: number
  ): ConfluenceAlert | null {
    // Collect available signals
    const signals: Array<{ timestamp: number; direction: SignalDirection }> = [];

    if (whale) signals.push({ timestamp: whale.timestamp, direction: whale.direction });
    if (sentiment)
      signals.push({ timestamp: sentiment.timestamp, direction: sentiment.direction });
    if (technical)
      signals.push({ timestamp: technical.timestamp, direction: technical.direction });

    // Need at least 2 signals for confluence
    if (signals.length < 2) {
      return null;
    }

    // Check if signals are within time window
    const timeWindowMs = timeWindowHours * 3600000;
    const timestamps = signals.map(s => s.timestamp);
    const maxTimestamp = Math.max(...timestamps);
    const minTimestamp = Math.min(...timestamps);
    const timeSpread = maxTimestamp - minTimestamp;

    if (timeSpread > timeWindowMs) {
      return null; // Outside time window
    }

    // Determine confluence tier
    const tier = signals.length as 1 | 2 | 3;

    // Calculate initial confidence
    const baseConfidence = this.calculateBaseConfidence(whale, sentiment, technical);

    // Apply confluence boost
    const confidenceWithBoost = this.applyConfluenceBoost(
      baseConfidence,
      tier,
      signals,
      sentiment
    );

    // Determine majority direction
    const direction = this.determineMajorityDirection(signals);

    // Detect divergences
    const divergence = this.detectDivergence(whale, sentiment, technical);

    // Get price at signal (latest signal timestamp)
    const priceAtSignal = currentPrice || 0;

    return {
      asset: whale?.symbol || sentiment?.symbol || technical?.symbol || '',
      tier,
      confidence: Math.round(confidenceWithBoost),
      signals: {
        whale: whale || undefined,
        sentiment: sentiment || undefined,
        technical: technical || undefined,
      },
      timestamp: new Date(maxTimestamp),
      timeWindowMs: timeSpread,
      priceAtSignal,
      currentPrice,
      divergence: divergence || undefined,
    };
  }

  /**
   * Calculate base confidence score (weighted average)
   */
  private calculateBaseConfidence(
    whale: WhaleSignal | null,
    sentiment: SentimentSignal | null,
    technical: TradeSignal | null
  ): number {
    // Weights from existing signal service
    const weights = { whale: 0.4, trade: 0.35, sentiment: 0.25 };

    let totalScore = 0;
    let totalWeight = 0;

    if (whale) {
      totalScore += whale.score * weights.whale;
      totalWeight += weights.whale;
    }

    if (technical) {
      totalScore += technical.score * weights.trade;
      totalWeight += weights.trade;
    }

    if (sentiment) {
      totalScore += sentiment.score * weights.sentiment;
      totalWeight += weights.sentiment;
    }

    // Normalize to 100
    return totalWeight > 0 ? (totalScore / totalWeight) * 100 : 0;
  }

  /**
   * Apply confluence boost based on signal alignment
   */
  private applyConfluenceBoost(
    baseConfidence: number,
    tier: 1 | 2 | 3,
    signals: Array<{ direction: SignalDirection }>,
    sentiment: SentimentSignal | null
  ): number {
    let adjustedConfidence = baseConfidence;

    // Confluence boost based on tier
    if (tier === 3) {
      adjustedConfidence *= 1.2; // +20% for triple confluence
    } else if (tier === 2) {
      adjustedConfidence *= 1.1; // +10% for double confluence
    }

    // Echo chamber penalty: if sentiment consensus >95%
    if (sentiment) {
      // Calculate consensus (all signals in same direction)
      const directions = signals.map(s => s.direction);
      const bullishCount = directions.filter(d => d === 'bullish').length;
      const bearishCount = directions.filter(d => d === 'bearish').length;
      const maxCount = Math.max(bullishCount, bearishCount);
      const consensus = maxCount / directions.length;

      if (consensus > 0.95) {
        adjustedConfidence *= 0.8; // -20% penalty for echo chamber
      }
    }

    // Clamp to 0-100
    return Math.min(100, Math.max(0, adjustedConfidence));
  }

  /**
   * Determine majority direction
   */
  private determineMajorityDirection(
    signals: Array<{ direction: SignalDirection }>
  ): SignalDirection {
    const bullishCount = signals.filter(s => s.direction === 'bullish').length;
    const bearishCount = signals.filter(s => s.direction === 'bearish').length;

    if (bullishCount > bearishCount) return 'bullish';
    if (bearishCount > bullishCount) return 'bearish';
    return 'neutral';
  }

  /**
   * Detect divergences (contrarian signals)
   */
  detectDivergence(
    whale: WhaleSignal | null,
    sentiment: SentimentSignal | null,
    technical: TradeSignal | null
  ): ConfluenceAlert['divergence'] | null {
    // 1. Whale-Sentiment Divergence (Distribution Warning)
    // Whales selling (-$10M+) while sentiment bullish
    if (whale && sentiment) {
      const whaleNetFlow = whale.activity === 'distribution' ? -whale.volumeIndicator : whale.volumeIndicator;

      if (whaleNetFlow < -10 && sentiment.score > 70 && sentiment.direction === 'bullish') {
        return 'whale-sentiment';
      }

      // 2. Accumulation Divergence (Contrarian Long)
      // Whales buying (+$10M+) while sentiment bearish
      if (whaleNetFlow > 10 && sentiment.score > 70 && sentiment.direction === 'bearish') {
        return 'accumulation';
      }
    }

    // 3. Sentiment-Price Divergence (Wall of Worry)
    // Fear but price rising
    if (sentiment && technical) {
      if (
        sentiment.direction === 'bearish' &&
        sentiment.score > 60 &&
        technical.direction === 'bullish' &&
        technical.score > 70
      ) {
        return 'sentiment-price';
      }
    }

    return null;
  }

  /**
   * Calculate confidence score for divergence alerts
   */
  calculateDivergenceConfidence(alert: ConfluenceAlert): number {
    if (!alert.divergence) {
      return alert.confidence;
    }

    // Divergences are high-value contrarian signals
    const divergenceBoosts: Record<string, number> = {
      'whale-sentiment': 0.5,  // -50% (major red flag)
      accumulation: 1.3,        // +30% (contrarian bullish)
      'sentiment-price': 1.2,   // +20% (contrarian bullish)
    };

    const boost = divergenceBoosts[alert.divergence] || 1;
    return Math.round(alert.confidence * boost);
  }

  /**
   * Get interpretation of divergence
   */
  getDivergenceInterpretation(divergence: ConfluenceAlert['divergence']): string {
    const interpretations: Record<string, string> = {
      'whale-sentiment':
        'Whales are distributing while social sentiment remains bullish. This divergence suggests potential market manipulation or insider information. Exercise caution.',
      accumulation:
        'Smart money (whales) is accumulating during fear. This divergence represents a high-conviction contrarian opportunity - whales buying the dip.',
      'sentiment-price':
        'Price is climbing despite bearish sentiment (wall of worry). This divergence often precedes continued upward movement as skeptics capitulate.',
    };

    return interpretations[divergence || ''] || 'Mixed signals detected.';
  }
}

// Singleton instance
let confluenceDetectorInstance: ConfluenceDetector | null = null;

export function getConfluenceDetector(): ConfluenceDetector {
  if (!confluenceDetectorInstance) {
    confluenceDetectorInstance = new ConfluenceDetector();
  }
  return confluenceDetectorInstance;
}

export default ConfluenceDetector;

/**
 * Signal Analysis Service
 * Combines whale, sentiment, and trade signals with configurable weighting
 * Confidence: 40% whale + 35% trade + 25% sentiment
 * Conflict detection and penalty: ×0.7 when signals contradict
 */

import { 
  WhaleSignal, 
  SentimentSignal, 
  TradeSignal, 
  CombinedSignal, 
  SignalDirection 
} from '../types';
import { SIGNAL_SCORING } from '../constants';

export const signalLogger = {
  debug: (msg: string, data?: any) => console.debug(`[Signal] ${msg}`, data),
  info: (msg: string, data?: any) => console.info(`[Signal] ${msg}`, data),
  warn: (msg: string, data?: any) => console.warn(`[Signal] ${msg}`, data),
  error: (msg: string, data?: any) => console.error(`[Signal] ${msg}`, data),
};

/**
 * Validate that a signal has required fields and valid score range
 */
export function validateSignal(signal: WhaleSignal | TradeSignal | SentimentSignal): boolean {
  if (!signal) return false;
  if (!signal.symbol || signal.symbol.length === 0) return false;
  if (signal.score < 0 || signal.score > 100) {
    signalLogger.warn(`Invalid score for ${signal.symbol}: ${signal.score}`);
    return false;
  }
  if (!signal.direction || !['bullish', 'bearish', 'neutral'].includes(signal.direction)) {
    signalLogger.warn(`Invalid direction for ${signal.symbol}: ${signal.direction}`);
    return false;
  }
  return true;
}

/**
 * Calculate weighted confidence score from three signal components
 * Formula: (whale × 0.40) + (trade × 0.35) + (sentiment × 0.25)
 * If any component is unavailable (null), weights recalculate to sum to 100%
 */
export function calculateConfidence(
  whale: WhaleSignal | null,
  trade: TradeSignal | null,
  sentiment: SentimentSignal | null
): number {
  const validSignals: number[] = [];
  let totalWeight = 0;
  let weightedScore = 0;

  if (whale && validateSignal(whale)) {
    validSignals.push(whale.score);
    weightedScore += whale.score * SIGNAL_SCORING.WEIGHTS.whale;
    totalWeight += SIGNAL_SCORING.WEIGHTS.whale;
  }

  if (trade && validateSignal(trade)) {
    validSignals.push(trade.score);
    weightedScore += trade.score * SIGNAL_SCORING.WEIGHTS.trade;
    totalWeight += SIGNAL_SCORING.WEIGHTS.trade;
  }

  if (sentiment && validateSignal(sentiment)) {
    validSignals.push(sentiment.score);
    weightedScore += sentiment.score * SIGNAL_SCORING.WEIGHTS.sentiment;
    totalWeight += SIGNAL_SCORING.WEIGHTS.sentiment;
  }

  if (totalWeight === 0) {
    signalLogger.warn('No valid signals provided for confidence calculation');
    return 0;
  }

  // Normalize if weights don't sum to 1
  const confidence = totalWeight > 0 ? (weightedScore / totalWeight) : 0;
  return Math.max(SIGNAL_SCORING.MIN_CONFIDENCE, Math.min(SIGNAL_SCORING.MAX_CONFIDENCE, confidence));
}

/**
 * Detect if signals contradict each other
 * Returns true if: whale bullish but sentiment bearish, etc.
 */
export function detectConflict(
  whale: WhaleSignal | null,
  trade: TradeSignal | null,
  sentiment: SentimentSignal | null
): { hasConflict: boolean; details: string } {
  const signals = [whale, trade, sentiment].filter((s) => s !== null) as Array<WhaleSignal | TradeSignal | SentimentSignal>;

  if (signals.length < 2) {
    return { hasConflict: false, details: '' };
  }

  // Extract directions
  const directions = signals.map((s) => s.direction);

  // Check for major contradictions: bullish vs bearish
  const hasBullish = directions.includes('bullish');
  const hasBearish = directions.includes('bearish');

  if (hasBullish && hasBearish) {
    const bullishCount = directions.filter((d) => d === 'bullish').length;
    const bearishCount = directions.filter((d) => d === 'bearish').length;
    return {
      hasConflict: true,
      details: `Conflicting signals: ${bullishCount} bullish, ${bearishCount} bearish`,
    };
  }

  return { hasConflict: false, details: '' };
}

/**
 * Apply conflict penalty to confidence score
 * If signals contradict, multiply confidence by penalty factor (×0.7)
 */
export function applyConflictPenalty(confidence: number, hasConflict: boolean): number {
  if (!hasConflict) return confidence;
  const penalized = confidence * SIGNAL_SCORING.CONFLICT_PENALTY;
  signalLogger.info(`Applied conflict penalty: ${confidence.toFixed(1)} → ${penalized.toFixed(1)}`);
  return penalized;
}

/**
 * Determine overall direction from component signals
 * Majority vote: bullish if 2+ are bullish, bearish if 2+ are bearish, else neutral
 */
export function determineDirection(
  whale: WhaleSignal | null,
  trade: TradeSignal | null,
  sentiment: SentimentSignal | null
): SignalDirection {
  const signals = [whale, trade, sentiment].filter((s) => s !== null) as Array<WhaleSignal | TradeSignal | SentimentSignal>;

  if (signals.length === 0) return 'neutral';

  const bullishCount = signals.filter((s) => s.direction === 'bullish').length;
  const bearishCount = signals.filter((s) => s.direction === 'bearish').length;

  if (bullishCount > bearishCount && bullishCount >= 2) return 'bullish';
  if (bearishCount > bullishCount && bearishCount >= 2) return 'bearish';
  return 'neutral';
}

/**
 * Combine three signals into one analyzed signal with confidence score
 * Integrates confidence calculation, conflict detection, and direction determination
 */
export function combineSignals(
  symbol: string,
  whale: WhaleSignal | null,
  trade: TradeSignal | null,
  sentiment: SentimentSignal | null
): CombinedSignal {
  // Validate inputs
  const allNullOrInvalid = [whale, trade, sentiment].every((s) => s === null || !validateSignal(s));
  if (allNullOrInvalid) {
    signalLogger.warn(`No valid signals for ${symbol}`);
    return {
      symbol,
      direction: 'neutral',
      confidenceScore: 0,
      componentScores: { whale: 0, trade: 0, sentiment: 0 },
      hasConflict: false,
      createdAt: Date.now(),
    };
  }

  // Calculate base confidence
  const baseConfidence = calculateConfidence(whale, trade, sentiment);

  // Detect conflicts
  const conflict = detectConflict(whale, trade, sentiment);

  // Apply penalty if conflict exists
  const finalConfidence = applyConflictPenalty(baseConfidence, conflict.hasConflict);

  // Determine direction
  const direction = determineDirection(whale, trade, sentiment);

  // Get historical accuracy for this signal type
  const accuracy = getAverageAccuracy(whale, trade, sentiment);

  return {
    symbol,
    direction,
    confidenceScore: Math.round(finalConfidence),
    componentScores: {
      whale: whale ? whale.score : 0,
      trade: trade ? trade.score : 0,
      sentiment: sentiment ? sentiment.score : 0,
    },
    hasConflict: conflict.hasConflict,
    conflictDetails: conflict.details || undefined,
    accuracy,
    createdAt: Date.now(),
  };
}

/**
 * Calculate average historical accuracy from available signals
 * Returns realistic baseline accuracy (65-75% range per signal type)
 */
export function getAverageAccuracy(
  whale: WhaleSignal | null,
  trade: TradeSignal | null,
  sentiment: SentimentSignal | null
): number {
  const accuracies: number[] = [];

  if (whale) accuracies.push(SIGNAL_SCORING.BASE_ACCURACY.whale);
  if (trade) accuracies.push(SIGNAL_SCORING.BASE_ACCURACY.trade);
  if (sentiment) accuracies.push(SIGNAL_SCORING.BASE_ACCURACY.sentiment);

  if (accuracies.length === 0) return 0;
  return Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length);
}

/**
 * Create sample signals for testing/demo purposes
 */
export function createMockSignals(symbol: string): { whale: WhaleSignal; trade: TradeSignal; sentiment: SentimentSignal } {
  const now = Date.now();
  return {
    whale: {
      symbol,
      direction: 'bullish',
      score: 75,
      activity: 'accumulation',
      volumeIndicator: 125.5,
      timestamp: now,
    },
    trade: {
      symbol,
      direction: 'bullish',
      score: 70,
      technicalPattern: 'breakout',
      influencer: 'Technical Analyst',
      timestamp: now,
    },
    sentiment: {
      symbol,
      direction: 'neutral',
      score: 55,
      source: 'social',
      momentum: 20,
      timestamp: now,
    },
  };
}

export default {
  validateSignal,
  calculateConfidence,
  detectConflict,
  applyConflictPenalty,
  determineDirection,
  combineSignals,
  getAverageAccuracy,
  createMockSignals,
};

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

// Lazy imports for live data services to avoid circular dependencies
let whaleWalletService: any = null;
let technicalAnalysisService: any = null;
let sentimentService: any = null;

async function getWhaleService() {
  if (!whaleWalletService) {
    const { WhaleWalletService } = await import('./whaleWalletService');
    whaleWalletService = new WhaleWalletService();
  }
  return whaleWalletService;
}

async function getTechnicalService() {
  if (!technicalAnalysisService) {
    const { TechnicalAnalysisService } = await import('./technicalAnalysisService');
    technicalAnalysisService = new TechnicalAnalysisService();
  }
  return technicalAnalysisService;
}

async function getSentimentServiceInstance() {
  if (!sentimentService) {
    const { SentimentService } = await import('./sentimentService');
    sentimentService = new SentimentService();
  }
  return sentimentService;
}

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
  sentiment: SentimentSignal | null,
  isMock?: boolean
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
    ...(isMock !== undefined ? { isMock } : {}),
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
 * Deterministic hash for consistent signals per symbol
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

/**
 * Create varied signals for demo/display purposes
 * Generates consistent but diverse signals based on symbol hash
 * @param symbol Asset symbol
 * @param priceChange24h Optional 24h price change percentage to influence signal direction
 */
export function createMockSignals(symbol: string, priceChange24h?: number): { whale: WhaleSignal; trade: TradeSignal; sentiment: SentimentSignal } {
  const now = Date.now();
  const hash = hashSymbol(symbol);
  
  // Use hash to generate consistent pseudo-random values per symbol
  const whaleBase = (hash % 40) + 45; // 45-84
  const tradeBase = ((hash >> 4) % 40) + 40; // 40-79
  const sentimentBase = ((hash >> 8) % 35) + 35; // 35-69
  
  // Determine directions based on hash and optional price change
  const directions: SignalDirection[] = ['bullish', 'bearish', 'neutral'];
  
  let whaleDirection: SignalDirection;
  let tradeDirection: SignalDirection;
  let sentimentDirection: SignalDirection;
  
  if (priceChange24h !== undefined) {
    // If price is up significantly, lean bullish
    // If price is down significantly, lean bearish
    const trend = priceChange24h > 2 ? 'bullish' : priceChange24h < -2 ? 'bearish' : 'neutral';
    whaleDirection = priceChange24h > 3 ? 'bullish' : priceChange24h < -3 ? 'bearish' : directions[hash % 3];
    tradeDirection = trend;
    sentimentDirection = priceChange24h > 5 ? 'bullish' : priceChange24h < -5 ? 'bearish' : directions[(hash >> 2) % 3];
  } else {
    // Use hash for deterministic but varied signals
    whaleDirection = directions[hash % 3];
    tradeDirection = directions[(hash >> 2) % 3];
    sentimentDirection = directions[(hash >> 4) % 3];
  }
  
  // Activity types based on direction
  const bullishActivities = ['accumulation', 'strong_accumulation', 'buying_pressure'];
  const bearishActivities = ['distribution', 'selling_pressure', 'whale_exit'];
  const neutralActivities = ['consolidation', 'mixed_signals', 'low_activity'];
  
  const activityMap = {
    bullish: bullishActivities[hash % bullishActivities.length],
    bearish: bearishActivities[hash % bearishActivities.length],
    neutral: neutralActivities[hash % neutralActivities.length]
  };
  
  // Technical patterns based on direction
  const bullishPatterns = ['breakout', 'golden_cross', 'ascending_triangle', 'double_bottom'];
  const bearishPatterns = ['breakdown', 'death_cross', 'descending_triangle', 'head_shoulders'];
  const neutralPatterns = ['consolidation', 'range_bound', 'sideways', 'indecision'];
  
  const patternMap = {
    bullish: bullishPatterns[hash % bullishPatterns.length],
    bearish: bearishPatterns[hash % bearishPatterns.length],
    neutral: neutralPatterns[hash % neutralPatterns.length]
  };

  return {
    whale: {
      symbol,
      direction: whaleDirection,
      score: whaleDirection === 'bullish' ? whaleBase + 10 : whaleDirection === 'bearish' ? 100 - whaleBase : whaleBase,
      activity: activityMap[whaleDirection],
      volumeIndicator: 80 + (hash % 100),
      timestamp: now,
    },
    trade: {
      symbol,
      direction: tradeDirection,
      score: tradeDirection === 'bullish' ? tradeBase + 15 : tradeDirection === 'bearish' ? 100 - tradeBase : tradeBase,
      technicalPattern: patternMap[tradeDirection],
      influencer: 'Market Analysis',
      timestamp: now,
    },
    sentiment: {
      symbol,
      direction: sentimentDirection,
      score: sentimentDirection === 'bullish' ? sentimentBase + 20 : sentimentDirection === 'bearish' ? 100 - sentimentBase : sentimentBase,
      source: 'social',
      momentum: sentimentDirection === 'bullish' ? 25 + (hash % 30) : sentimentDirection === 'bearish' ? -(hash % 30) : (hash % 20) - 10,
      timestamp: now,
    },
  };
}

/**
 * Generate live signals for a symbol by fetching from all data sources
 * This is the main integration point connecting live APIs to signal analysis
 * @param symbol Asset symbol (BTC, ETH, etc.)
 * @returns CombinedSignal with live data from all sources
 */
export async function generateLiveSignals(symbol: string): Promise<CombinedSignal> {
  signalLogger.info(`Generating live signals for ${symbol}`);
  
  let whaleSignal: WhaleSignal | null = null;
  let tradeSignal: TradeSignal | null = null;
  let sentimentSignal: SentimentSignal | null = null;

  let whaleMockFlag = false;

  // Fetch all signals in parallel with error handling for each
  const results = await Promise.allSettled([
    // Whale signal from whale wallet service
    (async () => {
      try {
        const service = await getWhaleService();
        const metrics = await service.getWhaleMetrics(symbol);
        whaleMockFlag = service.wasMockData;
        return service.convertToWhaleSignal(metrics);
      } catch (error) {
        signalLogger.warn(`Failed to fetch whale signal for ${symbol}:`, error);
        return null;
      }
    })(),

    // Trade signal from technical analysis
    (async () => {
      try {
        const service = await getTechnicalService();
        const candles = await service.getOHLCV(symbol, '1h', 100);
        const patterns = service.detectPatterns(candles);
        const volume = service.analyzeVolume(candles);
        return service.convertToTradeSignal(symbol, patterns, volume);
      } catch (error) {
        signalLogger.warn(`Failed to fetch trade signal for ${symbol}:`, error);
        return null;
      }
    })(),

    // Sentiment signal from social data
    (async () => {
      try {
        const service = await getSentimentServiceInstance();
        return await service.getAggregatedSentiment(symbol);
      } catch (error) {
        signalLogger.warn(`Failed to fetch sentiment signal for ${symbol}:`, error);
        return null;
      }
    })()
  ]);

  // Extract results
  if (results[0].status === 'fulfilled' && results[0].value) {
    whaleSignal = results[0].value;
  }
  if (results[1].status === 'fulfilled' && results[1].value) {
    tradeSignal = results[1].value;
  }
  if (results[2].status === 'fulfilled' && results[2].value) {
    sentimentSignal = results[2].value;
  }

  signalLogger.info(`Signals fetched for ${symbol}: whale=${!!whaleSignal}, trade=${!!tradeSignal}, sentiment=${!!sentimentSignal}, whaleMock=${whaleMockFlag}`);

  // Combine signals using existing logic, propagate isMock flag
  return combineSignals(symbol, whaleSignal, tradeSignal, sentimentSignal, whaleMockFlag || undefined);
}

/**
 * Generate live signals for multiple symbols in parallel
 * @param symbols Array of asset symbols
 * @returns Map of symbol to CombinedSignal
 */
export async function generateLiveSignalsBatch(symbols: string[]): Promise<Map<string, CombinedSignal>> {
  signalLogger.info(`Generating live signals for ${symbols.length} symbols`);
  
  const results = await Promise.allSettled(
    symbols.map(symbol => generateLiveSignals(symbol))
  );

  const signalMap = new Map<string, CombinedSignal>();
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      signalMap.set(symbols[index], result.value);
    } else {
      signalLogger.error(`Failed to generate signals for ${symbols[index]}:`, result.reason);
      // Add a neutral signal as fallback
      signalMap.set(symbols[index], {
        symbol: symbols[index],
        direction: 'neutral',
        confidenceScore: 0,
        componentScores: { whale: 0, trade: 0, sentiment: 0 },
        hasConflict: false,
        createdAt: Date.now(),
      });
    }
  });

  return signalMap;
}

export default {
  validateSignal,
  calculateConfidence,
  detectConflict,
  applyConflictPenalty,
  determineDirection,
  combineSignals,
  getAverageAccuracy,
  generateLiveSignals,
  generateLiveSignalsBatch,
};

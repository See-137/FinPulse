
export type PlanType = 'FREE' | 'PROPULSE' | 'SUPERPULSE';
export type Theme = 'light' | 'dark' | 'system';
export type Currency = 'USD' | 'ILS';
export type AssetType = 'CRYPTO' | 'STOCK' | 'COMMODITY';
export type UserRole = 'user' | 'admin' | 'internal_tester';
export type SignalType = 'whale' | 'sentiment' | 'trade';
export type SignalDirection = 'bullish' | 'bearish' | 'neutral';

export interface User {
  id: string;
  name: string;
  email: string;
  plan: PlanType;
  userRole: UserRole; // 'user' | 'admin' | 'internal_tester'
  credits: {
    ai: number;
    maxAi: number;
    assets: number;
    maxAssets: number;
  };
  subscriptionStatus: 'active' | 'past_due' | 'trialing' | 'none';
}

export interface Holding {
  symbol: string;
  name: string;
  type: AssetType;
  quantity: number;
  avgCost: number;  // Changed from avgBuyPrice
  currentPrice: number;
  dayPL: number;    // Added - used in portfolio calculations
  addedAt?: string; // ISO 8601 timestamp - when added to portfolio
}

export interface Influencer {
  username: string;
  name: string;
  tier: PlanType;
  focus: string;
  bio?: string;
}

export interface StockData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  marketCap: string;
  history: { time: string; value: number }[];
}

export interface NewsItem {
  id: string;
  headline: string;
  source: string;
  time: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  summary?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * SIGNAL ANALYSIS FRAMEWORK
 * Confidence scoring: Whale (40%) + Trade (35%) + Sentiment (25%)
 * Conflict penalty: ×0.7 when signals contradict
 */

export interface WhaleSignal {
  symbol: string;
  direction: SignalDirection;
  score: number; // 0-100
  activity: string; // 'accumulation' | 'distribution' | 'neutral'
  volumeIndicator: number; // Whale transaction volume in millions USD
  timestamp: number;
}

export interface TradeSignal {
  symbol: string;
  direction: SignalDirection;
  score: number; // 0-100
  technicalPattern: string; // e.g., 'breakout', 'support', 'resistance'
  influencer?: string; // Source influencer
  timestamp: number;
}

export interface SentimentSignal {
  symbol: string;
  direction: SignalDirection;
  score: number; // 0-100
  source: string; // 'social' | 'news' | 'on-chain'
  momentum: number; // -100 to 100, negative = declining sentiment
  timestamp: number;
}

export interface CombinedSignal {
  symbol: string;
  direction: SignalDirection;
  confidenceScore: number; // 0-100, calculated from weighted average
  componentScores: {
    whale: number;
    trade: number;
    sentiment: number;
  };
  hasConflict: boolean;
  conflictDetails?: string; // Description of conflicting signals
  accuracy?: number; // Historical accuracy % of this signal type
  createdAt: number;
}

/**
 * EXTENDED TYPES FOR PHASE 1 - REAL DATA INTEGRATION
 */

// Whale Wallet Data Types
export interface WhaleTransaction {
  blockchain: string; // 'ethereum', 'bitcoin', etc.
  symbol: string; // 'BTC', 'ETH', 'USDT'
  from: string; // Wallet address
  to: string; // Wallet address
  amount: number; // Token amount
  amountUSD: number; // USD value
  timestamp: number; // Unix timestamp
  txHash: string;
  type: 'exchange_inflow' | 'exchange_outflow' | 'wallet_transfer';
}

export interface WhaleMetrics {
  symbol: string;
  netFlow24h: number; // Net USD flow in/out (last 24h)
  largeTransfers: number; // Count of >$1M transfers
  topHolderChange: number; // % change in top 100 holder concentration
  exchangeReserves: {
    inflow: number;
    outflow: number;
    net: number;
  };
}

// Social Sentiment Types
export interface TweetData {
  id: string;
  authorUsername: string;
  text: string;
  createdAt: Date;
  metrics: {
    likes: number;
    retweets: number;
    replies: number;
    views?: number;
  };
  mentionedSymbols: string[]; // Extracted tickers (BTC, ETH, etc.)
}

export interface InfluencerSentiment {
  username: string;
  sentiment: number; // -1 to 1
  confidence: number; // 0 to 1
  tweets: TweetData[];
  aggregatedScore: number; // Weighted by engagement
  historicalAccuracy?: number; // From performance tracking (Phase 3)
}

export interface TweetCluster {
  id: string;
  tweets: TweetData[];
  sharedContent: string; // Common text/link
  influencerCount: number; // How many different influencers
  sentiment: 'bullish' | 'bearish' | 'neutral';
  earliestTweet: TweetData; // Who posted first (original)
}

// Technical Analysis Types
export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalPattern {
  type: 'breakout' | 'support' | 'resistance' | 'double_top' | 'double_bottom' | 'triangle';
  confidence: number; // 0-100
  priceLevel?: number; // Key level
  timeframe: string; // '1h', '4h', '1d'
}

export interface VolumeAnalysis {
  currentVolume: number;
  averageVolume: number;
  volumeSpike: number; // Multiple of average
  trend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * PHASE 2 - CONFLUENCE DETECTION TYPES
 */

export interface ConfluenceAlert {
  asset: string;
  tier: 1 | 2 | 3; // Single, Double, Triple confluence
  confidence: number; // Adjusted score with confluence boost
  signals: {
    whale?: WhaleSignal;
    sentiment?: SentimentSignal;
    technical?: TradeSignal;
  };
  timestamp: Date;
  timeWindowMs: number; // How close signals occurred (ms)
  priceAtSignal: number;
  currentPrice?: number;
  divergence?: 'whale-sentiment' | 'sentiment-price' | 'accumulation';
}

/**
 * PHASE 2 - SIGNAL HISTORY TYPES
 */

export interface SignalHistoryRecord {
  id: string; // UUID
  symbol: string; // BTC, ETH, etc.
  signalType: 'whale' | 'sentiment' | 'technical' | 'combined';
  direction: SignalDirection;
  confidenceScore: number;
  componentScores: {
    whale?: number;
    sentiment?: number;
    technical?: number;
  };
  priceAtSignal: number;
  createdAt: number; // Unix timestamp

  // Outcome tracking (populated later)
  outcome?: {
    price7d?: number; // Price after 7 days
    price30d?: number; // Price after 30 days
    return7d?: number; // % return
    return30d?: number; // % return
    correct?: boolean; // Did direction match actual move?
    evaluatedAt?: number; // When outcome was evaluated
  };

  // Metadata
  tier?: 1 | 2 | 3; // Confluence tier
  divergence?: string;
  influencers?: string[]; // Which influencers contributed
}

/**
 * PHASE 3 - INFLUENCER PERFORMANCE TYPES
 */

export interface InfluencerPerformance {
  username: string;
  period: '7d' | '30d' | '90d';
  metrics: {
    totalSignals: number;
    correctSignals: number;
    accuracy: number; // % correct
    avgReturn: number; // Avg % return when followed
    bestCall: {
      symbol: string;
      return: number;
      date: Date;
    };
    worstCall: {
      symbol: string;
      return: number;
      date: Date;
    };
  };
  rank: number; // 1-30 ranking
  tier: PlanType;
}

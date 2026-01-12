
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

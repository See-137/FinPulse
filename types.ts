
export type PlanType = 'FREE' | 'PROPULSE' | 'SUPERPULSE';
export type Theme = 'light' | 'dark' | 'system';
export type Currency = 'USD' | 'ILS';

export interface User {
  id: string;
  name: string;
  email: string;
  plan: PlanType;
  credits: {
    ai: number;
    maxAi: number;
    assets: number;
    maxAssets: number;
  };
  subscriptionStatus: 'active' | 'past_due' | 'trialing' | 'none';
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

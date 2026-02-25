
import React from 'react';
import { PlanType } from './types';

// Default currency rates (updated by API in components)
// Real rates fetched from: https://b3fgmin9yj.execute-api.us-east-1.amazonaws.com/prod/fx/rates
export const CURRENCY_RATES: Record<string, number> = {
  USD: 1,
  ILS: 3.18  // Updated from live API (was 3.62)
};

export const Logo: React.FC<{ className?: string }> = ({ className = "h-8" }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <svg viewBox="0 0 120 120" className="h-full aspect-square filter drop-shadow-sm">
      <rect x="15" y="25" width="90" height="70" rx="30" stroke="#ffffff" strokeWidth="8" fill="none" />
      <line x1="40" y1="40" x2="40" y2="80" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      <rect x="36" y="50" width="8" height="20" rx="1.5" fill="#ffffff" />
      <line x1="55" y1="35" x2="55" y2="75" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
      <rect x="51" y="42" width="8" height="24" rx="1.5" fill="#ffffff" />
      <path d="M70 60 Q 80 20 90 60 T 110 60" stroke="#00e5ff" strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M10 60 H 25" stroke="#00e5ff" strokeWidth="4" strokeLinecap="round" />
      <circle cx="15" cy="60" r="3" fill="#ffffff" />
    </svg>
    <span className="text-2xl font-black tracking-tighter text-white">
      Fin<span className="text-[#00e5ff]">Pulse</span>
    </span>
  </div>
);

export const SaaS_PLANS = {
  FREE: {
    name: 'Free',
    price: '$0',
    annualPrice: '$0',
    annualSavings: '',
    maxAssets: 20,
    maxAiQueries: 10,
    allowCommodities: false,
    features: ['Stocks & Crypto Tracking', 'Basic Analytics', 'Community Access', 'Market News', '20 Asset Slots'],
    color: 'slate'
  },
  PROPULSE: {
    name: 'ProPulse',
    price: '$9.90',
    annualPrice: '$89',
    annualSavings: '25%',
    maxAssets: 50,
    maxAiQueries: 50,
    allowCommodities: true,
    features: ['Everything in Free', 'Commodities (Gold, Oil, etc.)', '50 Asset Slots', '50 AI Queries/day', 'CSV Exports'],
    color: 'cyan'
  },
  SUPERPULSE: {
    name: 'SuperPulse',
    price: '$29.90',
    annualPrice: '$249',
    annualSavings: '31%',
    maxAssets: 9999,
    maxAiQueries: 9999,
    allowCommodities: true,
    features: ['Everything in ProPulse', 'Premium Analytics', 'Unlimited Assets', 'Unlimited AI Queries', 'Priority Support', 'Ad-free Experience'],
    color: 'purple'
  }
};

/**
 * SIGNAL CONFIDENCE SCORING
 * Weights: Whale (40%) + Trade (35%) + Sentiment (25%)
 * Conflict penalty: ×0.7 when signals contradict
 * Base accuracy range: 65-75% per signal type
 */
export const SIGNAL_SCORING = {
  WEIGHTS: {
    whale: 0.40,
    trade: 0.35,
    sentiment: 0.25,
  },
  CONFLICT_PENALTY: 0.7, // Multiply confidence by this when conflict detected
  BASE_ACCURACY: {
    whale: 72, // %
    trade: 68, // %
    sentiment: 65, // %
  },
  MIN_CONFIDENCE: 0,
  MAX_CONFIDENCE: 100,
} as const;

/**
 * PER-SYMBOL WHALE THRESHOLDS
 * Net flow (USD) that must be exceeded to trigger a bullish/bearish signal.
 * Higher-cap assets need larger flows; lower-cap assets are more sensitive.
 */
export const WHALE_THRESHOLDS: Record<string, number> = {
  BTC: 50_000_000,   // $50M — BTC routinely moves $10M; need larger signal
  ETH: 30_000_000,   // $30M
  BNB: 15_000_000,   // $15M
  SOL: 10_000_000,   // $10M
  XRP: 10_000_000,   // $10M
  ADA:  5_000_000,   // $5M
  DOGE: 5_000_000,   // $5M
} as const;
export const DEFAULT_WHALE_THRESHOLD = 10_000_000;

// Fallback stock/crypto data (real data fetched from CoinGecko API)
// Live endpoint: https://b3fgmin9yj.execute-api.us-east-1.amazonaws.com/prod/market/prices
export const MOCK_STOCKS = [
  { symbol: 'BTC', price: 88618, change: 884.20, changePercent: 1.00 },
  { symbol: 'ETH', price: 3026.56, change: 52.20, changePercent: 1.76 },
  { symbol: 'SOL', price: 127.39, change: 3.12, changePercent: 2.45 },
  { symbol: 'BNB', price: 598.20, change: 4.50, changePercent: 0.76 },
  { symbol: 'AAPL', price: 224.53, change: 1.45, changePercent: 0.65 },
  { symbol: 'MSFT', price: 417.32, change: 2.10, changePercent: 0.51 },
  { symbol: 'NVDA', price: 145.20, change: 0.19, changePercent: 0.13 },
  { symbol: 'AMZN', price: 178.22, change: -1.12, changePercent: -0.62 },
];

// X.com Influencer List - Plan Gating
// FREE: 5 influencers | PROPULSE: 15 influencers | SUPERPULSE: 30 influencers
export const INFLUENCER_LIST = [
  // Tier 1: Core Crypto Leaders (FREE tier - 5)
  { username: 'elonmusk', name: 'Elon Musk', tier: 'FREE' as const, focus: 'BTC/DOGE', bio: 'Tesla & SpaceX CEO, major market mover' },
  { username: 'saylor', name: 'Michael Saylor', tier: 'FREE' as const, focus: 'BTC', bio: 'MicroStrategy CEO, Bitcoin maximalist' },
  { username: 'cz_binance', name: 'CZ 🔶', tier: 'FREE' as const, focus: 'Binance/BNB', bio: 'Former Binance CEO' },
  { username: 'VitalikButerin', name: 'Vitalik Buterin', tier: 'FREE' as const, focus: 'ETH', bio: 'Ethereum co-founder' },
  { username: 'CathieDWood', name: 'Cathie Wood', tier: 'FREE' as const, focus: 'Tech stocks', bio: 'ARK Invest CEO, innovation investor' },
  
  // Tier 2: PRO Analysts & Traders (PROPULSE - adds 10 more)
  { username: 'brian_armstrong', name: 'Brian Armstrong', tier: 'PROPULSE' as const, focus: 'Coinbase', bio: 'Coinbase CEO' },
  { username: 'balajis', name: 'Balaji Srinivasan', tier: 'PROPULSE' as const, focus: 'Crypto macro', bio: 'Former CTO of Coinbase, author' },
  { username: 'RaoulGMI', name: 'Raoul Pal', tier: 'PROPULSE' as const, focus: 'Macro', bio: 'Real Vision CEO, macro expert' },
  { username: 'APompliano', name: 'Anthony Pompliano', tier: 'PROPULSE' as const, focus: 'BTC', bio: 'Pomp Investments founder' },
  { username: 'CryptoHayes', name: 'Arthur Hayes', tier: 'PROPULSE' as const, focus: 'Trading', bio: 'BitMEX co-founder, trader' },
  { username: 'woonomic', name: 'Willy Woo', tier: 'PROPULSE' as const, focus: 'On-chain', bio: 'On-chain analyst, bitcoin metrics' },
  { username: 'glassnode', name: 'Glassnode', tier: 'PROPULSE' as const, focus: 'Analytics', bio: 'On-chain market intelligence' },
  { username: 'lookonchain', name: 'Lookonchain', tier: 'PROPULSE' as const, focus: 'Whales', bio: 'Whale wallet tracker, alerts' },
  { username: 'chamath', name: 'Chamath Palihapitiya', tier: 'PROPULSE' as const, focus: 'Tech', bio: 'Social Capital CEO, VC' },
  { username: 'garyblack00', name: 'Gary Black', tier: 'PROPULSE' as const, focus: 'TSLA/Tech', bio: 'Future Fund Managing Partner' },
  
  // Tier 3: Deep Research & Signals (SUPERPULSE - adds 15 more)
  { username: 'nic__carter', name: 'Nic Carter', tier: 'SUPERPULSE' as const, focus: 'BTC', bio: 'Castle Island Ventures, PoW advocate' },
  { username: 'santimentfeed', name: 'Santiment', tier: 'SUPERPULSE' as const, focus: 'Data', bio: 'Crypto behavior analytics platform' },
  { username: 'cobie', name: 'Cobie', tier: 'SUPERPULSE' as const, focus: 'Trading', bio: 'Crypto trader, UpOnly podcast' },
  { username: 'crypto_cobain', name: 'Crypto Cobain', tier: 'SUPERPULSE' as const, focus: 'Sentiment', bio: 'Market sentiment expert' },
  { username: 'HsakaTrades', name: 'Hsaka', tier: 'SUPERPULSE' as const, focus: 'TA', bio: 'Technical analysis, charts' },
  { username: 'DocumentingBTC', name: 'Bitcoin Archive', tier: 'SUPERPULSE' as const, focus: 'BTC news', bio: 'Bitcoin news aggregator' },
  { username: 'jimcramer', name: 'Jim Cramer', tier: 'SUPERPULSE' as const, focus: 'Inverse signal', bio: 'CNBC host, inverse indicator' },
  { username: 'WClementeIII', name: 'Will Clemente', tier: 'SUPERPULSE' as const, focus: 'On-chain', bio: 'Reflexivity Research co-founder' },
  { username: '100trillionUSD', name: 'PlanB', tier: 'SUPERPULSE' as const, focus: 'S2F model', bio: 'Stock-to-Flow model creator' },
  { username: 'twobitidiot', name: 'Ryan Selkis', tier: 'SUPERPULSE' as const, focus: 'Messari', bio: 'Messari CEO, crypto research' },
  { username: 'hasufl', name: 'Hasu', tier: 'SUPERPULSE' as const, focus: 'Research', bio: 'Flashbots strategist, researcher' },
  { username: 'cburniske', name: 'Chris Burniske', tier: 'SUPERPULSE' as const, focus: 'VC', bio: 'Placeholder VC, crypto valuations' },
  { username: 'novogratz', name: 'Mike Novogratz', tier: 'SUPERPULSE' as const, focus: 'Galaxy', bio: 'Galaxy Digital CEO' },
  { username: 'DeItaone', name: 'Walter Bloomberg', tier: 'SUPERPULSE' as const, focus: 'Breaking', bio: 'Fast financial news alerts' },
  { username: 'zaborovv', name: 'Zaborov', tier: 'SUPERPULSE' as const, focus: 'DeFi', bio: 'DeFi alpha, yield strategies' },
];

// Helper function to get influencers by user plan
export const getInfluencersByPlan = (plan: PlanType): typeof INFLUENCER_LIST => {
  const tierMap: Record<PlanType, string> = {
    'FREE': 'FREE',
    'PROPULSE': 'PROPULSE',
    'SUPERPULSE': 'SUPERPULSE'
  };
  
  const allowedTiers = [tierMap[plan]];
  
  // Include all tiers up to the user's plan
  if (plan === 'PROPULSE') {
    allowedTiers.push('FREE');
  } else if (plan === 'SUPERPULSE') {
    allowedTiers.push('FREE', 'PROPULSE');
  }
  
  return INFLUENCER_LIST.filter(inf => allowedTiers.includes(inf.tier));
};

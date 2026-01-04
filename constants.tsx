
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
    name: 'Standard Mirror',
    price: '$0',
    maxAssets: 3,
    maxAiQueries: 3,
    features: ['Manual Mirroring', 'Basic News', 'Community Access'],
    color: 'slate'
  },
  PRO: {
    name: 'Alpha Mirror',
    price: '$29',
    maxAssets: 50,
    maxAiQueries: 100,
    features: ['Advanced Charts', 'Gemini 3 Pro Intelligence', 'CSV Exports', 'Ad-free News'],
    color: 'cyan'
  },
  TEAM: {
    name: 'Vault Mirror',
    price: '$99',
    maxAssets: 1000,
    maxAiQueries: 1000,
    features: ['Shared Mirror Nodes', 'Priority Support', 'White-label Exports', 'API Access'],
    color: 'purple'
  }
};

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

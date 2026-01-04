
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
    maxAssets: 8,
    maxAiQueries: 5,
    allowCommodities: false,
    features: ['Stocks & Crypto Tracking', 'Basic Analytics', 'Community Access', 'Market News'],
    color: 'slate'
  },
  PROPULSE: {
    name: 'ProPulse',
    price: '$9.90',
    maxAssets: 20,
    maxAiQueries: 10,
    allowCommodities: true,
    features: ['Everything in Free', 'Commodities (Gold, Oil, etc.)', '20 Asset Slots', '10 AI Queries/day', 'CSV Exports'],
    color: 'cyan'
  },
  SUPERPULSE: {
    name: 'SuperPulse',
    price: '$29.90',
    maxAssets: 50,
    maxAiQueries: 50,
    allowCommodities: true,
    features: ['Everything in ProPulse', 'Premium Analytics', '50 Asset Slots', '50 AI Queries/day', 'Priority Support', 'Ad-free Experience'],
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

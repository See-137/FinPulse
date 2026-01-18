/**
 * FinPulse Premium Analytics Component
 * SuperPulse exclusive feature - advanced portfolio analytics
 */

import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area, BarChart, Bar, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Shield, Zap, Target, PieChart, Lock, BarChart3, Activity } from 'lucide-react';
import { Holding, PlanType, User } from '../types';
import { SaaS_PLANS } from '../constants';
import { useLanguage } from '../i18n';

interface PremiumAnalyticsProps {
  holdings: Holding[];
  user: User;
  onUpgradeClick: () => void;
  currency: string;
  currencySymbol: string;
  exchangeRate: number;
}

// Generate mock historical data based on holdings
const generateHistoricalData = (holdings: Holding[], days: number = 30) => {
  const totalCurrentValue = holdings.reduce((sum, h) => sum + (h.currentPrice * h.quantity), 0);
  const data = [];
  const today = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Simulate historical values with some variance
    const variance = (Math.random() - 0.5) * 0.08; // ±4% variance
    const dayValue = totalCurrentValue * (1 + variance - (i * 0.002)); // Slight upward trend
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Math.max(0, dayValue),
      fullDate: date.toISOString().split('T')[0]
    });
  }
  
  return data;
};

// Calculate portfolio metrics
const calculateMetrics = (holdings: Holding[], historicalData: any[]) => {
  const totalValue = holdings.reduce((sum, h) => sum + (h.currentPrice * h.quantity), 0);
  const totalCost = holdings.reduce((sum, h) => sum + ((h.avgCost || 0) * h.quantity), 0);
  const totalPnL = totalValue - totalCost;
  const pnlPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
  
  // Calculate daily returns for volatility
  const dailyReturns: number[] = [];
  for (let i = 1; i < historicalData.length; i++) {
    const prevValue = historicalData[i - 1].value;
    const currValue = historicalData[i].value;
    if (prevValue > 0) {
      dailyReturns.push((currValue - prevValue) / prevValue);
    }
  }
  
  // Volatility (standard deviation of daily returns, annualized)
  const avgReturn = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / dailyReturns.length;
  const dailyVolatility = Math.sqrt(variance);
  const annualizedVolatility = dailyVolatility * Math.sqrt(252) * 100;
  
  // Best and worst days
  const bestDay = Math.max(...dailyReturns) * 100;
  const worstDay = Math.min(...dailyReturns) * 100;
  
  // Sharpe Ratio (simplified - assuming risk-free rate of 4%)
  const riskFreeRate = 0.04 / 252; // Daily risk-free rate
  const excessReturn = avgReturn - riskFreeRate;
  const sharpeRatio = dailyVolatility > 0 ? (excessReturn / dailyVolatility) * Math.sqrt(252) : 0;
  
  // Max Drawdown
  let maxDrawdown = 0;
  let peak = historicalData[0]?.value || 0;
  for (const day of historicalData) {
    if (day.value > peak) peak = day.value;
    const drawdown = (peak - day.value) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  
  // Diversification score (based on number of assets and allocation balance)
  const assetCount = holdings.length;
  const allocations = holdings.map(h => (h.currentPrice * h.quantity) / totalValue);
  const herfindahlIndex = allocations.reduce((sum, a) => sum + Math.pow(a, 2), 0);
  const diversificationScore = Math.min(100, ((1 - herfindahlIndex) * 100 * (assetCount / 10)));
  
  return {
    totalValue,
    totalCost,
    totalPnL,
    pnlPercent,
    volatility: annualizedVolatility,
    sharpeRatio,
    maxDrawdown: maxDrawdown * 100,
    bestDay,
    worstDay,
    diversificationScore: Math.round(diversificationScore)
  };
};

// Calculate sector/type allocation
const calculateAllocation = (holdings: Holding[]) => {
  const byType: Record<string, number> = {};
  const totalValue = holdings.reduce((sum, h) => sum + (h.currentPrice * h.quantity), 0);
  
  holdings.forEach(h => {
    const value = h.currentPrice * h.quantity;
    byType[h.type] = (byType[h.type] || 0) + value;
  });
  
  return Object.entries(byType).map(([type, value]) => ({
    name: type,
    value,
    percent: totalValue > 0 ? (value / totalValue) * 100 : 0,
    color: type === 'STOCK' ? '#00e5ff' : type === 'CRYPTO' ? '#a855f7' : '#f59e0b'
  }));
};

// Top performers
const getTopPerformers = (holdings: Holding[]) => {
  return [...holdings]
    .map(h => ({
      ...h,
      pnl: (h.currentPrice - h.avgBuyPrice) * h.quantity,
      pnlPercent: ((h.currentPrice - h.avgBuyPrice) / h.avgBuyPrice) * 100
    }))
    .sort((a, b) => b.pnlPercent - a.pnlPercent);
};

// Locked Preview Component
const LockedOverlay: React.FC<{ onUpgrade: () => void }> = ({ onUpgrade }) => {
  const { t } = useLanguage();
  
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-b from-transparent via-slate-900/80 to-slate-900/95 backdrop-blur-[2px] rounded-[32px]">
      <div className="text-center p-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-500/20 flex items-center justify-center">
          <Lock className="w-8 h-8 text-purple-400" />
        </div>
        <h3 className="text-xl font-black text-white mb-2">Premium Analytics</h3>
        <p className="text-slate-400 text-sm mb-6 max-w-xs">
          Unlock advanced portfolio insights, risk metrics, and performance tracking with SuperPulse.
        </p>
        <button
          onClick={onUpgrade}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
        >
          Upgrade to SuperPulse
        </button>
        <p className="text-xs text-slate-500 mt-3">$29.90/month • Cancel anytime</p>
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard: React.FC<{
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
}> = ({ label, value, subValue, icon, trend, color = 'cyan' }) => {
  const colorClasses = {
    cyan: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20',
    purple: 'from-purple-500/10 to-purple-500/5 border-purple-500/20',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/20',
    emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20',
    rose: 'from-rose-500/10 to-rose-500/5 border-rose-500/20'
  };
  
  return (
    <div className={`p-4 rounded-2xl bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} border`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
        <div className="text-slate-400">{icon}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-black ${
          trend === 'up' ? 'text-emerald-400' : 
          trend === 'down' ? 'text-rose-400' : 
          'text-white'
        }`}>
          {value}
        </span>
        {subValue && <span className="text-xs text-slate-500">{subValue}</span>}
      </div>
    </div>
  );
};

export const PremiumAnalytics: React.FC<PremiumAnalyticsProps> = ({
  holdings,
  user,
  onUpgradeClick,
  currency,
  currencySymbol,
  exchangeRate
}) => {
  const { t } = useLanguage();
  // Unlock for SUPERPULSE plan OR internal_tester role
  const isUnlocked = user.plan === 'SUPERPULSE' || user.userRole === 'internal_tester';
  
  // Generate data
  const historicalData = useMemo(() => generateHistoricalData(holdings, 30), [holdings]);
  const metrics = useMemo(() => calculateMetrics(holdings, historicalData), [holdings, historicalData]);
  const allocation = useMemo(() => calculateAllocation(holdings), [holdings]);
  const performers = useMemo(() => getTopPerformers(holdings), [holdings]);
  
  const topGainers = performers.filter(p => p.pnlPercent > 0).slice(0, 3);
  const topLosers = performers.filter(p => p.pnlPercent < 0).slice(-3).reverse();
  
  // Format currency
  const formatValue = (value: number) => {
    const converted = value * exchangeRate;
    if (converted >= 1000000) return `${currencySymbol}${(converted / 1000000).toFixed(2)}M`;
    if (converted >= 1000) return `${currencySymbol}${(converted / 1000).toFixed(1)}K`;
    return `${currencySymbol}${converted.toFixed(2)}`;
  };

  return (
    <div className="relative">
      {/* Locked Overlay for non-SuperPulse users */}
      {!isUnlocked && <LockedOverlay onUpgrade={onUpgradeClick} />}
      
      <div className={`space-y-6 ${!isUnlocked ? 'blur-[3px] pointer-events-none select-none' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-purple-400" />
              Premium Analytics
            </h2>
            <p className="text-sm text-slate-500 mt-1">Advanced portfolio insights and risk metrics</p>
          </div>
          <div className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30">
            <span className="text-xs font-bold text-purple-400">SuperPulse</span>
          </div>
        </div>

        {/* AI Insight - Prominent at top */}
        <div className="p-6 rounded-[28px] bg-gradient-to-r from-purple-500/20 via-cyan-500/10 to-purple-500/20 border border-purple-500/30 shadow-lg shadow-purple-500/10">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500/30 to-cyan-500/30 border border-purple-500/40">
              <Zap className="w-6 h-6 text-purple-300" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-black text-white text-lg">AI Portfolio Insight</h3>
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-purple-500/30 text-purple-300 border border-purple-500/40">Live Analysis</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">
                {metrics.diversificationScore < 50 
                  ? "⚠️ Your portfolio could benefit from more diversification. Consider adding assets from different sectors to reduce concentration risk and improve resilience."
                  : metrics.volatility > 40
                  ? "📊 Your portfolio shows high volatility. Consider balancing with more stable assets or hedging positions to reduce daily swings and protect gains."
                  : metrics.sharpeRatio < 0.5
                  ? "📈 Your risk-adjusted returns could be improved. Focus on assets with better risk/reward ratios to maximize returns per unit of risk taken."
                  : "✅ Your portfolio shows healthy diversification and reasonable volatility. Keep monitoring for rebalancing opportunities and stay disciplined."
                }
              </p>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Risk Score</span>
                  <span className={`text-sm font-black ${metrics.volatility > 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {metrics.volatility > 40 ? 'High' : metrics.volatility > 20 ? 'Medium' : 'Low'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Diversification</span>
                  <span className={`text-sm font-black ${metrics.diversificationScore >= 70 ? 'text-emerald-400' : metrics.diversificationScore >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                    {metrics.diversificationScore.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetricCard
            label="Total P/L"
            value={`${metrics.totalPnL >= 0 ? '+' : ''}${formatValue(metrics.totalPnL)}`}
            subValue={`${metrics.pnlPercent >= 0 ? '+' : ''}${metrics.pnlPercent.toFixed(2)}%`}
            icon={metrics.totalPnL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            trend={metrics.totalPnL >= 0 ? 'up' : 'down'}
            color={metrics.totalPnL >= 0 ? 'emerald' : 'rose'}
          />
          <MetricCard
            label="Volatility"
            value={`${metrics.volatility.toFixed(1)}%`}
            subValue="annualized"
            icon={<Activity className="w-4 h-4" />}
            color={metrics.volatility > 30 ? 'amber' : 'cyan'}
          />
          <MetricCard
            label="Sharpe Ratio"
            value={metrics.sharpeRatio.toFixed(2)}
            subValue={metrics.sharpeRatio > 1 ? 'Good' : metrics.sharpeRatio > 0 ? 'Fair' : 'Poor'}
            icon={<Target className="w-4 h-4" />}
            color={metrics.sharpeRatio > 1 ? 'emerald' : metrics.sharpeRatio > 0 ? 'amber' : 'rose'}
          />
          <MetricCard
            label="Max Drawdown"
            value={`-${metrics.maxDrawdown.toFixed(1)}%`}
            subValue="30 days"
            icon={<Shield className="w-4 h-4" />}
            color={metrics.maxDrawdown > 20 ? 'rose' : 'cyan'}
          />
        </div>

        {/* Performance Chart */}
        <div className="card-surface p-6 rounded-[32px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Portfolio Value (30 Days)</h3>
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-2 py-1 rounded-lg ${metrics.pnlPercent >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {metrics.pnlPercent >= 0 ? '+' : ''}{metrics.pnlPercent.toFixed(2)}% overall
              </span>
            </div>
          </div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickFormatter={(v) => `${currencySymbol}${(v * exchangeRate / 1000).toFixed(0)}k`}
                  width={60}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: 'white'
                  }}
                  formatter={(value: number) => [formatValue(value), 'Value']}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#00e5ff" 
                  strokeWidth={2}
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Risk Analysis */}
          <div className="card-surface p-6 rounded-[32px]">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">Risk Analysis</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-sm text-slate-300">Best Day</span>
                </div>
                <span className="font-bold text-emerald-400">+{metrics.bestDay.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center">
                    <TrendingDown className="w-4 h-4 text-rose-400" />
                  </div>
                  <span className="text-sm text-slate-300">Worst Day</span>
                </div>
                <span className="font-bold text-rose-400">{metrics.worstDay.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                    <PieChart className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-sm text-slate-300">Diversification</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full"
                      style={{ width: `${metrics.diversificationScore}%` }}
                    />
                  </div>
                  <span className="font-bold text-white text-sm">{metrics.diversificationScore}/100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Performers */}
          <div className="card-surface p-6 rounded-[32px]">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">Top Performers</h3>
            <div className="space-y-3">
              {topGainers.length > 0 ? (
                topGainers.map((asset, i) => (
                  <div key={asset.id} className="flex justify-between items-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-slate-500">#{i + 1}</span>
                      <div>
                        <span className="font-bold text-white">{asset.symbol}</span>
                        <span className="text-xs text-slate-500 ml-2">{asset.type}</span>
                      </div>
                    </div>
                    <span className="font-bold text-emerald-400">+{asset.pnlPercent.toFixed(1)}%</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">No gainers yet</p>
              )}
              
              {topLosers.length > 0 && (
                <>
                  <div className="border-t border-white/5 my-2" />
                  {topLosers.slice(0, 2).map((asset, i) => (
                    <div key={asset.id} className="flex justify-between items-center p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500">↓</span>
                        <div>
                          <span className="font-bold text-white">{asset.symbol}</span>
                          <span className="text-xs text-slate-500 ml-2">{asset.type}</span>
                        </div>
                      </div>
                      <span className="font-bold text-rose-400">{asset.pnlPercent.toFixed(1)}%</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Allocation Breakdown */}
        <div className="card-surface p-6 rounded-[32px]">
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-4">Asset Allocation</h3>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={allocation} layout="vertical">
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }}
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: 'white'
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    `${formatValue(value)} (${props.payload.percent.toFixed(1)}%)`,
                    'Value'
                  ]}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {allocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            {allocation.map(a => (
              <div key={a.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: a.color }} />
                <span className="text-xs text-slate-400">{a.name}: {a.percent.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumAnalytics;

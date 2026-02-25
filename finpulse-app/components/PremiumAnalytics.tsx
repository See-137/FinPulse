/**
 * FinPulse Premium Analytics Component
 * SuperPulse exclusive feature - advanced portfolio analytics
 */

import React, { useMemo, useState, useCallback } from 'react';
import { XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area, BarChart, Bar, Cell, PieChart as RechartsPie, Pie } from 'recharts';
import { TrendingUp, TrendingDown, Shield, Zap, Target, PieChart, Lock, BarChart3, Activity, Calendar, Download, Info, RefreshCw, DollarSign, Clock } from 'lucide-react';
import { Holding, User } from '../types';
import { usePortfolioHistory } from '../hooks/usePortfolioHistory';
import { useLanguage } from '../i18n';

interface PremiumAnalyticsProps {
  holdings: Holding[];
  user: User;
  onUpgradeClick: () => void;
  currency: string;
  currencySymbol: string;
  exchangeRate: number;
  isPrivate: boolean;
}

// Time period options
type TimePeriod = '7d' | '30d' | '90d';

// Historical data point interface
interface HistoricalDataPoint {
  date: string;
  value: number;
  fullDate: string;
}

// Seeded random for deterministic historical data
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Generate deterministic historical data based on holdings
const generateHistoricalData = (holdings: Holding[], days: number = 30) => {
  const totalCurrentValue = holdings.reduce((sum, h) => sum + (h.currentPrice * h.quantity), 0);
  
  // Create a seed from holdings for deterministic random values
  const seedBase = holdings.reduce((sum, h) => sum + h.symbol.charCodeAt(0) + h.quantity, 0);
  
  const data = [];
  const today = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Use seeded random for deterministic variance based on date
    const daySeed = seedBase + i * 7919; // Prime number for better distribution
    const variance = (seededRandom(daySeed) - 0.5) * 0.08; // ±4% variance
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
const calculateMetrics = (holdings: Holding[], historicalData: HistoricalDataPoint[]) => {
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

  // Average holding age
  const holdingsWithAge = holdings.filter(h => h.addedAt);
  const avgHoldingAgeDays = holdingsWithAge.length > 0
    ? Math.round(holdingsWithAge.reduce((sum, h) => {
        const days = Math.floor((Date.now() - new Date(h.addedAt!).getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0) / holdingsWithAge.length)
    : 0;

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
    diversificationScore: Math.round(diversificationScore),
    totalReturnDollar: totalPnL,
    totalReturnPercent: pnlPercent,
    avgHoldingAgeDays
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

// Top performers - handle edge cases
const getTopPerformers = (holdings: Holding[]) => {
  return [...holdings]
    .filter(h => h.avgCost > 0 && h.currentPrice > 0) // Filter valid entries
    .map(h => ({
      ...h,
      id: h.symbol, // Use symbol as unique identifier
      pnl: (h.currentPrice - h.avgCost) * h.quantity,
      pnlPercent: ((h.currentPrice - h.avgCost) / h.avgCost) * 100
    }))
    .filter(h => isFinite(h.pnlPercent)) // Remove NaN/Infinity
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
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{t('analytics.title')}</h3>
        <p className="text-slate-400 text-sm mb-6 max-w-xs">
          {t('analytics.unlockDesc')}
        </p>
        <button
          onClick={onUpgrade}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-lg shadow-purple-500/20"
        >
          {t('analytics.upgradeToSuper')}
        </button>
        <p className="text-xs text-slate-500 mt-3">{t('analytics.priceInfo')}</p>
      </div>
    </div>
  );
};

// Metric Card Component with tooltips
const MetricCard: React.FC<{
  label: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
  tooltip?: string;
  simulated?: boolean;
}> = ({ label, value, subValue, icon, trend, color = 'cyan', tooltip, simulated }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  const colorClasses = {
    cyan: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20',
    purple: 'from-purple-500/10 to-purple-500/5 border-purple-500/20',
    amber: 'from-amber-500/10 to-amber-500/5 border-amber-500/20',
    emerald: 'from-emerald-500/10 to-emerald-500/5 border-emerald-500/20',
    rose: 'from-rose-500/10 to-rose-500/5 border-rose-500/20'
  };
  
  return (
    <div 
      className={`relative p-4 rounded-2xl bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses]} border transition-all hover:scale-[1.02] hover:shadow-lg`}
      role="article"
      aria-label={`${label}: ${value}${subValue ? `, ${subValue}` : ''}`}
      onMouseEnter={() => tooltip && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Tooltip */}
      {showTooltip && tooltip && (
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 z-20 px-3 py-2 bg-slate-800 text-xs text-white rounded-lg shadow-lg whitespace-nowrap border border-slate-700">
          {tooltip}
          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45 border-r border-b border-slate-700" />
        </div>
      )}
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
          {simulated && (
            <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Simulated
            </span>
          )}
        </div>
        <div className="text-slate-400">{icon}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-black ${
          trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' :
          trend === 'down' ? 'text-rose-600 dark:text-rose-400' :
          'text-slate-900 dark:text-white'
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
  // currency prop kept for API compatibility
  currencySymbol,
  exchangeRate,
  isPrivate
}) => {
  const { t } = useLanguage();
  // Unlock for SUPERPULSE plan OR internal_tester role
  const isUnlocked = user.plan === 'SUPERPULSE' || user.userRole === 'internal_tester';
  
  // Time period state
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get days from time period
  const periodDays = useMemo(() => {
    switch (timePeriod) {
      case '7d': return 7;
      case '90d': return 90;
      default: return 30;
    }
  }, [timePeriod]);

  // Fetch real historical data from backend
  const { data: realHistory, hasRealData, refetch: refetchHistory } = usePortfolioHistory(periodDays);

  // Use real data when available (>=7 data points), otherwise fall back to synthetic
  const historicalData = useMemo(() => {
    if (hasRealData) {
      return realHistory.map(snap => ({
        date: new Date(snap.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: snap.totalValue,
        fullDate: snap.date
      }));
    }
    return generateHistoricalData(holdings, periodDays);
  }, [hasRealData, realHistory, holdings, periodDays]);

  // Track whether metrics are from real or synthetic data
  const isEstimated = !hasRealData;

  const metrics = useMemo(() => calculateMetrics(holdings, historicalData), [holdings, historicalData]);
  const allocation = useMemo(() => calculateAllocation(holdings), [holdings]);
  const performers = useMemo(() => getTopPerformers(holdings), [holdings]);
  
  const topGainers = useMemo(() => performers.filter(p => p.pnlPercent > 0).slice(0, 3), [performers]);
  const topLosers = useMemo(() => performers.filter(p => p.pnlPercent < 0).slice(-3).reverse(), [performers]);
  
  // Format currency with smart formatting
  const formatValue = useCallback((value: number) => {
    const converted = value * exchangeRate;
    if (Math.abs(converted) >= 1000000) return `${currencySymbol}${(converted / 1000000).toFixed(2)}M`;
    if (Math.abs(converted) >= 1000) return `${currencySymbol}${(converted / 1000).toFixed(1)}K`;
    if (Math.abs(converted) < 1) return `${currencySymbol}${converted.toFixed(4)}`;
    return `${currencySymbol}${converted.toFixed(2)}`;
  }, [currencySymbol, exchangeRate]);
  
  // Refresh handler - refetches real history data from API
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    refetchHistory();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [refetchHistory]);
  
  // Export to CSV
  const handleExport = useCallback(() => {
    const csvContent = [
      'Date,Value',
      ...historicalData.map(d => `${d.fullDate},${d.value.toFixed(2)}`)
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [historicalData]);

  // Empty state check
  if (holdings.length === 0) {
    return (
      <div className="card-surface p-8 rounded-[32px] text-center">
        <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('analytics.noData')}</h3>
        <p className="text-sm text-slate-500">{t('analytics.noDataDesc')}</p>
      </div>
    );
  }

  return (
    <div className="relative" role="region" aria-label="Premium Analytics Dashboard">
      {/* Locked Overlay for non-SuperPulse users */}
      {!isUnlocked && <LockedOverlay onUpgrade={onUpgradeClick} />}
      
      <div className={`space-y-6 ${!isUnlocked ? 'blur-[3px] pointer-events-none select-none' : ''}`}>
        {/* Header with controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-purple-400" />
              {t('analytics.title')}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{t('analytics.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Time Period Selector */}
            <div className="flex items-center bg-slate-800/50 rounded-xl p-1 border border-white/5">
              {(['7d', '30d', '90d'] as TimePeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setTimePeriod(period)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    timePeriod === period 
                      ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                  aria-pressed={timePeriod === period}
                  aria-label={`Show ${period === '7d' ? '7 days' : period === '30d' ? '30 days' : '90 days'} data`}
                >
                  {period.toUpperCase()}
                </button>
              ))}
            </div>
            
            {/* Action buttons */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl bg-slate-800/50 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all disabled:opacity-50"
              aria-label="Refresh data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            
            <button
              onClick={handleExport}
              className="p-2 rounded-xl bg-slate-800/50 border border-white/5 text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all"
              aria-label="Export to CSV"
            >
              <Download className="w-4 h-4" />
            </button>
            
            <div className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30">
              <span className="text-xs font-bold text-purple-400">SuperPulse</span>
            </div>
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
                <h3 className="font-black text-slate-900 dark:text-white text-lg">{t('analytics.aiInsight')}</h3>
                <span className="px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full bg-purple-500/30 text-purple-300 border border-purple-500/40">{t('analytics.liveAnalysis')}</span>
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
            label={t('analytics.totalPL')}
            value={`${metrics.totalPnL >= 0 ? '+' : ''}${formatValue(metrics.totalPnL)}`}
            subValue={`${metrics.pnlPercent >= 0 ? '+' : ''}${metrics.pnlPercent.toFixed(2)}%`}
            icon={metrics.totalPnL >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            trend={metrics.totalPnL >= 0 ? 'up' : 'down'}
            color={metrics.totalPnL >= 0 ? 'emerald' : 'rose'}
            tooltip="Total unrealized profit/loss based on current prices vs. average buy price"
          />
          <MetricCard
            label={t('analytics.volatility')}
            value={`${metrics.volatility.toFixed(1)}%`}
            subValue={t('analytics.annualized')}
            icon={<Activity className="w-4 h-4" />}
            tooltip={t('analytics.volatilityDesc')}
            color={metrics.volatility > 30 ? 'amber' : 'cyan'}
            simulated={isEstimated}
          />
          <MetricCard
            label={t('analytics.sharpeRatio')}
            value={metrics.sharpeRatio.toFixed(2)}
            subValue={metrics.sharpeRatio > 1 ? t('analytics.sharpeGood') : metrics.sharpeRatio > 0 ? t('analytics.sharpeFair') : t('analytics.sharpePoor')}
            icon={<Target className="w-4 h-4" />}
            color={metrics.sharpeRatio > 1 ? 'emerald' : metrics.sharpeRatio > 0 ? 'amber' : 'rose'}
            tooltip={t('analytics.sharpeDesc')}
            simulated={isEstimated}
          />
          <MetricCard
            label={t('analytics.maxDrawdown')}
            value={`-${metrics.maxDrawdown.toFixed(1)}%`}
            subValue={`${periodDays} ${t('analytics.days')}`}
            icon={<Shield className="w-4 h-4" />}
            color={metrics.maxDrawdown > 20 ? 'rose' : 'cyan'}
            tooltip={t('analytics.maxDrawdownDesc')}
            simulated={isEstimated}
          />
        </div>

        {/* Additional Return Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MetricCard
            label={t('analytics.totalReturnDollar')}
            value={isPrivate ? '••••••' : `${metrics.totalReturnDollar >= 0 ? '+' : ''}${formatValue(metrics.totalReturnDollar)}`}
            subValue={t('analytics.unrealizedPL')}
            icon={<DollarSign className="w-4 h-4" />}
            trend={metrics.totalReturnDollar >= 0 ? 'up' : 'down'}
            color={metrics.totalReturnDollar >= 0 ? 'emerald' : 'rose'}
            tooltip={t('analytics.totalReturnDollarDesc')}
          />
          <MetricCard
            label={t('analytics.totalReturnPercent')}
            value={`${metrics.totalReturnPercent >= 0 ? '+' : ''}${metrics.totalReturnPercent.toFixed(1)}%`}
            subValue={t('analytics.portfolioGainLoss')}
            icon={<TrendingUp className="w-4 h-4" />}
            color={metrics.totalReturnPercent >= 0 ? 'emerald' : 'rose'}
            tooltip={t('analytics.totalReturnPercentDesc')}
          />
          <MetricCard
            label={t('analytics.avgHoldingAge')}
            value={metrics.avgHoldingAgeDays < 7
              ? `${metrics.avgHoldingAgeDays}d`
              : metrics.avgHoldingAgeDays < 30
              ? `${Math.floor(metrics.avgHoldingAgeDays / 7)}w`
              : metrics.avgHoldingAgeDays < 365
              ? `${Math.floor(metrics.avgHoldingAgeDays / 30)}mo`
              : `${(metrics.avgHoldingAgeDays / 365).toFixed(1)}y`
            }
            subValue={t('analytics.avgInvestTime')}
            icon={<Clock className="w-4 h-4" />}
            color="purple"
            tooltip={t('analytics.avgHoldingAgeDesc')}
          />
        </div>

        {/* Performance Chart */}
        <div className="card-surface p-6 rounded-[32px]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
                {isEstimated ? 'Estimated' : ''} Portfolio Trend ({periodDays} Days)
              </h3>
              {isEstimated && (
                <div className="group relative">
                  <Info className="w-4 h-4 text-amber-500 cursor-help" />
                  <div className="absolute right-0 top-6 w-56 p-2 bg-slate-800 rounded-lg text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-white/10">
                    Estimated from current allocation with simulated variance. Real historical data will appear after a few days of tracking.
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className={`px-2 py-1 rounded-lg ${metrics.pnlPercent >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {metrics.pnlPercent >= 0 ? '+' : ''}{metrics.pnlPercent.toFixed(2)}% overall
              </span>
            </div>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                  interval={periodDays <= 7 ? 0 : periodDays <= 30 ? 'preserveStartEnd' : Math.floor(periodDays / 6)}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10 }}
                  tickFormatter={(v) => {
                    const converted = v * exchangeRate;
                    if (converted >= 1000000) return `${currencySymbol}${(converted / 1000000).toFixed(1)}M`;
                    if (converted >= 1000) return `${currencySymbol}${(converted / 1000).toFixed(0)}k`;
                    return `${currencySymbol}${converted.toFixed(0)}`;
                  }}
                  width={65}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    color: 'white',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.3)'
                  }}
                  formatter={(value) => [formatValue(value as number), 'Portfolio Value']}
                  labelFormatter={(label) => `📅 ${label}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#00e5ff" 
                  strokeWidth={2}
                  fill="url(#colorValue)"
                  animationDuration={500}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Risk Analysis - Enhanced */}
          <div className="card-surface p-6 rounded-[32px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">{t('analytics.riskAnalysis')}</h3>
              <div className="group relative">
                <Info className="w-4 h-4 text-slate-500 cursor-help" />
                <div className="absolute right-0 top-6 w-48 p-2 bg-slate-800 rounded-lg text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 border border-white/10">
                  Risk metrics based on {timePeriod === '7d' ? '7-day' : timePeriod === '30d' ? '30-day' : '90-day'} historical data
                </div>
              </div>
            </div>
            
            {/* Risk Score Gauge */}
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400 uppercase tracking-wide">{t('analytics.overallRisk')}</span>
                <span className={`text-sm font-bold ${
                  metrics.volatility < 15 ? 'text-emerald-400' :
                  metrics.volatility < 30 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {metrics.volatility < 15 ? t('analytics.riskLow') : metrics.volatility < 30 ? t('analytics.riskModerate') : t('analytics.riskHigh')}
                </span>
              </div>
              <div className="relative h-3 rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 overflow-hidden">
                <div 
                  className="absolute top-0 h-full w-1 bg-white shadow-lg shadow-white/50 transition-all duration-500"
                  style={{ left: `${Math.min(100, (metrics.volatility / 50) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                <span>{t('analytics.riskConservative')}</span>
                <span>{t('analytics.riskBalanced')}</span>
                <span>{t('analytics.riskAggressive')}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-sm text-slate-300">{t('analytics.bestDay')}</span>
                    <p className="text-[10px] text-slate-500">{t('analytics.bestDayDesc')}</p>
                  </div>
                </div>
                <span className="font-bold text-emerald-400">+{metrics.bestDay.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <TrendingDown className="w-4 h-4 text-rose-400" />
                  </div>
                  <div>
                    <span className="text-sm text-slate-300">{t('analytics.worstDay')}</span>
                    <p className="text-[10px] text-slate-500">{t('analytics.worstDayDesc')}</p>
                  </div>
                </div>
                <span className="font-bold text-rose-400">{metrics.worstDay.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <PieChart className="w-4 h-4 text-purple-400" />
                  </div>
                  <div>
                    <span className="text-sm text-slate-300">{t('analytics.diversification')}</span>
                    <p className="text-[10px] text-slate-500">{t('analytics.diversificationDesc')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full transition-all duration-500"
                      style={{ width: `${metrics.diversificationScore}%` }}
                    />
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">{metrics.diversificationScore}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Top Performers - Enhanced */}
          <div className="card-surface p-6 rounded-[32px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">{t('analytics.topPerformers')}</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                  {topGainers.length} ↑
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400">
                  {topLosers.length} ↓
                </span>
              </div>
            </div>
            <div className="space-y-2">
              {topGainers.length > 0 ? (
                topGainers.map((asset, i) => (
                  <div key={asset.id} className="flex justify-between items-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 hover:bg-emerald-500/10 transition-all group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-emerald-400">{i + 1}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white group-hover:text-emerald-400 transition-colors">{asset.symbol}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">{asset.type}</span>
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {formatValue(asset.currentPrice * asset.quantity)} value
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-emerald-400">+{asset.pnlPercent.toFixed(1)}%</span>
                      <p className="text-[10px] text-emerald-400/70">
                        +{formatValue(asset.pnl)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <TrendingUp className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">{t('analytics.noGainersYet')}</p>
                  <p className="text-[10px] text-slate-600">{t('analytics.addMoreAssets')}</p>
                </div>
              )}
              
              {topLosers.length > 0 && (
                <>
                  <div className="relative my-3">
                    <div className="border-t border-white/5" />
                    <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-slate-900 px-2 text-[10px] text-slate-500">
                      {t('analytics.underperformers')}
                    </span>
                  </div>
                  {topLosers.slice(0, 2).map((asset) => (
                    <div key={asset.id} className="flex justify-between items-center p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 hover:bg-rose-500/10 transition-all group cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center">
                          <TrendingDown className="w-3 h-3 text-rose-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 dark:text-white group-hover:text-rose-400 transition-colors">{asset.symbol}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400">{asset.type}</span>
                          </div>
                          <p className="text-[10px] text-slate-500">
                            {formatValue(asset.currentPrice * asset.quantity)} value
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-rose-400">{asset.pnlPercent.toFixed(1)}%</span>
                        <p className="text-[10px] text-rose-400/70">
                          {formatValue(asset.pnl)}
                        </p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Allocation Breakdown - Enhanced */}
        <div className="card-surface p-6 rounded-[32px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">{t('analytics.assetAllocation')}</h3>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Info className="w-3 h-3" />
              <span>{holdings.length} assets</span>
            </div>
          </div>
          
          {/* Pie Chart and Bar Chart side by side */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="h-[160px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={allocation}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={2}
                    animationDuration={500}
                  >
                    {allocation.map((entry, index) => (
                      <Cell key={`pie-${index}`} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: 'white'
                    }}
                    formatter={(value, name, props) => [
                      `${formatValue(value as number)} (${(props.payload as { percent: number }).percent.toFixed(1)}%)`,
                      name
                    ]}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
            
            {/* Bar Chart */}
            <div className="h-[160px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={allocation} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
                    width={70}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      color: 'white'
                    }}
                    formatter={(value, _name, props) => [
                      `${formatValue(value as number)} (${(props.payload as { percent: number }).percent.toFixed(1)}%)`,
                      'Value'
                    ]}
                  />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} animationDuration={500}>
                    {allocation.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-4 mt-4 pt-4 border-t border-white/5">
            {allocation.map(a => (
              <div key={a.name} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: a.color }} />
                <span className="text-xs font-medium text-slate-300">{a.name}</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">{a.percent.toFixed(1)}%</span>
                <span className="text-xs text-slate-500">({formatValue(a.value)})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PremiumAnalytics;

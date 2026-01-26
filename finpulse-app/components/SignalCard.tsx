/**
 * Signal Card Component
 * Displays combined signal analysis with confidence score and component breakdown
 * Used in NewsSidebar "Signals" tab and holdings table overlay
 */

import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Zap } from 'lucide-react';
import { CombinedSignal } from '../types';

interface SignalCardProps {
  signal: CombinedSignal;
  compact?: boolean; // Compact mode for holdings table (one-line)
  showComponents?: boolean; // Show whale/trade/sentiment breakdown
  onClick?: () => void;
}

const getDirectionColor = (direction: string) => {
  switch (direction) {
    case 'bullish':
      return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' };
    case 'bearish':
      return { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' };
    default:
      return { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' };
  }
};

const getDirectionIcon = (direction: string) => {
  switch (direction) {
    case 'bullish':
      return <TrendingUp className="w-4 h-4" />;
    case 'bearish':
      return <TrendingDown className="w-4 h-4" />;
    default:
      return <Zap className="w-3 h-3" />;
  }
};

/**
 * COMPACT MODE: Single line for holdings table
 * Format: "Signal: Bullish · Confidence 72 · Whale+Trade [⚠️ Conflict]"
 */
const CompactSignalCard: React.FC<SignalCardProps> = ({ signal, onClick }) => {
  const colors = getDirectionColor(signal.direction);
  const _components = [
    signal.componentScores.whale > 0 && 'Whale',
    signal.componentScores.trade > 0 && 'Trade',
    signal.componentScores.sentiment > 0 && 'Sentiment',
  ]
    .filter(Boolean)
    .join('+');

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold ${colors.bg} ${colors.border} hover:opacity-80 transition-opacity cursor-pointer whitespace-nowrap`}
    >
      <span className={`${colors.text}`}>{signal.direction.charAt(0).toUpperCase() + signal.direction.slice(1)}</span>
      <span className="text-slate-400 text-[8px]">·</span>
      <span className="text-white text-[9px]">{signal.confidenceScore}</span>
      {signal.hasConflict && (
        <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0 ml-0.5" />
      )}
    </div>
  );
};

/**
 * FULL MODE: Detailed signal card for NewsSidebar
 * Shows confidence score, direction, components, accuracy, and conflict details
 */
const FullSignalCard: React.FC<SignalCardProps> = ({ signal, showComponents = true, onClick }) => {
  const colors = getDirectionColor(signal.direction);
  const directionIcon = getDirectionIcon(signal.direction);

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-xl border ${colors.bg} ${colors.border} hover:opacity-90 transition-opacity cursor-pointer`}
    >
      {/* Header: Symbol + Direction + Confidence */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black text-white">{signal.symbol}</span>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${colors.bg} ${colors.border} border`}>
            {directionIcon}
            <span className={`text-xs font-bold uppercase ${colors.text}`}>{signal.direction}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-white">{signal.confidenceScore}</div>
          <div className="text-[9px] font-bold text-slate-500 uppercase">Confidence</div>
        </div>
      </div>

      {/* Accuracy Badge */}
      {signal.accuracy && (
        <div className="mb-3 flex items-center gap-1 text-xs font-bold text-slate-300">
          <Zap className="w-3 h-3 text-amber-400" />
          {signal.accuracy}% accuracy (signal category)
        </div>
      )}

      {/* Component Breakdown */}
      {showComponents && (
        <div className="space-y-2 mb-3 pb-3 border-t border-slate-500/20">
          {signal.componentScores.whale > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Whale Flow</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500"
                    style={{ width: `${signal.componentScores.whale}%` }}
                  />
                </div>
                <span className="text-white font-bold w-6 text-right">{signal.componentScores.whale}</span>
              </div>
            </div>
          )}
          {signal.componentScores.trade > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Trade Signal</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${signal.componentScores.trade}%` }}
                  />
                </div>
                <span className="text-white font-bold w-6 text-right">{signal.componentScores.trade}</span>
              </div>
            </div>
          )}
          {signal.componentScores.sentiment > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Sentiment</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500"
                    style={{ width: `${signal.componentScores.sentiment}%` }}
                  />
                </div>
                <span className="text-white font-bold w-6 text-right">{signal.componentScores.sentiment}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conflict Warning */}
      {signal.hasConflict && signal.conflictDetails && (
        <div className="flex items-start gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-300">{signal.conflictDetails}</div>
        </div>
      )}

      {/* Timestamp */}
      <div className="mt-3 pt-2 border-t border-slate-500/10 text-[9px] text-slate-500">
        {new Date(signal.createdAt).toLocaleTimeString()}
      </div>
    </div>
  );
};

/**
 * SignalCard with memoization to prevent unnecessary re-renders
 * Only re-renders when signal data actually changes
 */
export const SignalCard: React.FC<SignalCardProps> = React.memo((props) => {
  if (props.compact) {
    return <CompactSignalCard {...props} />;
  }
  return <FullSignalCard {...props} />;
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if signal data changed
  return (
    prevProps.signal.symbol === nextProps.signal.symbol &&
    prevProps.signal.direction === nextProps.signal.direction &&
    prevProps.signal.confidenceScore === nextProps.signal.confidenceScore &&
    prevProps.compact === nextProps.compact &&
    prevProps.showComponents === nextProps.showComponents
  );
});

SignalCard.displayName = 'SignalCard';

export default SignalCard;

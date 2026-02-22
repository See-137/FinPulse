import React, { useMemo } from 'react';
import { Users, Zap, ChevronRight, RefreshCw, AlertCircle } from 'lucide-react';
import { TweetCard } from './TweetCard';
import { useInfluencerTweets } from '../hooks/useInfluencerTweets';
import { influencerService } from '../services/influencerService';
import type { User, Holding, PlanType } from '../types';

interface InfluencerFeedProps {
  user: User | null;
  holdings: Holding[];
  onUpgradeClick?: () => void;
  isAuthInitializing?: boolean;
}

// Tier badge colors
const TIER_COLORS: Record<PlanType, { bg: string; text: string; border: string }> = {
  FREE: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
  PROPULSE: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  SUPERPULSE: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
};

/**
 * InfluencerFeed - Display tweets from tracked influencers
 * Filtered by user's portfolio holdings
 */
export const InfluencerFeed: React.FC<InfluencerFeedProps> = ({
  user,
  holdings,
  onUpgradeClick,
  isAuthInitializing = false,
}) => {
  // Memoize to keep a stable array reference — prevents infinite re-fetch loop
  // caused by a new array being created on every render
  const holdingSymbols = useMemo(() => holdings.map(h => h.symbol), [holdings]);

  const {
    tweets,
    loading,
    error,
    refetch,
    lastUpdated,
  } = useInfluencerTweets(user?.plan, holdingSymbols);

  // Auth still initializing — show loading skeleton
  if (!user && isAuthInitializing) {
    return (
      <div className="space-y-4">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="bg-[#151921] border border-white/5 rounded-2xl p-4 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-slate-800 rounded-lg" />
              <div className="h-3 w-24 bg-slate-800 rounded" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full bg-slate-800 rounded" />
              <div className="h-3 w-3/4 bg-slate-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Auth resolved but no user — show sign-in prompt
  if (!user) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mx-auto mb-4">
          <Users className="w-6 h-6 text-slate-600" />
        </div>
        <p className="text-slate-400 text-sm font-bold mb-1">Sign in to see influencer tweets</p>
        <p className="text-slate-600 text-xs">Track what top traders are saying about your holdings</p>
      </div>
    );
  }

  const limits = influencerService.getInfluencerLimits();
  const accessibleCount = influencerService.getAccessibleInfluencers(user.plan).length;
  const totalInfluencers = limits['SUPERPULSE']; // max tier count — avoids magic number
  const upgrade = influencerService.getUpgradeSuggestion(user.plan);

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="bg-gradient-to-br from-[#151921] to-[#0d1117] p-5 rounded-[24px] border border-white/5 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/10 to-purple-500/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Influencer Feed</h3>
                <p className="text-[10px] text-slate-500">
                  {holdingSymbols.length > 0
                    ? `Tweets about your ${holdingSymbols.length} holdings`
                    : 'Latest from tracked influencers'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {error && (
                <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] font-bold rounded">
                  OFFLINE
                </span>
              )}
              <div className={`px-2 py-1 rounded-lg ${TIER_COLORS[user.plan].bg} ${TIER_COLORS[user.plan].border} border`}>
                <span className={`text-[9px] font-bold ${TIER_COLORS[user.plan].text}`}>{user.plan}</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${(accessibleCount / totalInfluencers) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {accessibleCount}/{limits[user.plan]} influencers
            </span>
          </div>
        </div>
      </div>

      {/* Refresh Button & Status */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[10px] text-slate-600">
              Updated {formatTimeAgo(lastUpdated)}
            </span>
          )}
          {error && (
            <div className="flex items-center gap-1 text-amber-400">
              <AlertCircle className="w-3 h-3" />
              <span className="text-[10px]">{error}</span>
            </div>
          )}
        </div>
        <button
          onClick={refetch}
          disabled={loading}
          className={`p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-all ${
            loading ? 'animate-spin' : ''
          }`}
          title="Refresh tweets"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tweet List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
        {loading && tweets.length === 0 ? (
          // Loading skeletons
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-[#151921] border border-white/5 rounded-2xl p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-slate-800 rounded-lg" />
                <div className="h-3 w-24 bg-slate-800 rounded" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-slate-800 rounded" />
                <div className="h-3 w-3/4 bg-slate-800 rounded" />
              </div>
              <div className="flex gap-4 mt-3">
                <div className="h-2 w-10 bg-slate-800 rounded" />
                <div className="h-2 w-10 bg-slate-800 rounded" />
                <div className="h-2 w-10 bg-slate-800 rounded" />
              </div>
            </div>
          ))
        ) : tweets.length === 0 ? (
          // Empty state — show different message for API errors vs no results
          <div className="text-center py-12">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 ${error ? 'bg-amber-500/10' : 'bg-slate-800'}`}>
              {error
                ? <AlertCircle className="w-6 h-6 text-amber-500" />
                : <Users className="w-6 h-6 text-slate-600" />}
            </div>
            <p className="text-slate-400 text-sm font-bold mb-1">
              {error
                ? 'Feed temporarily unavailable'
                : holdingSymbols.length === 0
                  ? 'Add holdings to see relevant tweets'
                  : 'No matching tweets found'}
            </p>
            <p className="text-slate-600 text-xs">
              {error
                ? 'The influencer feed could not load. Try refreshing.'
                : holdingSymbols.length === 0
                  ? 'Your portfolio is empty'
                  : 'Try adding more assets to your PulseBoard'}
            </p>
            {error && (
              <button
                onClick={refetch}
                disabled={loading}
                className="mt-4 px-4 py-2 text-xs font-bold text-cyan-400 bg-cyan-500/10 rounded-xl hover:bg-cyan-500/20 transition-all"
              >
                Try again
              </button>
            )}
          </div>
        ) : (
          // Tweet cards
          tweets.map(tweet => (
            <TweetCard
              key={tweet.id}
              tweet={tweet}
              holdingSymbols={holdingSymbols}
            />
          ))
        )}
      </div>

      {/* Upgrade CTA */}
      {upgrade && (
        <button
          onClick={onUpgradeClick}
          className="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-400" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white">
                  Track {upgrade.additionalInfluencers} more influencers
                </p>
                <p className="text-[10px] text-slate-400">
                  Upgrade to {upgrade.nextPlan} for more signals
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      )}

      {/* Footer */}
      <div className="flex items-center justify-center gap-4 pt-2 border-t border-white/5">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
          <span className={`w-1.5 h-1.5 rounded-full ${error ? 'bg-amber-500' : tweets.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
          {error ? 'Disconnected' : tweets.length > 0 ? 'Live on X.com' : 'Waiting for data'}
        </div>
        <div className="text-[10px] text-slate-600">
          {tweets.length} tweets loaded
        </div>
      </div>
    </div>
  );
};

// Helper to format time ago
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  return `${Math.floor(diffMins / 60)}h ago`;
}

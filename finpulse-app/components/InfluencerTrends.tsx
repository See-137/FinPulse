import React, { useState, useMemo } from 'react';
import { influencerService } from '../services/influencerService';
import { Influencer, User, PlanType } from '../types';
import {
  Lock, ExternalLink,
  Users, Search, Star, Zap, ChevronRight
} from 'lucide-react';
import { INFLUENCER_LIST } from '../constants';

interface InfluencerTrendsProps {
  user: User | null;
  onUpgradeClick?: () => void;
}

// Focus area icons mapping
const FOCUS_ICONS: Record<string, string> = {
  'BTC': '₿',
  'ETH': 'Ξ',
  'BTC/DOGE': '🚀',
  'Binance/BNB': '🔶',
  'Tech stocks': '📈',
  'Coinbase': '🔵',
  'Crypto macro': '🌐',
  'Macro': '📊',
  'Trading': '📉',
  'On-chain': '⛓️',
  'Analytics': '📱',
  'Whales': '🐋',
  'Tech': '💻',
  'TSLA/Tech': '⚡',
  'Data': '📊',
  'Sentiment': '🎭',
  'TA': '📐',
  'BTC news': '📰',
  'S2F model': '📈',
  'Research': '🔬',
  'VC': '💰',
  'DeFi': '🏦',
  'Galaxy': '🌌',
  'Messari': '📑',
  'Inverse signal': '🔄',
  'LUNA': '🌙',
};

// Tier badge colors
const TIER_COLORS: Record<PlanType, { bg: string; text: string; border: string }> = {
  FREE: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
  PROPULSE: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  SUPERPULSE: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
};

/**
 * InfluencerTrends Component - "Whales" Tab
 * Track influential crypto/finance voices on X.com
 * Plan-gated: FREE: 5 | PROPULSE: 15 | SUPERPULSE: 30
 */
export const InfluencerTrends: React.FC<InfluencerTrendsProps> = ({ user, onUpgradeClick }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFocus, setSelectedFocus] = useState<string | null>(null);
  const [showLocked, setShowLocked] = useState(false);

  // Get accessible influencers based on user plan
  const userPlan = user?.plan;
  const accessibleInfluencers = useMemo(() => {
    if (!userPlan) return [];
    return influencerService.getAccessibleInfluencers(userPlan);
  }, [userPlan]);

  // Get locked influencers (higher tier)
  const lockedInfluencers = useMemo(() => {
    if (!userPlan) return INFLUENCER_LIST;
    return INFLUENCER_LIST.filter(inf => !accessibleInfluencers.some(a => a.username === inf.username));
  }, [userPlan, accessibleInfluencers]);

  // Get unique focus areas from accessible influencers
  const focusAreas = useMemo(() => {
    const areas = new Set(accessibleInfluencers.map(inf => inf.focus));
    return Array.from(areas);
  }, [accessibleInfluencers]);

  // Filter influencers by search and focus
  const filteredInfluencers = useMemo(() => {
    let result = showLocked ? [...accessibleInfluencers, ...lockedInfluencers] : accessibleInfluencers;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(inf => 
        inf.name.toLowerCase().includes(query) || 
        inf.username.toLowerCase().includes(query) ||
        inf.focus.toLowerCase().includes(query)
      );
    }
    
    if (selectedFocus) {
      result = result.filter(inf => inf.focus === selectedFocus);
    }
    
    return result;
  }, [accessibleInfluencers, lockedInfluencers, searchQuery, selectedFocus, showLocked]);

  // Check if influencer is locked
  const isLocked = (influencer: Influencer) => {
    return !accessibleInfluencers.some(a => a.username === influencer.username);
  };

  if (!user) {
    return (
      <div className="p-6 bg-[#151921] rounded-[24px] border border-white/5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-800 rounded w-1/2"></div>
          <div className="h-3 bg-slate-800 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  const limits = influencerService.getInfluencerLimits();
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
                <h3 className="text-sm font-black text-white">Whale Tracker</h3>
                <p className="text-[10px] text-slate-500">X.com Influencer Feed</p>
              </div>
            </div>
            <div className={`px-2 py-1 rounded-lg ${TIER_COLORS[user.plan].bg} ${TIER_COLORS[user.plan].border} border`}>
              <span className={`text-[9px] font-bold ${TIER_COLORS[user.plan].text}`}>{user.plan}</span>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${(accessibleInfluencers.length / 30) * 100}%` }}
                />
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {accessibleInfluencers.length}/{limits[user.plan]}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search influencers..."
            className="w-full bg-[#151921] border border-white/5 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/30"
          />
        </div>
        <button
          onClick={() => setShowLocked(!showLocked)}
          className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition-all ${
            showLocked 
              ? 'bg-purple-500/10 border-purple-500/30 text-purple-400' 
              : 'bg-[#151921] border-white/5 text-slate-500 hover:text-white'
          }`}
          title={showLocked ? 'Hide locked' : 'Show all'}
        >
          <Lock className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Focus Filter Pills */}
      {focusAreas.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setSelectedFocus(null)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all ${
              !selectedFocus
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'bg-[#151921] text-slate-500 border border-white/5 hover:text-white'
            }`}
          >
            All
          </button>
          {focusAreas.slice(0, 5).map(focus => (
            <button
              key={focus}
              onClick={() => setSelectedFocus(selectedFocus === focus ? null : focus)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedFocus === focus
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-[#151921] text-slate-500 border border-white/5 hover:text-white'
              }`}
            >
              <span>{FOCUS_ICONS[focus] || '📌'}</span>
              {focus}
            </button>
          ))}
        </div>
      )}

      {/* Influencers List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
        {filteredInfluencers.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-slate-800 flex items-center justify-center">
              <Search className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-xs text-slate-500">No influencers found</p>
          </div>
        ) : (
          filteredInfluencers.map((influencer, index) => {
            const locked = isLocked(influencer);
            return (
              <div
                key={influencer.username}
                className={`group relative rounded-2xl border transition-all duration-200 ${
                  locked
                    ? 'bg-[#151921]/50 border-white/5 opacity-60'
                    : 'bg-[#151921] border-white/5 hover:border-cyan-500/30 hover:bg-[#1a1f2a]'
                }`}
              >
                {locked ? (
                  // Locked influencer (non-clickable)
                  <div className="p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-lg">
                      <Lock className="w-4 h-4 text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-500 truncate">{influencer.name}</span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded ${TIER_COLORS[influencer.tier].bg} ${TIER_COLORS[influencer.tier].text}`}>
                          {influencer.tier}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600">@{influencer.username}</p>
                    </div>
                  </div>
                ) : (
                  // Accessible influencer (clickable)
                  <a
                    href={`https://x.com/${influencer.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-3 flex items-center gap-3 block"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-lg shrink-0">
                      {FOCUS_ICONS[influencer.focus] || '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors truncate">
                          {influencer.name}
                        </span>
                        {influencer.tier === 'FREE' && index < 3 && (
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-slate-500">@{influencer.username}</p>
                        <span className="text-[9px] text-slate-600">•</span>
                        <span className="text-[10px] text-cyan-500/70">{influencer.focus}</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0" />
                  </a>
                )}
              </div>
            );
          })
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
                  Unlock {upgrade.additionalInfluencers} more voices
                </p>
                <p className="text-[10px] text-slate-400">
                  Upgrade to {upgrade.nextPlan} • {limits[upgrade.nextPlan]} total
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      )}

      {/* Footer Stats */}
      <div className="flex items-center justify-center gap-4 pt-2 border-t border-white/5">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live on X.com
        </div>
        <div className="text-[10px] text-slate-600">
          {INFLUENCER_LIST.length} influencers tracked
        </div>
      </div>
    </div>
  );
};

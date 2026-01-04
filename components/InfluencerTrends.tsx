import React, { useState, useEffect } from 'react';
import { influencerService } from '../services/influencerService';
import { Influencer, User } from '../types';
import { Lock, TrendingUp, CheckCircle2 } from 'lucide-react';
import { INFLUENCER_LIST } from '../constants';

interface InfluencerTrendsProps {
  user: User | null;
  onUpgradeClick?: () => void;
}

/**
 * InfluencerTrends Component
 * Displays X.com influencers based on user's subscription plan
 * FREE: 5 | PROPULSE: 15 | SUPERPULSE: 30
 */
export const InfluencerTrends: React.FC<InfluencerTrendsProps> = ({ user, onUpgradeClick }) => {
  const [accessibleInfluencers, setAccessibleInfluencers] = useState<Influencer[]>([]);
  const [groupedInfluencers, setGroupedInfluencers] = useState<Record<string, Influencer[]>>({});
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const influencers = influencerService.getAccessibleInfluencers(user.plan);
      setAccessibleInfluencers(influencers);
      const grouped = influencerService.groupByFocus(influencers);
      setGroupedInfluencers(grouped);
      // Set first category as default
      if (Object.keys(grouped).length > 0) {
        setSelectedCategory(Object.keys(grouped)[0]);
      }
    }
  }, [user]);

  if (!user) {
    return (
      <div className="p-4 bg-slate-900 rounded-lg border border-slate-700">
        <p className="text-sm text-slate-400">Loading user information...</p>
      </div>
    );
  }

  const upgrade = influencerService.getUpgradeSuggestion(user.plan);
  const limits = influencerService.getInfluencerLimits();
  const maxInfluencers = limits[user.plan];

  return (
    <div className="space-y-4">
      {/* Header with Plan Info */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-4 rounded-lg border border-slate-700">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-cyan-400" />
              Influencer Trends
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Following {accessibleInfluencers.length} / {maxInfluencers} influencers on X.com
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 mb-1">Your Plan</div>
            <div className="text-sm font-semibold text-cyan-400">{user.plan}</div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      {Object.keys(groupedInfluencers).length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-700">
          {Object.entries(groupedInfluencers).map(([category, influencers]) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-2 rounded text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-cyan-500 text-black'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {category} ({influencers.length})
            </button>
          ))}
        </div>
      )}

      {/* Influencers List */}
      {selectedCategory && groupedInfluencers[selectedCategory] && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {groupedInfluencers[selectedCategory].map(influencer => (
            <a
              key={influencer.username}
              href={`https://x.com/${influencer.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors group"
            >
              <div className="flex-1">
                <div className="font-medium text-white group-hover:text-cyan-400">
                  {influencer.name}
                </div>
                <div className="text-xs text-slate-400">@{influencer.username}</div>
                <div className="text-xs text-slate-500 mt-1">{influencer.focus}</div>
              </div>
              <div className="ml-2">
                <CheckCircle2 className="h-5 w-5 text-cyan-400" />
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Upgrade CTA */}
      {upgrade && (
        <div className="bg-gradient-to-r from-purple-900 to-purple-800 p-4 rounded-lg border border-purple-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Lock className="h-4 w-4 text-purple-300" />
                <span className="text-sm font-semibold text-white">Unlock {upgrade.additionalInfluencers} More Influencers</span>
              </div>
              <p className="text-xs text-purple-200">
                Upgrade to <span className="font-semibold">{upgrade.nextPlan}</span> to track {limits[upgrade.nextPlan]} influencers
              </p>
            </div>
            <button
              onClick={onUpgradeClick}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded transition-colors"
            >
              Upgrade
            </button>
          </div>
        </div>
      )}

      {/* Info about unavailable influencers */}
      {accessibleInfluencers.length < INFLUENCER_LIST.length && (
        <div className="p-3 bg-slate-800 rounded border border-slate-700 text-xs text-slate-400">
          <p>
            {INFLUENCER_LIST.length - accessibleInfluencers.length} additional influencers available in higher plans
          </p>
        </div>
      )}
    </div>
  );
};

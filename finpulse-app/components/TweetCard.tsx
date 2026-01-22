import React from 'react';
import { Heart, Repeat2, MessageCircle, Eye, ExternalLink } from 'lucide-react';
import type { TweetData } from '../types';

interface TweetCardProps {
  tweet: TweetData;
  holdingSymbols?: string[];
}

// Format relative time
const formatTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// Format large numbers
const formatNumber = (num: number): string => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

/**
 * TweetCard - Display an individual influencer tweet
 * Styled to match the FinPulse design system
 */
export const TweetCard: React.FC<TweetCardProps> = ({ tweet, holdingSymbols = [] }) => {
  const tweetUrl = `https://x.com/${tweet.authorUsername}/status/${tweet.id}`;

  // Highlight symbols that match user holdings
  const relevantSymbols = tweet.mentionedSymbols.filter(s =>
    holdingSymbols.map(h => h.toUpperCase()).includes(s.toUpperCase())
  );
  const otherSymbols = tweet.mentionedSymbols.filter(s =>
    !holdingSymbols.map(h => h.toUpperCase()).includes(s.toUpperCase())
  );

  return (
    <a
      href={tweetUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-[#151921] border border-white/5 rounded-2xl p-4 transition-all duration-200 hover:border-cyan-500/30 hover:bg-[#1a1f2a] group"
    >
      {/* Header: Author + Time */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {/* X/Twitter icon as avatar placeholder */}
          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center">
            <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>
          <div>
            <span className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
              @{tweet.authorUsername}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-500">
            {formatTime(tweet.createdAt)}
          </span>
          <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 transition-colors" />
        </div>
      </div>

      {/* Tweet Text */}
      <p className="text-xs text-slate-300 leading-relaxed mb-3 line-clamp-4">
        {tweet.text}
      </p>

      {/* Symbol Tags */}
      {tweet.mentionedSymbols.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {/* Highlighted holdings symbols */}
          {relevantSymbols.map(symbol => (
            <span
              key={symbol}
              className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-[9px] font-black border border-cyan-500/30"
            >
              ${symbol}
            </span>
          ))}
          {/* Other mentioned symbols */}
          {otherSymbols.map(symbol => (
            <span
              key={symbol}
              className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-[9px] font-bold"
            >
              ${symbol}
            </span>
          ))}
        </div>
      )}

      {/* Metrics Row */}
      <div className="flex items-center gap-4 text-[10px] text-slate-500">
        <div className="flex items-center gap-1">
          <Heart className="w-3 h-3" />
          <span>{formatNumber(tweet.metrics.likes)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Repeat2 className="w-3 h-3" />
          <span>{formatNumber(tweet.metrics.retweets)}</span>
        </div>
        <div className="flex items-center gap-1">
          <MessageCircle className="w-3 h-3" />
          <span>{formatNumber(tweet.metrics.replies)}</span>
        </div>
        {tweet.metrics.views && (
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{formatNumber(tweet.metrics.views)}</span>
          </div>
        )}
      </div>
    </a>
  );
};

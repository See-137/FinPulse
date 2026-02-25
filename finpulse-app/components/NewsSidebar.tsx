
import React, { useState, useMemo } from 'react';
import { User } from '../types';
import { usePortfolioStore } from '../store/portfolioStore';
import { InfluencerFeed } from './InfluencerFeed';
import { useNews } from '../hooks/useNews';
import { NewsArticle, filterArticlesByHoldings, formatNewsTime } from '../types/news';
import { useLanguage } from '../i18n';

interface NewsSidebarProps {
  user?: User | null;
  onUpgradeClick?: () => void;
  isAuthInitializing?: boolean;
}

// Internal article type with tags for display
interface DisplayArticle extends NewsArticle {
  tags: string[];
}

export const NewsSidebar: React.FC<NewsSidebarProps> = ({ user, onUpgradeClick, isAuthInitializing = false }) => {
  const { t } = useLanguage();
  const [activeFilter, setActiveFilter] = useState<'Holdings' | 'X Feed' | 'All'>('All');
  const { articles, loading, source: newsSource, refresh } = useNews({ maxArticles: 8 });
  // Subscribe to the raw per-user map + currentUserId so we only re-render when
  // holdings actually change, and memoize to keep the array reference stable.
  const { getHoldings, currentUserId, userHoldings } = usePortfolioStore();
  const holdings = useMemo(() => getHoldings(), [currentUserId, userHoldings]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get user's holding symbols
  const userSymbols = useMemo(() =>
    holdings.map(h => h.symbol.toUpperCase()),
    [holdings]
  );

  // Transform articles to display format with tags
  const displayArticles: DisplayArticle[] = useMemo(() =>
    articles.map(article => ({
      ...article,
      tags: [article.category?.toUpperCase() || 'MARKET'],
    })),
    [articles]
  );

  // Filter articles based on active tab
  const filteredArticles = useMemo(() => {
    if (activeFilter === 'All') return displayArticles;
    if (activeFilter === 'Holdings') {
      if (userSymbols.length === 0) return [];
      return filterArticlesByHoldings(displayArticles, userSymbols) as DisplayArticle[];
    }
    return [];
  }, [activeFilter, displayArticles, userSymbols]);

  const handleRefresh = async () => {
    await refresh();
  };

  // Render content based on filter
  const renderContent = () => {
    if (activeFilter === 'X Feed') {
      return <InfluencerFeed user={user || null} holdings={holdings} onUpgradeClick={onUpgradeClick} isAuthInitializing={isAuthInitializing} />;
    }

    if (loading && articles.length === 0) {
      // Skeleton Loader
      return ['skeleton-1', 'skeleton-2', 'skeleton-3', 'skeleton-4'].map((id) => (
        <div key={id} className="bg-[#151921] border border-white/5 rounded-2xl p-4 animate-pulse">
          <div className="flex justify-between mb-3">
            <div className="h-2 w-20 bg-slate-800 rounded"></div>
            <div className="h-2 w-10 bg-slate-800 rounded"></div>
          </div>
          <div className="h-3 w-full bg-slate-800 rounded mb-2"></div>
          <div className="h-3 w-2/3 bg-slate-800 rounded mb-4"></div>
        </div>
      ));
    }

    if (filteredArticles.length === 0) {
      // Empty state
      return (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
            </svg>
          </div>
          <p className="text-slate-400 text-sm font-bold mb-1">
            {activeFilter === 'Holdings' ? t('news.noNewsHoldings') : t('news.noNewsAvailable')}
          </p>
          <p className="text-slate-600 text-xs">
            {activeFilter === 'Holdings' ? t('news.addAssetsForNews') : t('news.checkBackLater')}
          </p>
        </div>
      );
    }

    // News articles
    return filteredArticles.map((item) => {
      const hasUrl = item.url && item.url !== '#';
      const CardWrapper = hasUrl ? 'a' : 'div';
      const cardProps = hasUrl
        ? { href: item.url, target: '_blank', rel: 'noopener noreferrer' }
        : {};

      return (
        <CardWrapper
          key={item.id}
          {...cardProps}
          className={`block bg-[#151921] border border-white/5 rounded-2xl p-4 transition-all group relative overflow-hidden ${
            hasUrl
              ? 'hover:border-[#00e5ff]/40 hover:bg-blue-500/5 cursor-pointer'
              : 'opacity-75'
          }`}
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-black uppercase text-blue-400/80">{item.source}</span>
            <span className="text-[10px] font-bold text-slate-500">{formatNewsTime(item.publishedAt)}</span>
          </div>
          <h3 className="text-sm font-bold leading-snug mb-2 group-hover:text-[#00e5ff] transition-colors text-slate-200">
            {item.title}
            {hasUrl && (
              <span className="ml-2 text-[10px] text-slate-500 group-hover:text-[#00e5ff]">↗</span>
            )}
          </h3>
          {item.description && <p className="text-xs text-slate-400 mb-3 line-clamp-2 leading-relaxed">{item.description}</p>}
          <div className="flex flex-wrap gap-2 items-center">
            {item.tags.filter(t => t.length > 0).map(tag => (
              <span key={tag} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-[4px] text-[8px] font-black border border-blue-500/20">{tag}</span>
            ))}
          </div>
          {!hasUrl && (
            <div className="mt-3 text-[10px] text-slate-500 italic">{t('news.noSource')}</div>
          )}
        </CardWrapper>
      );
    });
  };

  return (
    <div className="w-full h-full glass-sidebar flex flex-col shadow-2xl shadow-black/50 border-l border-white/5">
      <div className="p-6 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
              </svg>
            </div>
            <h2 className="font-black text-lg tracking-tight text-white">{t('news.marketNews')}</h2>
            {newsSource === 'live' && (
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-black rounded-full animate-pulse">{t('news.live')}</span>
            )}
            {newsSource === 'cached' && (
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[9px] font-black rounded-full">{t('news.cached')}</span>
            )}
            {newsSource === 'offline' && articles.length > 0 && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] font-black rounded-full">{t('news.offline')}</span>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className={`p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all ${loading ? 'animate-spin opacity-50' : ''}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </button>
        </div>

        <div className="flex bg-[#0b0e14] p-1.5 rounded-xl gap-1 border border-white/5">
          {([{ key: 'Holdings', label: t('news.holdings') }, { key: 'X Feed', label: t('news.xFeed') }, { key: 'All', label: t('news.all') }] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveFilter(key as 'Holdings' | 'X Feed' | 'All')}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-200 ${
                activeFilter === key
                  ? 'bg-[#00e5ff] text-[#0b0e14] shadow-lg shadow-[#00e5ff]/30'
                  : 'text-slate-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {renderContent()}
      </div>
    </div>
  );
};

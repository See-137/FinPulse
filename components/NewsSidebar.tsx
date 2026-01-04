
import React, { useState, useEffect } from 'react';
import { fetchNews } from '../hooks/useMarketData';
import { PlanType } from '../types';
import { usePortfolioStore } from '../store/portfolioStore';

interface NewsArticle {
  id: string;
  source: string;
  title: string;
  summary: string;
  tags: string[];
  url?: string;
  image?: string;
  publishedAt?: string;
}

interface NewsSidebarProps {
  userPlan: PlanType;
}

// Keywords for holdings-based filtering
const SYMBOL_KEYWORDS: Record<string, string[]> = {
  'BTC': ['bitcoin', 'btc', 'crypto'],
  'ETH': ['ethereum', 'eth', 'ether'],
  'SOL': ['solana', 'sol'],
  'NVDA': ['nvidia', 'nvda', 'gpu', 'ai chip'],
  'MSTR': ['microstrategy', 'mstr', 'saylor'],
  'AAPL': ['apple', 'aapl', 'iphone'],
  'MSFT': ['microsoft', 'msft', 'azure'],
  'GOOGL': ['google', 'alphabet', 'googl'],
  'TSLA': ['tesla', 'tsla', 'musk'],
  'PLTR': ['palantir', 'pltr'],
};

export const NewsSidebar: React.FC<NewsSidebarProps> = ({ userPlan }) => {
  const [activeFilter, setActiveFilter] = useState<'Holdings' | 'Watchlist' | 'All'>('All');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLive, setIsLive] = useState(false);
  const { getHoldings } = usePortfolioStore();
  const holdings = getHoldings();

  // Get user's holding symbols
  const userSymbols = holdings.map(h => h.symbol.toUpperCase());

  // Filter articles based on active tab
  const getFilteredArticles = () => {
    if (activeFilter === 'All') return articles;
    if (activeFilter === 'Holdings') {
      if (userSymbols.length === 0) return [];
      return articles.filter(article => {
        const text = `${article.title} ${article.summary} ${article.tags.join(' ')}`.toLowerCase();
        return userSymbols.some(symbol => {
          const keywords = SYMBOL_KEYWORDS[symbol] || [symbol.toLowerCase()];
          return keywords.some(kw => text.includes(kw.toLowerCase()));
        });
      });
    }
    // Watchlist - for now return empty, can be enhanced later
    return [];
  };

  const filteredArticles = getFilteredArticles();

  const loadNews = async () => {
    setLoading(true);
    try {
      const result = await fetchNews();
      
      if (result.success && result.data) {
        const parsedArticles: NewsArticle[] = result.data.slice(0, 8).map((item: any) => ({
          id: item.id,
          source: item.source || 'News',
          title: item.title,
          summary: item.description || '',
          tags: [item.category?.toUpperCase() || 'MARKET'],
          url: item.url,
          image: item.image,
          publishedAt: item.publishedAt
        }));
        setArticles(parsedArticles);
        setIsLive(result.source === 'gnews');
      }
    } catch (error) {
      // Fallback news with proper source links
      setArticles([
        { 
          id: '1', 
          source: 'CoinGecko', 
          title: 'Markets Update: Crypto holds steady', 
          summary: 'Bitcoin and major cryptocurrencies maintain positions amid market uncertainty.', 
          tags: ['CRYPTO'],
          url: 'https://www.coingecko.com/en/news'
        },
        { 
          id: '2', 
          source: 'TechCrunch', 
          title: 'Tech stocks rally on AI optimism', 
          summary: 'NVDA, PLTR lead gains in tech sector with strong quarterly earnings.', 
          tags: ['STOCKS', 'AI'],
          url: 'https://techcrunch.com'
        },
        {
          id: '3',
          source: 'Financial Times',
          title: 'Market Commentary: Fed Policy Impact',
          summary: 'Analysis of recent monetary policy decisions and market implications.',
          tags: ['MARKET'],
          url: 'https://www.ft.com/markets'
        },
        {
          id: '4',
          source: 'MarketWatch',
          title: 'Investment Opportunities in 2026',
          summary: 'Analysts identify key sectors poised for growth in the coming year.',
          tags: ['ANALYSIS'],
          url: 'https://www.marketwatch.com'
        }
      ]);
    }
    setLoading(false);
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return 'Just Now';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  useEffect(() => {
    loadNews();
    // Refresh every 5 minutes
    const interval = setInterval(loadNews, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
            <h2 className="font-black text-lg tracking-tight text-white">Market News</h2>
            {isLive && (
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-black rounded-full animate-pulse">LIVE</span>
            )}
          </div>
          <button 
            onClick={loadNews}
            disabled={loading}
            className={`p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all ${loading ? 'animate-spin opacity-50' : ''}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </button>
        </div>
        
        <div className="flex bg-[#0b0e14] p-1.5 rounded-xl gap-1 border border-white/5">
          {(['Holdings', 'Watchlist', 'All'] as const).map(filter => (
            <button 
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-200 ${
                activeFilter === filter 
                  ? 'bg-[#00e5ff] text-[#0b0e14] shadow-lg shadow-[#00e5ff]/30' 
                  : 'text-slate-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {loading ? (
          // Skeleton Loader
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-[#151921] border border-white/5 rounded-2xl p-4 animate-pulse">
              <div className="flex justify-between mb-3">
                <div className="h-2 w-20 bg-slate-800 rounded"></div>
                <div className="h-2 w-10 bg-slate-800 rounded"></div>
              </div>
              <div className="h-3 w-full bg-slate-800 rounded mb-2"></div>
              <div className="h-3 w-2/3 bg-slate-800 rounded mb-4"></div>
            </div>
          ))
        ) : filteredArticles.length === 0 ? (
          // Empty state
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
              </svg>
            </div>
            <p className="text-slate-400 text-sm font-bold mb-1">
              {activeFilter === 'Holdings' ? 'No news for your holdings' : activeFilter === 'Watchlist' ? 'No watchlist items' : 'No news available'}
            </p>
            <p className="text-slate-600 text-xs">
              {activeFilter === 'Holdings' ? 'Add assets to see relevant news' : activeFilter === 'Watchlist' ? 'Add items to your watchlist' : 'Check back later'}
            </p>
          </div>
        ) : (
          <>
            {filteredArticles.map((item) => {
              const handleArticleClick = (e: React.MouseEvent) => {
                if (item.url && item.url !== '#') {
                  // Open URL in new tab
                  window.open(item.url, '_blank', 'noopener,noreferrer');
                  e.preventDefault();
                }
              };

              return (
                <div
                  key={item.id}
                  onClick={handleArticleClick}
                  className={`bg-[#151921] border border-white/5 rounded-2xl p-4 transition-all group relative overflow-hidden ${
                    item.url && item.url !== '#'
                      ? 'hover:border-[#00e5ff]/40 hover:bg-blue-500/5 cursor-pointer'
                      : 'opacity-75'
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && item.url && item.url !== '#') {
                      window.open(item.url, '_blank', 'noopener,noreferrer');
                    }
                  }}
                  aria-label={`Open article: ${item.title}`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black uppercase text-blue-400/80">{item.source}</span>
                    <span className="text-[10px] font-bold text-slate-500">{formatTime(item.publishedAt)}</span>
                  </div>
                  <h3 className="text-sm font-bold leading-snug mb-2 group-hover:text-[#00e5ff] transition-colors text-slate-200">
                    {item.title}
                    {item.url && item.url !== '#' && (
                      <span className="ml-2 text-[10px] text-slate-500 group-hover:text-[#00e5ff]">↗</span>
                    )}
                  </h3>
                  {item.summary && <p className="text-xs text-slate-400 mb-3 line-clamp-2 leading-relaxed">{item.summary}</p>}
                  <div className="flex flex-wrap gap-2 items-center">
                    {item.tags.filter(t => t.length > 0).map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-[4px] text-[8px] font-black border border-blue-500/20">{tag}</span>
                    ))}
                  </div>
                  {!item.url || item.url === '#' ? (
                    <div className="mt-3 text-[10px] text-slate-500 italic">No source available</div>
                  ) : null}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};

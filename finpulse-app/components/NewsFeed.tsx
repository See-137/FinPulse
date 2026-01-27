
import React, { useState } from 'react';
import { summarizeNews } from '../services/aiService';
import { useNews } from '../hooks/useNews';
import { formatNewsTime } from '../types/news';
import { RefreshCw, ExternalLink } from 'lucide-react';

// Skeleton loader for news items
const NewsItemSkeleton: React.FC = () => (
  <div className="bg-white p-4 rounded-xl border border-slate-200 animate-pulse">
    <div className="flex justify-between items-start mb-2">
      <div className="h-2 w-24 bg-slate-200 rounded"></div>
      <div className="h-3 w-3 bg-slate-200 rounded"></div>
    </div>
    <div className="h-4 w-full bg-slate-200 rounded mb-2"></div>
    <div className="h-4 w-3/4 bg-slate-200 rounded mb-3"></div>
    <div className="h-3 w-full bg-slate-100 rounded mb-1"></div>
    <div className="h-3 w-2/3 bg-slate-100 rounded"></div>
  </div>
);

export const NewsFeed: React.FC = () => {
  const { articles, loading: newsLoading, source, refresh } = useNews({ maxArticles: 6 });
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [summarizing, setSummarizing] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleSummarize = async (id: string, headline: string) => {
    if (summaries[id]) return;
    setSummarizing(id);
    const summary = await summarizeNews(headline);
    if (summary) {
      setSummaries(prev => ({ ...prev, [id]: summary }));
    }
    setSummarizing(null);
  };

  const isLive = source === 'live';
  const showLoading = newsLoading && articles.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
          Market Intelligence
          {isLive && <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full animate-pulse">LIVE</span>}
        </h2>
        <button onClick={handleRefresh} disabled={refreshing || newsLoading} className="p-1 hover:bg-slate-100 rounded transition-colors">
          <RefreshCw className={`w-4 h-4 text-slate-400 ${refreshing || newsLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {showLoading && (
        // Skeleton loaders while loading
        <>
          <NewsItemSkeleton />
          <NewsItemSkeleton />
          <NewsItemSkeleton />
        </>
      )}

      {!showLoading && articles.length === 0 && (
        // Empty state
        <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
          <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path>
          </svg>
          <p className="text-slate-500 font-medium">No news available</p>
          <p className="text-slate-400 text-sm mt-1">Check back later for market updates</p>
        </div>
      )}

      {!showLoading && articles.length > 0 && (
        // News articles
        articles.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors group">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {item.source} • {formatNewsTime(item.publishedAt)}
              </span>
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-500">
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            <h3 className="font-semibold text-slate-800 leading-tight mb-2 group-hover:text-blue-700 transition-colors">{item.title}</h3>
            {item.description && (
              <p className="text-sm text-slate-500 mb-3 line-clamp-2">{item.description}</p>
            )}

            {summaries[item.id] ? (
              <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-sm text-slate-600 animate-in fade-in slide-in-from-top-1 duration-300">
                <span className="text-[10px] font-bold text-blue-600 uppercase block mb-1">AI Insight</span>
                {summaries[item.id]}
              </div>
            ) : (
              <button
                onClick={() => handleSummarize(item.id, item.title)}
                disabled={summarizing === item.id}
                className="text-xs font-semibold text-blue-600 flex items-center gap-1 hover:underline disabled:opacity-50"
              >
                {summarizing === item.id ? (
                  <span className="flex items-center gap-1">
                    <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Analyzing...
                  </span>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    AI Insight Summary
                  </>
                )}
              </button>
            )}
          </div>
        ))
      )}
    </div>
  );
};



import React, { useState, useEffect } from 'react';
import { summarizeNews } from '../services/aiService';
import { fetchNews } from '../hooks/useMarketData';
import { RefreshCw, ExternalLink } from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  description?: string;
  source: string;
  url?: string;
  image?: string;
  publishedAt: string;
  category?: string;
}

const INITIAL_NEWS: NewsItem[] = [
  { id: '1', title: "Fed Signals Potential Rate Cut in Q3 as Inflation Cools", source: "FP News", publishedAt: "2h ago" },
  { id: '2', title: "Tech Sector Rally Continues as Semiconductor Demand Surges", source: "Markets Daily", publishedAt: "4h ago" },
  { id: '3', title: "Global Supply Chain Disruptions Impacting Retail Forecasts", source: "Business Wire", publishedAt: "6h ago" },
];

export const NewsFeed: React.FC = () => {
  const [news, setNews] = useState<NewsItem[]>(INITIAL_NEWS);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadNews = async () => {
    setRefreshing(true);
    try {
      const response = await fetchNews();
      if (response.success && response.data?.length > 0) {
        const transformed = response.data.slice(0, 6).map((item: any, idx: number) => ({
          id: item.id || `news-${idx}`,
          title: item.title,
          description: item.description,
          source: item.source,
          url: item.url,
          image: item.image,
          publishedAt: new Date(item.publishedAt).toLocaleString(),
          category: item.category,
        }));
        setNews(transformed);
        setIsLive(true);
      }
    } catch (err) {
      // Using fallback news
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  const handleSummarize = async (id: string, headline: string) => {
    if (summaries[id]) return;
    setLoading(id);
    const summary = await summarizeNews(headline);
    if (summary) {
      setSummaries(prev => ({ ...prev, [id]: summary }));
    }
    setLoading(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"></path></svg>
          Market Intelligence
          {isLive && <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full animate-pulse">LIVE</span>}
        </h2>
        <button onClick={loadNews} disabled={refreshing} className="p-1 hover:bg-slate-100 rounded transition-colors">
          <RefreshCw className={`w-4 h-4 text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
      {news.map((item) => (
        <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors group">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.source} • {item.publishedAt}</span>
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
              disabled={loading === item.id}
              className="text-xs font-semibold text-blue-600 flex items-center gap-1 hover:underline disabled:opacity-50"
            >
              {loading === item.id ? (
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
      ))}
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { fetchRealtimeNews } from '../services/geminiService';
import { PlanType } from '../types';

interface NewsArticle {
  source: string;
  title: string;
  summary: string;
  tags: string[];
  url?: string;
}

interface NewsSidebarProps {
  userPlan: PlanType;
}

export const NewsSidebar: React.FC<NewsSidebarProps> = ({ userPlan }) => {
  const [activeFilter, setActiveFilter] = useState('All');
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<{ title: string; uri: string }[]>([]);

  const loadNews = async () => {
    setLoading(true);
    const result = await fetchRealtimeNews();
    
    if (result) {
      const extractedSources = result.chunks
        .filter(chunk => chunk.web)
        .map(chunk => ({
          title: chunk.web?.title || 'External Source',
          uri: chunk.web?.uri || '#'
        }));
      setSources(extractedSources);

      const lines = result.text.split('\n').filter(l => l.trim().length > 10);
      const parsedArticles: NewsArticle[] = lines.slice(0, 5).map((line, idx) => {
        const cleaned = line.replace(/^\d+\.\s*/, '').replace(/^[-*]\s*/, '');
        const parts = cleaned.split(/[|:]/);
        
        return {
          source: parts[0]?.trim() || 'Market News',
          title: parts[1]?.trim() || cleaned.substring(0, 60) + '...',
          summary: parts[2]?.trim() || '',
          tags: parts[3]?.split(',').map(t => t.trim().toUpperCase()) || ['MARKET'],
          url: extractedSources[idx]?.uri
        };
      });

      setArticles(parsedArticles);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNews();
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
        
        <div className="flex bg-[#0b0e14] p-1 rounded-xl gap-1">
          {['Holdings', 'Watchlist', 'All'].map(filter => (
            <button 
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${activeFilter === filter ? 'bg-[#151921] text-[#00e5ff] shadow-lg shadow-black/20' : 'text-slate-500 hover:text-slate-300'}`}
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
        ) : (
          <>
            {articles.map((item, idx) => (
              <a 
                key={idx} 
                href={item.url || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block bg-[#151921] border border-white/5 rounded-2xl p-4 hover:border-[#00e5ff]/40 hover:bg-blue-500/5 transition-all group relative overflow-hidden"
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black uppercase text-blue-400/80">{item.source}</span>
                  <span className="text-[10px] font-bold text-slate-500">Just Now</span>
                </div>
                <h3 className="text-sm font-bold leading-snug mb-2 group-hover:text-[#00e5ff] transition-colors text-slate-200">{item.title}</h3>
                {item.summary && <p className="text-xs text-slate-400 mb-3 line-clamp-2 leading-relaxed">{item.summary}</p>}
                <div className="flex flex-wrap gap-2 items-center">
                  {item.tags.filter(t => t.length > 0).map(tag => (
                    <span key={tag} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-[4px] text-[8px] font-black border border-blue-500/20">{tag}</span>
                  ))}
                </div>
              </a>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

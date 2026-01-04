
import React from 'react';
import { MessageSquare, ThumbsUp, TrendingUp, Search, Plus, User, Calendar } from 'lucide-react';

const POSTS = [
  { user: 'AlphaCapital', date: '2h ago', title: 'NVDA Support Levels', category: 'stocks', content: 'Monitoring the 140.50 level closely. Volume profile suggests significant institutional interest at this range. Thoughts on the Q3 guidance?', tags: ['NVDA', 'AI'], likes: 124, comments: 42 },
  { user: 'CryptoWhale_01', date: '5h ago', title: 'Bitcoin Mirror Strategy', category: 'crypto', content: 'Mirroring an additional 2.5 BTC today. The volatility is providing a perfect accumulation zone before the monthly close.', tags: ['BTC', 'CRYPTO'], likes: 89, comments: 12 },
  { user: 'GoldStandard', date: '1d ago', title: 'Hard Asset Rotation', category: 'commodities', content: 'Rotating 15% of equity mirror into physical gold certificates. The hedge against currency devaluation remains paramount.', tags: ['GOLD', 'HEDGE'], likes: 215, comments: 56 },
];

export const Community: React.FC = () => {
  return (
    <div className="space-y-10 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span className="text-[11px] font-black uppercase tracking-[0.25em] text-emerald-400">Global Pulse Feed</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-white">Global Insight</h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Anonymized strategies from the world's most disciplined mirrors.</p>
        </div>
        
        <button className="flex items-center gap-3 px-8 py-4 bg-white text-[#0b0e14] font-black uppercase tracking-widest text-[11px] rounded-[24px] shadow-2xl hover:bg-[#00e5ff] transition-all">
          <Plus className="w-5 h-5" />
          Broadcast Insight
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search/Filter Bar */}
          <div className="card-surface p-4 rounded-[32px] flex items-center gap-4 bg-white/[0.01]">
            <div className="flex-1 relative group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-[#00e5ff] transition-colors" />
              <input 
                type="text" 
                placeholder="Search institutional discourse..." 
                className="w-full bg-[#0b0e14] border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold outline-none focus:ring-1 focus:ring-[#00e5ff]/50 transition-all"
              />
            </div>
            <select className="hidden sm:block bg-[#0b0e14] border border-white/5 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer">
              <option>Filter by Class</option>
              <option>Equities</option>
              <option>Digital Assets</option>
              <option>Commodities</option>
            </select>
          </div>

          {POSTS.map((post, idx) => (
            <div key={idx} className="card-surface p-8 rounded-[40px] border-l-4 border-l-transparent hover:border-l-[#00e5ff] transition-all group bg-gradient-to-br from-[#151921] to-[#0b0e14]">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 border border-white/5">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white group-hover:text-[#00e5ff] transition-colors">{post.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{post.user}</span>
                      <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {post.date}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-white/5 text-slate-400 text-[9px] font-black rounded-lg border border-white/5 uppercase tracking-widest">
                  {post.category}
                </span>
              </div>
              
              <p className="text-slate-400 text-sm mb-6 leading-relaxed font-medium">
                {post.content}
              </p>
              
              <div className="flex flex-wrap gap-2 mb-8">
                {post.tags.map(t => (
                  <span key={t} className="px-3 py-1 bg-cyan-500/5 text-cyan-400 text-[9px] font-black rounded-full border border-cyan-500/10 uppercase">
                    #{t}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-8 pt-6 border-t border-white/5">
                <button className="flex items-center gap-2 text-slate-500 hover:text-emerald-400 transition-colors group/action">
                  <ThumbsUp className="w-4 h-4 group-hover/action:scale-110 transition-transform" />
                  <span className="text-xs font-black">{post.likes}</span>
                </button>
                <button className="flex items-center gap-2 text-slate-500 hover:text-[#00e5ff] transition-colors group/action">
                  <MessageSquare className="w-4 h-4 group-hover/action:scale-110 transition-transform" />
                  <span className="text-xs font-black">{post.comments}</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Intelligence */}
        <div className="space-y-6">
          <div className="card-surface p-8 rounded-[40px] sticky top-24 bg-gradient-to-b from-[#151921] to-transparent">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] mb-8">Global Leaderboard</h3>
            
            <div className="space-y-6">
              {[
                { name: 'Institutional_A', gain: '+45.2%', class: 'Crypto' },
                { name: 'EquityMirror_99', gain: '+12.8%', class: 'Stocks' },
                { name: 'GlobalSafe', gain: '+4.5%', class: 'Commodities' }
              ].map((leader, i) => (
                <div key={i} className="flex items-center justify-between group cursor-pointer">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-600 w-4">{i+1}</span>
                    <div>
                      <p className="text-xs font-black text-white group-hover:text-[#00e5ff] transition-colors">{leader.name}</p>
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{leader.class}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-black text-emerald-400">{leader.gain}</span>
                </div>
              ))}
            </div>

            <div className="mt-12 pt-8 border-t border-white/5 text-center">
              <p className="text-[10px] text-slate-600 font-medium leading-relaxed mb-6">
                Your mirror is currently private. Public mirroring allows others to observe your performance without revealing absolute values.
              </p>
              <button className="w-full py-4 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all">
                Enable Public Broadcast
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


import React, { useState, useRef, useEffect } from 'react';
import { getMarketInsightStream } from '../services/geminiService';
import { MessageSquareText, Send, Sparkles, X, ChevronRight, Mic, Lock, Crown } from 'lucide-react';
import { User } from '../types';

interface AIAssistantProps {
  user: User;
  onUpdateUsage: (credits: number) => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ user, onUpdateUsage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || isTyping) return;

    if (user.credits.ai >= user.credits.maxAi) {
      setMessages(prev => [...prev, { role: 'assistant', text: "Usage Limit Reached: You have consumed your daily AI mirror credits. Upgrade to PRO for unlimited institutional analysis." }]);
      setQuery('');
      return;
    }

    const userMsg = query;
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsTyping(true);

    setMessages(prev => [...prev, { role: 'assistant', text: "" }]);

    await getMarketInsightStream(userMsg, (text) => {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', text };
        return next;
      });
    });

    onUpdateUsage(user.credits.ai + 1);
    setIsTyping(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-[#00e5ff] text-[#0b0e14] rounded-full flex items-center justify-center shadow-xl z-[60] group border-4 border-white/10"
      >
        {isOpen ? <X className="w-7 h-7" /> : <Sparkles className="w-7 h-7" />}
      </button>

      <div className={`fixed bottom-24 right-4 sm:right-10 w-[calc(100vw-2rem)] sm:w-[420px] max-h-[calc(100dvh-8rem)] h-[600px] card-surface rounded-[40px] flex flex-col shadow-2xl z-50 transition-all duration-500 origin-bottom-right ${isOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-400">
               <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-sm text-white">Institutional Copilot</h2>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{user.plan} Active • {user.credits.maxAi - user.credits.ai} Credits Left</p>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <Sparkles className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 text-sm font-bold">How can I assist your Mirror Node today?</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] p-4 rounded-2xl text-xs font-medium ${m.role === 'user' ? 'bg-[#00e5ff] text-[#0b0e14] font-black' : 'bg-slate-800 text-slate-200 border border-white/5'}`}>
                {m.text}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="relative">
            <input 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Query the markets..."
              className="w-full bg-[#0b0e14] border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold outline-none focus:ring-2 focus:ring-[#00e5ff]/50"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-[#00e5ff] text-[#0b0e14] rounded-xl">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

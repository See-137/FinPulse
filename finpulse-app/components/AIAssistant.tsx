
import React, { useState, useRef, useEffect } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { getMarketInsightStream } from '../services/geminiService';
import { MessageSquareText, Send, Sparkles, X, ChevronRight, Mic, Lock, Crown } from 'lucide-react';
import { User } from '../types';

interface AIAssistantProps {
  user: User;
  onUpdateUsage: (credits: number) => void;
}

// Simple markdown renderer for AI responses
const renderMarkdown = (text: string): React.ReactNode => {
  if (!text) return null;
  
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  
  const flushList = () => {
    if (listItems.length > 0) {
      const ListTag = listType === 'ol' ? 'ol' : 'ul';
      elements.push(
        <ListTag key={elements.length} className={`my-2 ml-4 space-y-1 ${listType === 'ol' ? 'list-decimal' : 'list-disc'}`}>
          {listItems.map((item, i) => (
            <li key={i} className="text-slate-300">{parseInline(item)}</li>
          ))}
        </ListTag>
      );
      listItems = [];
      listType = null;
    }
  };
  
  const parseInline = (line: string): React.ReactNode => {
    // Parse bold, italic, and inline code
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let key = 0;
    
    while (remaining.length > 0) {
      // Bold with **
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      // Italic with *
      const italicMatch = remaining.match(/(?<!\*)\*([^*]+)\*(?!\*)/);
      // Inline code with `
      const codeMatch = remaining.match(/`([^`]+)`/);
      
      const matches = [
        boldMatch ? { match: boldMatch, type: 'bold', index: boldMatch.index! } : null,
        italicMatch ? { match: italicMatch, type: 'italic', index: italicMatch.index! } : null,
        codeMatch ? { match: codeMatch, type: 'code', index: codeMatch.index! } : null,
      ].filter(Boolean).sort((a, b) => a!.index - b!.index);
      
      if (matches.length === 0) {
        parts.push(remaining);
        break;
      }
      
      const first = matches[0]!;
      if (first.index > 0) {
        parts.push(remaining.slice(0, first.index));
      }
      
      if (first.type === 'bold') {
        parts.push(<strong key={key++} className="font-bold text-white">{first.match[1]}</strong>);
      } else if (first.type === 'italic') {
        parts.push(<em key={key++} className="italic text-slate-300">{first.match[1]}</em>);
      } else if (first.type === 'code') {
        parts.push(<code key={key++} className="bg-slate-700/50 px-1.5 py-0.5 rounded text-cyan-400 font-mono text-[10px]">{first.match[1]}</code>);
      }
      
      remaining = remaining.slice(first.index + first.match[0].length);
    }
    
    return parts.length === 1 ? parts[0] : <>{parts}</>;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    
    // Empty line
    if (!trimmed) {
      flushList();
      elements.push(<div key={elements.length} className="h-2" />);
      return;
    }
    
    // Headers
    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={elements.length} className="text-sm font-bold text-cyan-400 mt-4 mb-2 flex items-center gap-2">
          <span className="w-1 h-4 bg-cyan-400 rounded-full"></span>
          {parseInline(trimmed.slice(4))}
        </h3>
      );
      return;
    }
    
    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={elements.length} className="text-base font-bold text-white mt-4 mb-2 border-b border-white/10 pb-2">
          {parseInline(trimmed.slice(3))}
        </h2>
      );
      return;
    }
    
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={elements.length} className="text-lg font-black text-white mt-3 mb-2">
          {parseInline(trimmed.slice(2))}
        </h1>
      );
      return;
    }
    
    // Bullet list items
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      if (listType !== 'ul') {
        flushList();
        listType = 'ul';
      }
      listItems.push(trimmed.slice(2));
      return;
    }
    
    // Numbered list items
    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      if (listType !== 'ol') {
        flushList();
        listType = 'ol';
      }
      listItems.push(numMatch[2]);
      return;
    }
    
    // Horizontal rule
    if (trimmed === '---' || trimmed === '***') {
      flushList();
      elements.push(<hr key={elements.length} className="border-white/10 my-3" />);
      return;
    }
    
    // Regular paragraph
    flushList();
    elements.push(
      <p key={elements.length} className="text-slate-300 leading-relaxed my-1.5">
        {parseInline(trimmed)}
      </p>
    );
  });
  
  flushList();
  return <div className="space-y-0.5">{elements}</div>;
};

export const AIAssistant: React.FC<AIAssistantProps> = ({ user, onUpdateUsage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim() || isTyping) return;

    if (user.credits.ai >= user.credits.maxAi) {
      const upgradeMsg = user.plan === 'FREE' 
        ? "🔒 **Daily AI Limit Reached** (5/5 queries)\n\nUpgrade to **ProPulse** ($9.90/mo) for 10 queries/day, or **SuperPulse** ($29.90/mo) for 50 queries/day with premium analytics."
        : user.plan === 'PROPULSE'
        ? "🔒 **Daily AI Limit Reached** (10/10 queries)\n\nUpgrade to **SuperPulse** ($29.90/mo) for 50 AI queries/day plus premium analytics and priority support."
        : "🔒 **Daily AI Limit Reached**\n\nYour daily queries will reset at midnight UTC.";
      setMessages(prev => [...prev, { role: 'assistant', text: upgradeMsg }]);
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
      {/* Position button on bottom-left to avoid NewsSidebar overlap */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 left-6 w-16 h-16 bg-[#00e5ff] text-[#0b0e14] rounded-full flex items-center justify-center shadow-xl z-[60] group border-4 border-white/10 hover:scale-110 transition-transform"
      >
        {isOpen ? <X className="w-7 h-7" /> : <Sparkles className="w-7 h-7" />}
      </button>

      {/* Position chat panel on bottom-left to avoid NewsSidebar */}
      <div className={`fixed bottom-24 left-4 sm:left-10 w-[calc(100vw-2rem)] sm:w-[420px] max-h-[calc(100dvh-8rem)] h-[600px] card-surface rounded-[40px] flex flex-col shadow-2xl z-50 transition-all duration-500 origin-bottom-left ${isOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-cyan-500/10 rounded-2xl flex items-center justify-center text-cyan-400">
               <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-sm text-white">Market Intelligence</h2>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Market observations based on available data. No predictions.</p>
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/20">
                <Sparkles className="w-8 h-8 text-cyan-400" />
              </div>
              <p className="text-slate-400 text-sm font-bold mb-2">How can I assist your Pulse Node today?</p>
              <p className="text-slate-500 text-xs">Ask about markets, crypto, stocks, or economic trends</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center mr-3 mt-1 flex-shrink-0 border border-cyan-500/20">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                </div>
              )}
              <div className={`max-w-[85%] ${m.role === 'user' 
                ? 'bg-gradient-to-r from-cyan-500 to-cyan-400 text-[#0b0e14] p-4 rounded-2xl rounded-br-md font-bold text-xs shadow-lg shadow-cyan-500/20' 
                : 'bg-slate-800/80 backdrop-blur-sm text-slate-200 p-5 rounded-2xl rounded-bl-md border border-white/5 shadow-xl'}`}>
                {m.role === 'assistant' ? <MarkdownRenderer text={m.text} /> : m.text}
              </div>
            </div>
          ))}
          {isTyping && messages[messages.length - 1]?.text === '' && (
            <div className="flex justify-start">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 border border-cyan-500/20">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              </div>
              <div className="bg-slate-800/80 backdrop-blur-sm p-4 rounded-2xl rounded-bl-md border border-white/5">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
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

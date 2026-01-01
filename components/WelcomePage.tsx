
import React, { useEffect, useState } from 'react';
import { getMarketInsightStream } from '../services/geminiService';

interface WelcomePageProps {
  userName: string;
  onContinue: () => void;
}

export const WelcomePage: React.FC<WelcomePageProps> = ({ userName, onContinue }) => {
  const [pulse, setPulse] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const fetchPulse = async () => {
      // 1. Safety Timeout: Force ready state after 8 seconds no matter what
      const safetyTimer = setTimeout(() => {
        if (isMounted && !isReady) {
          setIsReady(true);
        }
      }, 8000);

      try {
        await getMarketInsightStream(
          "Summarize the current global financial state in 3 punchy sentences for a high-net-worth investor starting their day.", 
          (text) => {
            if (isMounted) {
              setPulse(text);
              // 2. Optimistic Readiness: If we have enough text, let the user in immediately
              // This prevents waiting for the stream "end" event which might hang.
              if (text.length > 50) {
                setIsReady(true);
              }
            }
          }
        );
      } catch (error) {
        console.error("Pulse stream failed:", error);
      } finally {
        clearTimeout(safetyTimer);
        if (isMounted) setIsReady(true);
      }
    };

    fetchPulse();
    
    return () => { isMounted = false; };
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0e14] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700">
      <div className="w-24 h-24 bg-blue-500/10 rounded-3xl flex items-center justify-center text-blue-400 mb-12 animate-bounce">
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0l-4-4a4 4 0 115.656-5.656l4 4a4 4 0 010 5.656z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14v4m-3-2l3 3 3-3" />
        </svg>
      </div>

      <h1 className="text-4xl md:text-5xl font-black mb-4">Welcome Back, <span className="text-[#00e5ff]">{userName}</span></h1>
      <p className="text-slate-500 font-medium mb-12">Synchronizing your precision intelligence dashboard...</p>

      <div className="max-w-xl w-full card-surface p-8 rounded-[32px] text-left relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 transition-all group-hover:w-2"></div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">AI Market Pulse</span>
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
        </div>
        <div className="min-h-[80px]">
          {pulse ? (
            <p className="text-slate-200 text-lg leading-relaxed font-medium animate-in slide-in-from-bottom-2 whitespace-pre-line">
              {pulse}
            </p>
          ) : (
            <div className="space-y-3">
              <div className="h-4 bg-slate-800 rounded-full w-full animate-pulse"></div>
              <div className="h-4 bg-slate-800 rounded-full w-4/5 animate-pulse"></div>
              <div className="h-4 bg-slate-800 rounded-full w-3/4 animate-pulse"></div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12">
        <button 
          onClick={onContinue}
          // Enable button if isReady OR if we have data shown (pulse exists)
          disabled={!isReady && !pulse}
          className={`px-12 py-4 bg-white text-[#0b0e14] font-black uppercase tracking-widest rounded-xl transition-all ${isReady || pulse ? 'hover:scale-105 opacity-100 cursor-pointer' : 'opacity-20 cursor-wait'}`}
        >
          {isReady || pulse ? 'Enter Dashboard' : 'Processing...'}
        </button>
      </div>
    </div>
  );
};

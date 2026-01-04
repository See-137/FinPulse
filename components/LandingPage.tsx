
import React, { useState, useEffect } from 'react';
import { Logo } from '../constants';
import { Shield, ArrowRight, Lock, TrendingUp, User as UserIcon, Key, Zap, Globe, Cpu, CheckCircle } from 'lucide-react';
import { DashboardPreview } from './DashboardPreview';

interface LandingPageProps {
  onLogin: (email: string, name: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requiresKey, setRequiresKey] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      // Use type assertion to access aistudio safely if it's not perfectly typed in the environment
      const aiStudio = (window as any).aistudio;
      if (aiStudio) {
        const hasKey = await aiStudio.hasSelectedApiKey();
        setRequiresKey(!hasKey);
      }
    };
    checkKey();
  }, []);

  const handleKeySelection = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio) {
      await aiStudio.openSelectKey();
      // Assume success as per guidelines to avoid race conditions
      setRequiresKey(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requiresKey) {
      handleKeySelection();
      return;
    }
    
    setIsLoading(true);
    setTimeout(() => {
      const displayName = isSignUp ? (name || 'New User') : (email.split('@')[0] || 'Investor');
      onLogin(email, displayName);
    }, 1500);
  };

  return (
    <div className="h-screen h-[100dvh] bg-[#0b0e14] flex flex-col lg:flex-row overflow-hidden selection:bg-[#00e5ff] selection:text-[#0b0e14]">
      {/* Left Side: Value & Auth - Scrollable */}
      <div className="w-full lg:w-[45%] h-full flex flex-col relative z-10 bg-[#0b0e14] overflow-y-auto custom-scrollbar">
        <div className="p-6 sm:p-8 lg:p-16 flex flex-col min-h-min">
            <div className="mb-8 lg:mb-12">
            <Logo />
            </div>

            <div className="flex-1 flex flex-col justify-center max-w-md mx-auto lg:mx-0">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-6 shrink-0 w-fit">
                <Shield className="w-3 h-3" />
                Institutional Wealth Mirror
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-[1] sm:leading-[0.95] mb-6 text-white" style={{ fontSize: 'clamp(2.5rem, 10vw, 4rem)' }}>
                Wealth in <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00e5ff] to-blue-500">
                High Definition.
                </span>
            </h1>

            <p className="text-slate-400 text-base sm:text-lg mb-8 lg:mb-10 leading-relaxed font-medium">
                Mirror your global assets in a precision, read-only environment. No custody risks. No brokerage links. Just the bottom line.
            </p>

            <div className="card-surface p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] border-white/5 shadow-2xl bg-[#151921]/50 backdrop-blur-xl mb-12">
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div>
                    <h3 className="text-white font-black text-lg sm:text-xl mb-1">{isSignUp ? 'Establish Mirror Node' : 'Connect Session'}</h3>
                    <p className="text-slate-500 text-[10px] sm:text-xs">{isSignUp ? 'Start your high-fidelity tracking' : 'Resume institutional monitoring'}</p>
                </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Mirror Identity</label>
                    <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                        required
                        type="text" 
                        placeholder="Jane Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-[#0b0e14] border border-white/10 rounded-xl sm:rounded-2xl pl-12 pr-5 py-3.5 text-sm text-white focus:ring-1 focus:ring-[#00e5ff] outline-none transition-all"
                        />
                    </div>
                    </div>
                )}

                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Secure Email</label>
                    <input 
                    required
                    type="email" 
                    placeholder="investor@institutional.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0b0e14] border border-white/10 rounded-xl sm:rounded-2xl px-5 py-3.5 text-sm text-white focus:ring-1 focus:ring-[#00e5ff] outline-none transition-all"
                    />
                </div>

                {!isSignUp && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input 
                        required
                        type="password" 
                        placeholder="••••••••"
                        className="w-full bg-[#0b0e14] border border-white/10 rounded-xl sm:rounded-2xl pl-12 pr-5 py-3.5 text-sm text-white focus:ring-1 focus:ring-[#00e5ff] outline-none transition-all"
                        />
                    </div>
                    </div>
                )}

                {requiresKey ? (
                    <div className="p-4 sm:p-5 bg-cyan-500/5 border border-cyan-500/20 rounded-xl sm:rounded-2xl space-y-4 animate-in zoom-in-95">
                    <div className="flex items-start gap-3">
                        <Key className="w-4 h-4 sm:w-5 h-5 text-cyan-400 shrink-0 mt-1" />
                        <div>
                        <h4 className="text-[10px] sm:text-xs font-black text-white uppercase tracking-wider">Intelligence Access Required</h4>
                        <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium leading-relaxed mt-1">
                            FinPulse uses high-tier models. Select an API key from a paid GCP project. 
                            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="text-cyan-400 ml-1 hover:underline">Billing Docs</a>
                        </p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={handleKeySelection}
                        aria-label="Authorize AI Engine with API key"
                        className="w-full py-3 bg-[#00e5ff] text-[#0b0e14] font-black text-[10px] uppercase tracking-widest rounded-lg sm:rounded-xl hover:opacity-90 transition-all shadow-lg"
                    >
                        Authorize AI Engine
                    </button>
                    </div>
                ) : (
                    <button 
                    type="submit"
                    disabled={isLoading}
                    aria-label={isSignUp ? 'Establish mirror account' : 'Connect to existing session'}
                    className="w-full py-3.5 sm:py-4 bg-white text-[#0b0e14] font-black uppercase tracking-widest rounded-xl sm:rounded-2xl hover:bg-[#00e5ff] transition-all flex items-center justify-center shadow-lg gap-2 mt-4 text-[11px] sm:text-xs"
                    >
                    {isLoading ? (
                        <div className="w-5 h-5 border-2 border-[#0b0e14]/20 border-t-[#0b0e14] rounded-full animate-spin"></div>
                    ) : (
                        <>
                        {isSignUp ? 'Establish Mirror' : 'Connect Session'}
                        <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                    </button>
                )}
                </form>

                <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/5 text-center">
                <p className="text-slate-500 text-[10px] sm:text-xs font-medium">
                    {isSignUp ? 'Already have a mirror?' : "First time here?"}{' '}
                    <button 
                    onClick={() => setIsSignUp(!isSignUp)}
                    aria-label={isSignUp ? 'Switch to sign in' : 'Switch to sign up'}
                    className="text-[#00e5ff] font-black uppercase tracking-widest hover:underline transition-all"
                    >
                    {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                </p>
                </div>
            </div>

            {/* Value Propositions */}
            <div className="grid grid-cols-2 gap-6 pb-12">
                <div className="space-y-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <Globe className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Multi-Asset</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Unified view of Crypto, Stocks, and Commodities.</p>
                </div>
                <div className="space-y-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <Cpu className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider">AI Copilot</h4>
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Institutional-grade trend analysis on demand.</p>
                </div>
            </div>
            </div>

            <div className="mt-auto pt-8 flex items-center justify-between shrink-0 border-t border-white/5 pb-8 sm:pb-0">
            <p className="text-slate-600 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                © 2025 FinPulse Institutional
            </p>
            <div className="flex gap-4">
                <Lock className="w-3 h-3 text-slate-700" />
                <Shield className="w-3 h-3 text-slate-700" />
            </div>
            </div>
        </div>
      </div>

      {/* Right Side: Product Showcase - Fixed */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center bg-[#0b0e14] overflow-hidden h-full">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,229,255,0.08),transparent_70%)] pointer-events-none"></div>
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        <div className="relative w-full max-w-4xl px-12 perspective-container">
          <div className="tilted-preview transition-transform duration-700 hover:scale-[1.02] hover:rotate-y-[-8deg]">
            <DashboardPreview />
          </div>
          
          {/* Floating Accents */}
          <div className="absolute -top-10 -right-4 card-surface p-4 rounded-2xl border-cyan-500/20 shadow-2xl animate-bounce [animation-duration:4s]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500 leading-none mb-1">Mirror Gain</p>
                <p className="text-sm font-black text-emerald-400 leading-none">+$28,450.00</p>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-10 -left-4 card-surface p-4 rounded-2xl border-blue-500/20 shadow-2xl animate-pulse [animation-duration:6s]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-500 leading-none mb-1">Mirror Health</p>
                <p className="text-sm font-black text-blue-400 leading-none">99.9% Latency</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .perspective-container { perspective: 2000px; }
        .tilted-preview {
          transform: rotateY(-12deg) rotateX(8deg) rotateZ(-1deg) scale(0.85);
          box-shadow: -40px 60px 100px -20px rgba(0,0,0,0.8);
          border-radius: 32px;
          overflow: hidden;
          background: #0b0e14;
        }
        @media (min-width: 1440px) {
          .tilted-preview {
             transform: rotateY(-18deg) rotateX(10deg) rotateZ(-2deg) scale(0.9);
          }
        }
        /* Custom scrollbar matching dark mode for landing page */
        .custom-scrollbar::-webkit-scrollbar-track {
           background: transparent; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
           background: #1f2937; 
           border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
           background: #374151; 
        }
      `}</style>
    </div>
  );
};

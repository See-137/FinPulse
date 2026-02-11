
import React, { useState, useEffect } from 'react';
import { Logo } from '../constants';
import { Shield, ArrowRight, Lock, TrendingUp, User as UserIcon, Key, Zap, Globe, Cpu } from 'lucide-react';
import { DashboardPreview } from './DashboardPreview';
import { auth } from '../services/authService';
import { trackLandingView } from '../services/analytics';

// Type for AI Studio window extension
interface AIStudioWindow {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

interface LandingPageProps {
  onLogin: (email: string, name: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requiresKey, setRequiresKey] = useState(false);

  // Analytics: track landing page view
  useEffect(() => { trackLandingView(); }, []);

  useEffect(() => {
    const checkKey = async () => {
      // Use type assertion to access aistudio safely if it's not perfectly typed in the environment
      const aiStudio = (window as unknown as { aistudio?: AIStudioWindow }).aistudio;
      if (aiStudio) {
        const hasKey = await aiStudio.hasSelectedApiKey();
        setRequiresKey(!hasKey);
      }
    };
    checkKey();
  }, []);

  const handleKeySelection = async () => {
    const aiStudio = (window as unknown as { aistudio?: AIStudioWindow }).aistudio;
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
                Personal Wealth Tracker
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-[1] sm:leading-[0.95] mb-6 text-white" style={{ fontSize: 'clamp(2.5rem, 10vw, 4rem)' }}>
                All Assets. <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00e5ff] to-blue-500">
                One Pulse.
                </span>
            </h1>

            <p className="text-slate-400 text-base sm:text-lg mb-8 lg:mb-10 leading-relaxed font-medium">
                Track your global assets in a precision, read-only environment. No custody risks. No brokerage links. Just the bottom line.
            </p>

            <div className="card-surface p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] border-white/5 shadow-2xl bg-[#151921]/50 backdrop-blur-xl mb-12">
                <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div>
                    <h3 className="text-white font-black text-lg sm:text-xl mb-1">{isSignUp ? 'Start Your Pulse' : 'Check Your Pulse'}</h3>
                    <p className="text-slate-500 text-[10px] sm:text-xs">{isSignUp ? 'Track all your assets in one place - free' : 'Welcome back to your portfolio dashboard'}</p>
                </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Pulse Identity</label>
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
                    placeholder="you@example.com"
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
                    aria-label={isSignUp ? 'Establish pulse account' : 'Connect to existing session'}
                    className="w-full py-3.5 sm:py-4 bg-white text-[#0b0e14] font-black uppercase tracking-widest rounded-xl sm:rounded-2xl hover:bg-[#00e5ff] transition-all flex items-center justify-center shadow-lg gap-2 mt-4 text-[11px] sm:text-xs"
                    >
                    {isLoading ? (
                        <div className="w-5 h-5 border-2 border-[#0b0e14]/20 border-t-[#0b0e14] rounded-full animate-spin"></div>
                    ) : (
                        <>
                        {isSignUp ? 'Start Tracking Free' : 'Check My Pulse'}
                        <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                    </button>
                )}

                {/* Divider */}
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex-1 h-px bg-white/10"></div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">or</span>
                  <div className="flex-1 h-px bg-white/10"></div>
                </div>

                {/* Google Sign-In Button */}
                <button 
                  type="button"
                  onClick={() => auth.initiateGoogleSignIn()}
                  className="w-full py-3.5 sm:py-4 bg-[#0b0e14] border border-white/20 text-white font-semibold rounded-xl sm:rounded-2xl hover:bg-white/5 transition-all flex items-center justify-center gap-3 mt-4"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>
                </form>

                <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/5 text-center">
                <div className="flex items-center gap-2 justify-center">
                  <span className="text-slate-500 text-sm">
                    {isSignUp ? 'Already tracking?' : 'New to FinPulse?'}
                  </span>
                  <button
                    onClick={() => setIsSignUp(!isSignUp)}
                    aria-label={isSignUp ? 'Switch to sign in' : 'Switch to sign up'}
                    className="text-[#00e5ff] text-sm font-bold hover:underline transition-all hover:scale-105"
                  >
                    {isSignUp ? 'Check Your Pulse →' : 'Start Tracking Free →'}
                  </button>
                </div>
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
                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">Professional trend analysis at your fingertips.</p>
                </div>
            </div>
            </div>

            <div className="mt-auto pt-8 flex items-center justify-between shrink-0 border-t border-white/5 pb-8 sm:pb-0">
            <p className="text-slate-600 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">
                © 2025 FinPulse
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
                <p className="text-[10px] font-black uppercase text-slate-500 leading-none mb-1">Pulse Gain</p>
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
                <p className="text-[10px] font-black uppercase text-slate-500 leading-none mb-1">Pulse Health</p>
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

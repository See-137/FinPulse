
import React, { useState, useEffect } from 'react';
import { Logo } from '../constants';
import { Shield, ArrowRight, Lock, User as UserIcon, Key, LayoutGrid, Wallet, Zap, MessageSquareText } from 'lucide-react';

interface LandingPageShowcaseProps {
  onLogin: (name: string, isNewUser: boolean) => void;
}

const SHOWCASE_ITEMS = [
  {
    id: 'dashboard',
    title: 'Global Dashboard',
    desc: 'Real-time net worth tracking and global market pulse.',
    icon: LayoutGrid,
    image: '/assets/landing/dashboard.png'
  },
  {
    id: 'holdings',
    title: 'Holdings Mirror',
    desc: 'Precision asset tracking with multi-currency support.',
    icon: Wallet,
    image: '/assets/landing/holdings.png'
  },
  {
    id: 'intelligence',
    title: 'Market Intelligence',
    desc: 'AI-curated news and sentiment analysis.',
    icon: Zap,
    image: '/assets/landing/intelligence.png'
  },
  {
    id: 'copilot',
    title: 'Institutional Copilot',
    desc: 'Context-aware AI chat for deep market queries.',
    icon: MessageSquareText,
    image: '/assets/landing/copilot.png'
  }
];

export const LandingPageShowcase: React.FC<LandingPageShowcaseProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requiresKey, setRequiresKey] = useState(false);
  
  // Showcase State
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const checkKey = async () => {
      const aiStudio = (window as any).aistudio;
      if (aiStudio) {
        const hasKey = await aiStudio.hasSelectedApiKey();
        setRequiresKey(!hasKey);
      }
    };
    checkKey();
  }, []);

  // Auto-rotate showcase
  useEffect(() => {
    if (isHovering) return;
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % SHOWCASE_ITEMS.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [isHovering]);

  const handleKeySelection = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio) {
      await aiStudio.openSelectKey();
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
      onLogin(displayName, isSignUp);
    }, 1500);
  };

  return (
    <div className="h-screen h-[100dvh] bg-[#0b0e14] flex flex-col lg:flex-row overflow-hidden selection:bg-[#00e5ff] selection:text-[#0b0e14]">
      {/* Left Side: Auth & Selector */}
      <div className="w-full lg:w-[45%] h-full flex flex-col relative z-10 bg-[#0b0e14] overflow-y-auto custom-scrollbar">
        <div className="p-6 sm:p-8 lg:p-16 flex flex-col min-h-min">
            <div className="mb-8 lg:mb-10">
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
                        className="w-full py-3 bg-[#00e5ff] text-[#0b0e14] font-black text-[10px] uppercase tracking-widest rounded-lg sm:rounded-xl hover:opacity-90 transition-all shadow-lg"
                    >
                        Authorize AI Engine
                    </button>
                    </div>
                ) : (
                    <button 
                    type="submit"
                    disabled={isLoading}
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
                
                <div className="mt-4 text-center">
                   <button onClick={() => setIsSignUp(!isSignUp)} className="text-[#00e5ff] text-[10px] font-black uppercase tracking-widest hover:underline">
                      {isSignUp ? 'Already have an account? Sign In' : 'New User? Create Account'}
                   </button>
                </div>
            </div>

            {/* Interactive Feature List */}
            <div className="space-y-3 pb-12" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
              {SHOWCASE_ITEMS.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => setActiveIndex(index)}
                  className={`w-full text-left p-4 rounded-xl border-l-4 transition-all duration-300 group ${
                    activeIndex === index 
                      ? 'bg-white/5 border-[#00e5ff]' 
                      : 'border-transparent hover:bg-white/[0.02] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start gap-4">
                     <div className={`p-2 rounded-lg transition-colors ${activeIndex === index ? 'bg-[#00e5ff]/10 text-[#00e5ff]' : 'bg-slate-800 text-slate-500 group-hover:text-slate-300'}`}>
                        <item.icon className="w-5 h-5" />
                     </div>
                     <div>
                        <h4 className={`text-sm font-black uppercase tracking-wide mb-1 transition-colors ${activeIndex === index ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`}>{item.title}</h4>
                        <p className={`text-[11px] leading-relaxed transition-colors ${activeIndex === index ? 'text-slate-400' : 'text-slate-600'}`}>{item.desc}</p>
                     </div>
                  </div>
                </button>
              ))}
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

      {/* Right Side: Screenshot Showcase */}
      <div className="hidden lg:flex flex-1 relative items-center justify-center bg-[#0b0e14] overflow-hidden h-full">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,229,255,0.08),transparent_70%)] pointer-events-none"></div>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

        <div className="relative w-full max-w-5xl px-12 perspective-container">
           {SHOWCASE_ITEMS.map((item, index) => (
             <div 
                key={item.id}
                className={`absolute inset-0 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-700 ease-out flex items-center justify-center ${
                  activeIndex === index 
                    ? 'opacity-100 scale-100 rotate-0 z-20' 
                    : 'opacity-0 scale-95 rotate-2 z-10 pointer-events-none'
                }`}
             >
                <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-[#00e5ff]/10 border border-white/10 bg-[#151921] max-h-[80vh] aspect-auto">
                   <div className="absolute top-0 left-0 right-0 h-6 bg-[#0b0e14] border-b border-white/5 flex items-center px-4 gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-500/50"></div>
                      <div className="w-2 h-2 rounded-full bg-amber-500/50"></div>
                      <div className="w-2 h-2 rounded-full bg-emerald-500/50"></div>
                   </div>
                   <div className="mt-6">
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        className="w-full h-auto object-cover"
                        onError={(e) => {
                          // Fallback if image not found
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/1200x800/151921/00e5ff?text=FinPulse+Showcase';
                        }}
                      />
                   </div>
                   
                   {/* Overlay Gradient for polish */}
                   <div className="absolute inset-0 bg-gradient-to-tr from-[#00e5ff]/5 to-transparent pointer-events-none"></div>
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

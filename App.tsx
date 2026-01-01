
import React, { useState, useEffect } from 'react';
import { Logo, SaaS_PLANS } from './constants';
import { NewsSidebar } from './components/NewsSidebar';
import { PortfolioView } from './components/PortfolioView';
import { Community } from './components/Community';
import { SettingsModal } from './components/SettingsModal';
import { MarketTicker } from './components/MarketTicker';
import { AIAssistant } from './components/AIAssistant';
import { LandingPage } from './components/LandingPage';
import { LandingPageShowcase } from './components/LandingPageShowcase';
import { WelcomePage } from './components/WelcomePage';
import { AdminPortal } from './components/AdminPortal';
import { Shield, Bell, LayoutGrid, Users, Menu, X, Terminal } from 'lucide-react';
import { User, PlanType, Theme, Currency } from './types';

const USER_STORAGE_KEY = 'finpulse_user_session';

const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'welcome' | 'dashboard'>('landing');
  const [activeTab, setActiveTab] = useState<'portfolio' | 'community'>('portfolio');
  const [user, setUser] = useState<User | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewsSidebarOpen, setIsNewsSidebarOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  
  // Currency State with Persistence
  const [currency, setCurrency] = useState<Currency>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('finpulse_currency') as Currency) || 'USD';
    }
    return 'USD';
  });

  useEffect(() => {
    localStorage.setItem('finpulse_currency', currency);
  }, [currency]);
  
  // Theme Management
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'system';
  });

  // Restore session
  useEffect(() => {
    const savedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setView('dashboard');
      } catch (e) {
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
  }, []);

  // Persist session
  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }
  }, [user]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLogin = (name: string, isNewUser: boolean) => {
    const defaultPlan: PlanType = 'FREE';
    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      email: `${name.toLowerCase().replace(/\s/g, '')}@institutional.com`,
      plan: defaultPlan,
      credits: {
        ai: 0,
        maxAi: SaaS_PLANS[defaultPlan].maxAiQueries,
        assets: 0,
        maxAssets: SaaS_PLANS[defaultPlan].maxAssets
      },
      subscriptionStatus: 'active'
    };
    setUser(newUser);
    setView(isNewUser ? 'welcome' : 'dashboard');
  };
  
  const handlePlanUpgrade = (plan: PlanType) => {
    if (!user) return;
    setUser({
      ...user,
      plan,
      credits: {
        ...user.credits,
        maxAi: SaaS_PLANS[plan].maxAiQueries,
        maxAssets: SaaS_PLANS[plan].maxAssets
      }
    });
  };

  const handleContinue = () => setView('dashboard');

  if (view === 'landing') {
    // Safely access env to prevent runtime crashes if env is undefined
    const showcaseEnabled = (import.meta as any)?.env?.VITE_LANDING_SHOWCASE === 'true';
    
    return showcaseEnabled
      ? <LandingPageShowcase onLogin={handleLogin} /> 
      : <LandingPage onLogin={handleLogin} />;
  }
  
  if (view === 'welcome' && user) return <WelcomePage userName={user.name} onContinue={handleContinue} />;

  // Safety check
  if (view === 'dashboard' && !user) {
    setView('landing');
    return null;
  }

  return (
    <div className="flex h-screen h-[100dvh] w-screen bg-slate-50 dark:bg-[#0b0e14] text-slate-900 dark:text-white overflow-hidden animate-in fade-in duration-500 transition-colors">
      <div className="flex-1 flex flex-col min-w-0 relative h-full">
        <MarketTicker currency={currency} />
        
        <nav className="h-20 flex-shrink-0 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0b0e14]/50 backdrop-blur-md z-20 transition-colors">
          <div className="flex items-center gap-4 sm:gap-8 overflow-hidden">
            <Logo className="h-6 sm:h-8 shrink-0" />
            
            <div className="hidden md:flex items-center bg-slate-100 dark:bg-[#151921] p-1 rounded-2xl border border-slate-200 dark:border-white/5 shrink-0 transition-colors">
               <button onClick={() => setActiveTab('portfolio')} className={`px-4 sm:px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all ${activeTab === 'portfolio' ? 'bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20' : 'text-slate-500'}`}>
                 <LayoutGrid className="w-3.5 h-3.5" /> Mirror
               </button>
               <button onClick={() => setActiveTab('community')} className={`px-4 sm:px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all ${activeTab === 'community' ? 'bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20' : 'text-slate-500'}`}>
                 <Users className="w-3.5 h-3.5" /> Community
               </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
            <div className="hidden sm:flex bg-slate-100 dark:bg-[#151921] rounded-lg p-0.5 border border-slate-200 dark:border-white/5">
               <button onClick={() => setCurrency('USD')} className={`px-2 py-1 text-[9px] font-black rounded-md transition-all ${currency === 'USD' ? 'bg-white dark:bg-white/10 text-black dark:text-white shadow-sm' : 'text-slate-500'}`}>USD</button>
               <button onClick={() => setCurrency('ILS')} className={`px-2 py-1 text-[9px] font-black rounded-md transition-all ${currency === 'ILS' ? 'bg-white dark:bg-white/10 text-black dark:text-white shadow-sm' : 'text-slate-500'}`}>ILS</button>
            </div>

            <button onClick={() => setIsAdminOpen(true)} className="p-2 text-slate-500 hover:text-[#00e5ff] transition-all">
              <Terminal className="w-5 h-5" />
            </button>
            <button className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all ${user?.plan === 'PRO' ? 'border-cyan-500/50 text-cyan-400' : 'border-slate-200 dark:border-white/10 text-slate-500'}`}>
              {user?.plan} Node
            </button>
            <button onClick={() => setIsNewsSidebarOpen(!isNewsSidebarOpen)} className={`p-2 rounded-xl lg:hidden ${isNewsSidebarOpen ? 'text-[#00e5ff] bg-[#00e5ff]/10' : 'text-slate-400'}`}>
              <Menu className="w-5 h-5" />
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-3 group shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-slate-200 dark:border-white/10 flex items-center justify-center font-black text-[#00e5ff] text-xs">
                {user?.name.substring(0, 2).toUpperCase() || 'JD'}
              </div>
            </button>
          </div>
        </nav>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-[1200px] mx-auto w-full">
            {activeTab === 'portfolio' ? (
              <PortfolioView 
                user={user!} 
                onUpdateUser={setUser} 
                currency={currency} 
                onCurrencyChange={setCurrency} 
              />
            ) : (
              <Community />
            )}
          </div>
        </div>
      </div>

      <div className={`fixed inset-y-0 right-0 z-50 lg:relative lg:block transition-transform duration-500 transform ${isNewsSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        <div className="h-full relative w-[85vw] sm:w-[380px] lg:w-[380px]">
           <NewsSidebar userPlan={user?.plan || 'FREE'} />
           <button onClick={() => setIsNewsSidebarOpen(false)} className="absolute top-6 left-[-3rem] lg:hidden p-3 text-white bg-[#00e5ff] rounded-full">
             <X className="w-5 h-5 text-[#0b0e14]" />
           </button>
        </div>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        user={user!}
        onUpgrade={handlePlanUpgrade}
        currentTheme={theme}
        onThemeChange={setTheme}
      />

      <AdminPortal 
        isOpen={isAdminOpen} 
        onClose={() => setIsAdminOpen(false)} 
        user={user!} 
        onUpdateUser={setUser} 
      />

      <AIAssistant user={user!} onUpdateUsage={(credits) => setUser(u => u ? {...u, credits: {...u.credits, ai: credits}} : null)} />
    </div>
  );
};

export default App;

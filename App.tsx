
import React, { useState, useEffect } from 'react';
import { Logo, SaaS_PLANS } from './constants';
import { NewsSidebar } from './components/NewsSidebar';
import { PortfolioView } from './components/PortfolioView';
import { Community } from './components/Community';
import { Watchlist } from './components/Watchlist';
import { SettingsModal } from './components/SettingsModal';
import { MarketTicker } from './components/MarketTicker';
import { AIAssistant } from './components/AIAssistant';
import { LandingPage } from './components/LandingPage';
import { LandingPageShowcase } from './components/LandingPageShowcase';
import { WelcomePage } from './components/WelcomePage';
import { AdminPortal } from './components/AdminPortal';
import { PricingModal } from './components/PricingModal';
import { TermsOfService, PrivacyPolicy, PricingPage } from './components/LegalPages';
import { AccessibilityStatement } from './components/AccessibilityStatement';
import { Footer } from './components/Footer';
import { DebugPanel } from './components/DebugPanel';
// Notification & Onboarding Components
import { ChangelogModal, useChangelog } from './components/ChangelogModal';
import { NotificationBell } from './components/NotificationBell';
import { TopBanner } from './components/TopBanner';
import { OnboardingFlow, useOnboarding } from './components/OnboardingFlow';
import { MilestoneModal } from './components/MilestoneModal';
import { milestoneService } from './services/milestoneService';
import { Milestone } from './types/notifications';
import { Shield, LayoutGrid, Users, Menu, X, Terminal, Star, Globe, Check, Database } from 'lucide-react';
import { User, PlanType, Theme, Currency } from './types';
import { auth, type CognitoUser } from './services/authService';
import { LanguageProvider, useLanguage, type Language } from './i18n';
import { usePortfolioStore } from './store/portfolioStore';
import { api } from './services/apiService';

const USER_STORAGE_KEY = 'finpulse_user_session';

// Inner App component that uses language context
const AppContent: React.FC = () => {
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { setCurrentUser, clearCurrentUser, getHoldings } = usePortfolioStore();
  const [view, setView] = useState<'landing' | 'welcome' | 'dashboard' | 'terms' | 'privacy' | 'pricing' | 'accessibility'>(() => {
    // Check URL hash for legal pages
    const hash = window.location.hash.slice(1);
    if (hash === 'terms') return 'terms';
    if (hash === 'privacy') return 'privacy';
    if (hash === 'pricing') return 'pricing';
    if (hash === 'accessibility') return 'accessibility';
    return 'landing';
  });
  const [activeTab, setActiveTab] = useState<'portfolio' | 'watchlist' | 'community'>('portfolio');
  const [user, setUser] = useState<User | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewsSidebarOpen, setIsNewsSidebarOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(false);
  
  // Notification & Onboarding State
  const { showChangelog, currentChangelog, dismissChangelog } = useChangelog();
  const { showOnboarding, completeOnboarding, skipOnboarding } = useOnboarding();
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null);
  const [isMilestoneOpen, setIsMilestoneOpen] = useState(false);
  
  // Simple in-app navigation handler for notification CTAs
  const handleNavigate = (target: string) => {
    if (!target) return;
    if (target === '#pricing' || target === 'pricing') {
      setIsPricingOpen(true);
      return;
    }
    if (target === '#community' || target === 'community') {
      setActiveTab('community');
      setView('dashboard');
      return;
    }
    if (target === '#dashboard' || target === 'dashboard') {
      setActiveTab('portfolio');
      setView('dashboard');
      return;
    }
    if (target === '#ai' || target === 'ai') {
      setActiveTab('portfolio');
      setView('dashboard');
      return;
    }
    if (target === 'terms' || target === '#terms') {
      window.location.hash = 'terms';
      setView('terms');
      return;
    }
    if (target === 'privacy' || target === '#privacy') {
      window.location.hash = 'privacy';
      setView('privacy');
      return;
    }
    if (target === 'accessibility' || target === '#accessibility') {
      window.location.hash = 'accessibility';
      setView('accessibility');
      return;
    }
  };
  
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

  // Helper to check if JWT is expired
  const isTokenExpired = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000;
      return Date.now() >= expiry;
    } catch {
      return true;
    }
  };

  // Helper to clear all auth data
  const clearAuthData = () => {
    auth.signOut();
    api.setIdToken(null);
    localStorage.removeItem('finpulse_id_token');
    localStorage.removeItem('finpulse_user_session');
    localStorage.removeItem('finpulse_auth_tokens');
    localStorage.removeItem('finpulse_user');
    localStorage.removeItem('finpulse_cognito_user');
  };

  // Restore session from Cognito (proper auth flow)
  useEffect(() => {
    const restoreAuth = async () => {
      const cognitoUser = auth.getCurrentUser();
      if (!cognitoUser) {
        return; // No session to restore
      }
      
      const idToken = localStorage.getItem('finpulse_id_token');
      if (!idToken) {
        // Partial session state - clean it up
        clearAuthData();
        return;
      }
      
      // Check if token is expired before making API call
      if (isTokenExpired(idToken)) {
        clearAuthData();
        return;
      }
      
      api.setIdToken(idToken);
      
      // Create User object from Cognito credentials + backend data
      try {
        const backendUser = await fetchUserProfile(cognitoUser.userId);
        if (backendUser) {
          setUser(backendUser);
          setCurrentUser(backendUser.id);
          setView('dashboard');
        } else {
          // Profile fetch returned null (401/error handled inside)
          clearAuthData();
        }
      } catch (error) {
        // Auth error - clear and stay on landing
        clearAuthData();
      }
    };
    restoreAuth();
  }, [setCurrentUser]);

  // Persist session
  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }
  }, [user]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    let mediaQuery: MediaQueryList | null = null;
    let handleChange: ((e: MediaQueryListEvent) => void) | null = null;

    if (theme === 'system') {
      mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const systemTheme = mediaQuery.matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
      
      // Add listener for system theme changes
      handleChange = (e: MediaQueryListEvent) => {
        root.classList.remove('light', 'dark');
        root.classList.add(e.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', handleChange);
    } else {
      root.classList.add(theme);
    }
    localStorage.setItem('theme', theme);

    // Cleanup listener on unmount or theme change
    return () => {
      if (mediaQuery && handleChange) {
        mediaQuery.removeEventListener('change', handleChange);
      }
    };
  }, [theme]);

  // Step 1: Fetch user profile from backend (DynamoDB via /auth/me)
  const fetchUserProfile = async (userId: string): Promise<User | null> => {
    try {
      const idToken = localStorage.getItem('finpulse_id_token');
      if (!idToken) return null;

      const apiUrl = import.meta.env.VITE_API_URL || 'https://b3fgmin9yj.execute-api.us-east-1.amazonaws.com/prod';
      const response = await fetch(`${apiUrl}/auth/me`, {
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      const backendUser = data.data || data;
      
      // Map backend user to frontend User type
      return {
        id: backendUser.userId,
        email: backendUser.email,
        name: backendUser.name,
        plan: (backendUser.plan || 'FREE') as PlanType,
        credits: {
          ai: backendUser.credits?.ai || 0,
          maxAi: SaaS_PLANS[backendUser.plan || 'FREE'].maxAiQueries,
          assets: backendUser.credits?.assets || 0,
          maxAssets: SaaS_PLANS[backendUser.plan || 'FREE'].maxAssets
        },
        subscriptionStatus: backendUser.subscriptionStatus || 'active'
      };
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      return null;
    }
  };

  // Step 2: User profile created automatically by Lambda's getOrCreateUser
  // No need for separate POST - /auth/me handles creation on first access

  // Step 3-5: Handle login with full Cognito + backend flow
  const handleLogin = async (email: string, name: string) => {
    const cognitoUser = auth.getCurrentUser();
    if (!cognitoUser) {
      console.error('No Cognito user found');
      return;
    }

    // Step 5: Set idToken for all API calls
    const idToken = localStorage.getItem('finpulse_id_token');
    if (idToken) {
      api.setIdToken(idToken);
    }

    // /auth/me automatically creates user on first access (getOrCreateUser)
    // So just fetch it - will be created if doesn't exist
    const userProfile = await fetchUserProfile(cognitoUser.userId);

    if (userProfile) {
      setUser(userProfile);
      setCurrentUser(userProfile.id); // Set persistent userId from Cognito
      setView('dashboard');
    } else {
      console.error('Failed to setup user profile');
    }
  };

  // Milestone checks when usage changes
  useEffect(() => {
    if (!user) return;

    const stats = milestoneService.getUserStats(user, 0);
    const result = milestoneService.checkMilestones(user, stats);
    if (result?.shouldShow) {
      setActiveMilestone(result.milestone);
      setIsMilestoneOpen(true);
    }
  }, [user]);
  
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

  const handleMilestoneClose = () => {
    if (activeMilestone) {
      milestoneService.markCompleted(activeMilestone.id);
    }
    setIsMilestoneOpen(false);
    setActiveMilestone(null);
  };

  const handleMilestoneAction = () => {
    if (activeMilestone) {
      if (activeMilestone.ctaUrl?.includes('pricing')) {
        setIsPricingOpen(true);
      }
      if (activeMilestone.ctaUrl?.includes('community')) {
        setActiveTab('community');
        setView('dashboard');
      }
      milestoneService.markCompleted(activeMilestone.id);
    }
    setIsMilestoneOpen(false);
    setActiveMilestone(null);
  };

  const handleLogout = async () => {
    await auth.signOut(); // Clear Cognito session
    api.setIdToken(null); // Clear API token for all future requests
    setUser(null);
    clearCurrentUser(); // Clear portfolio user scope
    localStorage.removeItem(USER_STORAGE_KEY);
    setView('landing');
  };

  const handleContinue = () => setView('dashboard');

  // Legal pages (accessible via URL hash: #terms, #privacy, #pricing, #accessibility)
  if (view === 'terms') return <TermsOfService onBack={() => { window.location.hash = ''; setView('landing'); }} />;
  if (view === 'privacy') return <PrivacyPolicy onBack={() => { window.location.hash = ''; setView('landing'); }} />;
  if (view === 'pricing') return <PricingPage onBack={() => { window.location.hash = ''; setView('landing'); }} />;
  if (view === 'accessibility') return <AccessibilityStatement onBack={() => { window.location.hash = ''; setView('landing'); }} />;

  if (view === 'landing') {
    // Default to Showcase unless explicitly disabled
    const showcaseDisabled = (import.meta as any)?.env?.VITE_LANDING_SHOWCASE === 'false';
    
    return !showcaseDisabled
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
        <TopBanner userPlan={user?.plan || 'FREE'} onNavigate={handleNavigate} />
        
        <nav className="h-20 flex-shrink-0 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0b0e14]/50 backdrop-blur-md z-20 transition-colors">
          <div className="flex items-center gap-4 sm:gap-8 overflow-hidden">
            <Logo className="h-6 sm:h-8 shrink-0" />
            
            <div className="hidden md:flex items-center bg-slate-100 dark:bg-[#151921] p-1 rounded-2xl border border-slate-200 dark:border-white/5 shrink-0 transition-colors">
               <button onClick={() => setActiveTab('portfolio')} aria-label="View portfolio" className={`px-4 sm:px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all ${activeTab === 'portfolio' ? 'bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20' : 'text-slate-500'}`}>
                 <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" /> {t('nav.mirror')}
               </button>
               <button onClick={() => setActiveTab('watchlist')} aria-label="View watchlist" className={`px-4 sm:px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all ${activeTab === 'watchlist' ? 'bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20' : 'text-slate-500'}`}>
                 <Star className="w-3.5 h-3.5" aria-hidden="true" /> {t('nav.watchlist')}
               </button>
               <button onClick={() => setActiveTab('community')} aria-label="View community" className={`px-4 sm:px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all ${activeTab === 'community' ? 'bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20' : 'text-slate-500'}`}>
                 <Users className="w-3.5 h-3.5" aria-hidden="true" /> {t('nav.community')}
               </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
            {/* Language Toggle */}
            <div className="flex bg-slate-100 dark:bg-[#151921] rounded-xl p-1 border border-slate-200 dark:border-white/10">
               <button 
                 onClick={() => setLanguage('en')} 
                 aria-label="Switch to English"
                 className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
                   language === 'en' 
                     ? 'bg-white dark:bg-white/10 text-[#00e5ff] shadow-sm' 
                     : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                 }`}
               >
                 {language === 'en' && <Check className="w-3 h-3" />}
                 EN
               </button>
               <button 
                 onClick={() => setLanguage('he')} 
                 aria-label="Switch to Hebrew"
                 className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
                   language === 'he' 
                     ? 'bg-white dark:bg-white/10 text-[#00e5ff] shadow-sm' 
                     : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                 }`}
               >
                 {language === 'he' && <Check className="w-3 h-3" />}
                 עב
               </button>
            </div>

            {/* Currency Toggle */}
            <div className="flex bg-slate-100 dark:bg-[#151921] rounded-xl p-1 border border-slate-200 dark:border-white/10">
               <button 
                 onClick={() => setCurrency('USD')} 
                 aria-label="Switch to USD currency"
                 className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
                   currency === 'USD' 
                     ? 'bg-white dark:bg-white/10 text-[#00e5ff] shadow-sm' 
                     : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                 }`}
               >
                 {currency === 'USD' && <Check className="w-3 h-3" />}
                 USD
               </button>
               <button 
                 onClick={() => setCurrency('ILS')} 
                 aria-label="Switch to ILS currency"
                 className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all flex items-center gap-1.5 ${
                   currency === 'ILS' 
                     ? 'bg-white dark:bg-white/10 text-[#00e5ff] shadow-sm' 
                     : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                 }`}
               >
                 {currency === 'ILS' && <Check className="w-3 h-3" />}
                 ILS
               </button>
            </div>

            <NotificationBell userPlan={user?.plan || 'FREE'} onNavigate={handleNavigate} />
            <button onClick={() => setIsDebugOpen(true)} aria-label="Open debug panel" className="p-2 text-slate-500 hover:text-amber-400 transition-all" title="Debug Panel - Asset Recovery">
              <Database className="w-5 h-5" aria-hidden="true" />
            </button>
            <button onClick={() => setIsAdminOpen(true)} aria-label="Open admin portal" className="p-2 text-slate-500 hover:text-[#00e5ff] transition-all">
              <Terminal className="w-5 h-5" aria-hidden="true" />
            </button>
            <button aria-label={`Current plan: ${user?.plan} Node`} className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all ${user?.plan !== 'FREE' ? 'border-cyan-500/50 text-cyan-400' : 'border-slate-200 dark:border-white/10 text-slate-500'}`}>
              {user?.plan} {t('nav.node')}
            </button>
            <button onClick={() => setIsNewsSidebarOpen(!isNewsSidebarOpen)} aria-label={isNewsSidebarOpen ? 'Close news sidebar' : 'Open news sidebar'} className={`p-2 rounded-xl lg:hidden ${isNewsSidebarOpen ? 'text-[#00e5ff] bg-[#00e5ff]/10' : 'text-slate-400'}`}>
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <button onClick={() => setIsSettingsOpen(true)} aria-label="Open settings" className="flex items-center gap-3 group shrink-0">
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
            ) : activeTab === 'watchlist' ? (
              <Watchlist 
                currency={currency}
                onAddToPortfolio={(symbol, name, type) => {
                  // Switch to portfolio tab with pre-filled data
                  setActiveTab('portfolio');
                  // The add modal will be handled by PortfolioView
                }}
              />
            ) : (
              <Community />
            )}
          </div>
          <Footer onNavigate={handleNavigate} />
        </div>
      </div>

      <div className={`fixed inset-y-0 right-0 z-50 lg:relative lg:block transition-transform duration-500 transform ${isNewsSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        <div className="h-full relative w-[85vw] sm:w-[380px] lg:w-[380px]">
           <NewsSidebar userPlan={user?.plan || 'FREE'} user={user} onUpgradeClick={() => setIsPricingOpen(true)} />
           <button onClick={() => setIsNewsSidebarOpen(false)} aria-label="Close news sidebar" className="absolute top-6 left-[-3rem] lg:hidden p-3 text-white bg-[#00e5ff] rounded-full">
             <X className="w-5 h-5 text-[#0b0e14]" aria-hidden="true" />
           </button>
        </div>
      </div>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        user={user!}
        onUpgrade={handlePlanUpgrade}
        onOpenPricing={() => { setIsSettingsOpen(false); setIsPricingOpen(true); }}
        currentTheme={theme}
        onThemeChange={setTheme}
        onLogout={handleLogout}
      />

      <AdminPortal 
        isOpen={isAdminOpen} 
        onClose={() => setIsAdminOpen(false)} 
        user={user!} 
        onUpdateUser={setUser} 
      />

      <DebugPanel
        isOpen={isDebugOpen}
        onClose={() => setIsDebugOpen(false)}
        currentUserId={user?.id || null}
      />

      {user && (
        <PricingModal
          user={user}
          isOpen={isPricingOpen}
          onClose={() => setIsPricingOpen(false)}
          onPlanChange={handlePlanUpgrade}
        />
      )}

      <AIAssistant user={user!} onUpdateUsage={(credits) => setUser(u => u ? {...u, credits: {...u.credits, ai: credits}} : null)} />

      {/* Notification & Onboarding Overlays */}
      {showChangelog && currentChangelog && (
        <ChangelogModal
          isOpen={showChangelog}
          onClose={dismissChangelog}
          changelog={currentChangelog}
        />
      )}

      {user && showOnboarding && (
        <OnboardingFlow
          isOpen={showOnboarding}
          onComplete={completeOnboarding}
          onSkip={skipOnboarding}
          userName={user.name}
          userPlan={user.plan}
          onOpenPricing={() => setIsPricingOpen(true)}
        />
      )}

      {user && activeMilestone && isMilestoneOpen && (
        <MilestoneModal
          isOpen={isMilestoneOpen}
          milestone={activeMilestone}
          onClose={handleMilestoneClose}
          onAction={handleMilestoneAction}
        />
      )}
    </div>
  );
};

// Main App component with LanguageProvider wrapper
const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;

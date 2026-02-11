
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Logo } from './constants';
// Critical components - loaded immediately
import { MarketTicker } from './components/MarketTicker';
import { LandingPage } from './components/LandingPage';
import { Footer } from './components/Footer';
import { NotificationBell } from './components/NotificationBell';
import { TopBanner } from './components/TopBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SyncStatusIndicator } from './components/SyncStatusIndicator';
import { GlobalErrorHandler } from './components/GlobalErrorHandler';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Lazy-loaded components (code splitting)
const NewsSidebar = lazy(() => import('./components/NewsSidebar').then(m => ({ default: m.NewsSidebar })));
const PortfolioView = lazy(() => import('./components/PortfolioView').then(m => ({ default: m.PortfolioView })));
const Community = lazy(() => import('./components/Community').then(m => ({ default: m.Community })));
const Watchlist = lazy(() => import('./components/Watchlist').then(m => ({ default: m.Watchlist })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const AIAssistant = lazy(() => import('./components/AIAssistant').then(m => ({ default: m.AIAssistant })));
const LandingPageShowcase = lazy(() => import('./components/LandingPageShowcase').then(m => ({ default: m.LandingPageShowcase })));
const WelcomePage = lazy(() => import('./components/WelcomePage').then(m => ({ default: m.WelcomePage })));
const AdminPortal = lazy(() => import('./components/AdminPortal').then(m => ({ default: m.AdminPortal })));
const PricingModal = lazy(() => import('./components/PricingModal').then(m => ({ default: m.PricingModal })));
const ChangelogModal = lazy(() => import('./components/ChangelogModal').then(m => ({ default: m.ChangelogModal })));
const OnboardingFlow = lazy(() => import('./components/OnboardingFlow').then(m => ({ default: m.OnboardingFlow })));
const MilestoneModal = lazy(() => import('./components/MilestoneModal').then(m => ({ default: m.MilestoneModal })));

// Legal pages - very rarely accessed
const TermsOfService = lazy(() => import('./components/LegalPages').then(m => ({ default: m.TermsOfService })));
const PrivacyPolicy = lazy(() => import('./components/LegalPages').then(m => ({ default: m.PrivacyPolicy })));
const PricingPage = lazy(() => import('./components/LegalPages').then(m => ({ default: m.PricingPage })));
const AccessibilityStatement = lazy(() => import('./components/AccessibilityStatement').then(m => ({ default: m.AccessibilityStatement })));

// Hooks for changelog and onboarding (small, non-lazy)
import { useChangelog } from './components/ChangelogModal';
import { useOnboarding } from './components/OnboardingFlow';
import { milestoneService } from './services/milestoneService';
import { Milestone } from './types/notifications';
import { LayoutGrid, Users, Menu, X, Terminal, Star, Check } from 'lucide-react';
import { User, PlanType, Theme, Currency } from './types';
import { LanguageProvider, useLanguage } from './i18n';

// Loading fallback component
const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex items-center justify-center p-4">
      <div className={`${sizeClasses[size]} border-2 border-[#00e5ff]/20 border-t-[#00e5ff] rounded-full animate-spin`} />
    </div>
  );
};

// Inner App component that uses language context
const AppContent: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { user, isAuthInitializing, isOAuthProcessing, oauthError, userCreatedAt, login, logout, updateUser: authUpdateUser, updateUserPlan } = useAuth();

  const [view, setView] = useState<'landing' | 'welcome' | 'dashboard' | 'terms' | 'privacy' | 'pricing' | 'accessibility'>(() => {
    // Check for OAuth callback in URL
    const pathname = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    if (pathname.includes('/oauth/callback') || searchParams.has('code')) {
      return 'landing'; // Will be processed by OAuth handler
    }

    // Check URL hash for legal pages
    const hash = window.location.hash.slice(1);
    if (hash === 'terms') return 'terms';
    if (hash === 'privacy') return 'privacy';
    if (hash === 'pricing') return 'pricing';
    if (hash === 'accessibility') return 'accessibility';
    return 'landing';
  });
  const [activeTab, setActiveTab] = useState<'portfolio' | 'watchlist' | 'community'>('portfolio');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewsSidebarOpen, setIsNewsSidebarOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  
  // Notification & Onboarding State
  const { showChangelog, currentChangelog, dismissChangelog } = useChangelog();
  const { showOnboarding, completeOnboarding, skipOnboarding } = useOnboarding(userCreatedAt, user?.id);
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

  // Navigate to dashboard when user becomes authenticated (session restore or OAuth)
  useEffect(() => {
    if (user && view === 'landing' && !isAuthInitializing && !isOAuthProcessing) {
      setView('dashboard');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAuthInitializing, isOAuthProcessing]);

  // Handle demo_upgrade parameter from pricing modal
  useEffect(() => {
    if (!user) return;

    const searchParams = new URLSearchParams(window.location.search);
    const demoUpgrade = searchParams.get('demo_upgrade');

    if (demoUpgrade && demoUpgrade.toUpperCase() !== user.plan) {
      const newPlan = demoUpgrade.toUpperCase() as PlanType;
      updateUserPlan(newPlan);
      window.history.replaceState({}, '', window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Wrapper for components that need to set the full user object
  const setUser = (userOrUpdater: User | null | ((prev: User | null) => User | null)) => {
    if (typeof userOrUpdater === 'function') {
      const newUser = userOrUpdater(user);
      if (newUser) authUpdateUser(newUser);
    } else if (userOrUpdater) {
      authUpdateUser(userOrUpdater);
    }
  };

  // Login handler delegates to AuthContext, then navigates to dashboard
  const handleLogin = async (email: string, name: string) => {
    await login(email, name);
    setView('dashboard');
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
    updateUserPlan(plan);
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
    await logout();
    setView('landing');
  };

  const handleContinue = () => setView('dashboard');

  // Legal pages (accessible via URL hash: #terms, #privacy, #pricing, #accessibility)
  if (view === 'terms') return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner size="lg" />}>
        <TermsOfService onBack={() => { window.location.hash = ''; setView('landing'); }} />
      </Suspense>
    </ErrorBoundary>
  );
  if (view === 'privacy') return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner size="lg" />}>
        <PrivacyPolicy onBack={() => { window.location.hash = ''; setView('landing'); }} />
      </Suspense>
    </ErrorBoundary>
  );
  if (view === 'pricing') return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner size="lg" />}>
        <PricingPage onBack={() => { window.location.hash = ''; setView('landing'); }} />
      </Suspense>
    </ErrorBoundary>
  );
  if (view === 'accessibility') return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner size="lg" />}>
        <AccessibilityStatement onBack={() => { window.location.hash = ''; setView('landing'); }} />
      </Suspense>
    </ErrorBoundary>
  );

  // Show loading spinner while restoring auth session
  if (isAuthInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0b0e14]">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#00e5ff]/20 border-t-[#00e5ff] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-sm">Restoring session...</p>
        </div>
      </div>
    );
  }

  if (view === 'landing') {
    // Default to Showcase unless explicitly disabled
    const showcaseDisabled = (import.meta as ImportMeta & { env?: Record<string, string> })?.env?.VITE_LANDING_SHOWCASE === 'false';
    
    // Show loading spinner while processing OAuth
    if (isOAuthProcessing) {
      return (
        <div className="h-screen flex items-center justify-center bg-[#0b0e14]">
          <div className="text-center">
            <div className="w-12 h-12 border-2 border-[#00e5ff]/20 border-t-[#00e5ff] rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-sm">Completing sign-in...</p>
          </div>
        </div>
      );
    }
    
    return !showcaseDisabled
      ? <ErrorBoundary><Suspense fallback={<LoadingSpinner size="lg" />}><LandingPageShowcase onLogin={handleLogin} initialError={oauthError} /></Suspense></ErrorBoundary>
      : <LandingPage onLogin={handleLogin} />;
  }
  
  if (view === 'welcome' && user) return (
    <ErrorBoundary>
      <Suspense fallback={<LoadingSpinner size="lg" />}>
        <WelcomePage userName={user.name} onContinue={handleContinue} />
      </Suspense>
    </ErrorBoundary>
  );

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
        
        <nav className="h-20 flex-shrink-0 flex items-center justify-between px-4 sm:px-6 lg:px-8 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#0b0e14]/50 backdrop-blur-md z-20 transition-colors gap-2">
          <div className="flex items-center gap-4 sm:gap-8 overflow-hidden min-w-0">
            <Logo className="h-6 sm:h-8 shrink-0" />
            
            <div className="hidden lg:flex items-center bg-slate-100 dark:bg-[#151921] p-1 rounded-2xl border border-slate-200 dark:border-white/5 transition-colors">
               <button onClick={() => setActiveTab('portfolio')} aria-label="View portfolio" className={`px-3 xl:px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-1.5 xl:gap-2 transition-all whitespace-nowrap ${activeTab === 'portfolio' ? 'bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20' : 'text-slate-500'}`}>
                 <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" /> {t('nav.mirror')}
               </button>
               <button onClick={() => setActiveTab('watchlist')} aria-label="View watchlist" className={`px-3 xl:px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-1.5 xl:gap-2 transition-all whitespace-nowrap ${activeTab === 'watchlist' ? 'bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20' : 'text-slate-500'}`}>
                 <Star className="w-3.5 h-3.5" aria-hidden="true" /> {t('nav.watchlist')}
               </button>
               <button onClick={() => setActiveTab('community')} aria-label="View community" className={`px-3 xl:px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl flex items-center gap-1.5 xl:gap-2 transition-all whitespace-nowrap ${activeTab === 'community' ? 'bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/20' : 'text-slate-500'}`}>
                 <Users className="w-3.5 h-3.5" aria-hidden="true" /> {t('nav.community')}
               </button>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink-0">
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
            {/* Admin portal only visible to admin users */}
            {user?.userRole === 'admin' && (
              <button onClick={() => setIsAdminOpen(true)} aria-label="Open admin portal" className="p-2 text-slate-500 hover:text-[#00e5ff] transition-all">
                <Terminal className="w-5 h-5" aria-hidden="true" />
              </button>
            )}
            {/* Sync Status Indicator */}
            <SyncStatusIndicator />
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
            {activeTab === 'portfolio' && (
              <ErrorBoundary fallback={<div className="p-8 text-center text-red-400">Portfolio failed to load. <button onClick={() => window.location.reload()} className="underline">Reload</button></div>}>
                <Suspense fallback={<LoadingSpinner size="lg" />}>
                  <PortfolioView
                    user={user!}
                    onUpdateUser={setUser}
                    currency={currency}
                    onCurrencyChange={setCurrency}
                    onUpgradeClick={() => setIsPricingOpen(true)}
                  />
                </Suspense>
              </ErrorBoundary>
            )}
            {activeTab === 'watchlist' && (
              <ErrorBoundary fallback={<div className="p-8 text-center text-red-400">Watchlist failed to load. <button onClick={() => window.location.reload()} className="underline">Reload</button></div>}>
                <Suspense fallback={<LoadingSpinner size="lg" />}>
                  <Watchlist
                    currency={currency}
                    onAddToPortfolio={(_symbol, _name, _type) => {
                      // Switch to portfolio tab with pre-filled data
                      setActiveTab('portfolio');
                      // The add modal will be handled by PortfolioView
                    }}
                  />
                </Suspense>
              </ErrorBoundary>
            )}
            {activeTab === 'community' && (
              <ErrorBoundary fallback={<div className="p-8 text-center text-red-400">Community failed to load. <button onClick={() => window.location.reload()} className="underline">Reload</button></div>}>
                <Suspense fallback={<LoadingSpinner size="lg" />}>
                  <Community />
                </Suspense>
              </ErrorBoundary>
            )}
          </div>
          <Footer onNavigate={handleNavigate} />
        </div>
      </div>

      <div className={`fixed inset-y-0 right-0 z-50 lg:relative lg:block transition-transform duration-500 transform ${isNewsSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        <div className="h-full relative w-[85vw] sm:w-[380px] lg:w-[380px]">
           <ErrorBoundary fallback={<div className="p-4 text-center text-slate-400">News unavailable</div>}>
             <Suspense fallback={<LoadingSpinner />}>
               <NewsSidebar user={user} onUpgradeClick={() => setIsPricingOpen(true)} />
             </Suspense>
           </ErrorBoundary>
           <button onClick={() => setIsNewsSidebarOpen(false)} aria-label="Close news sidebar" className="absolute top-6 left-[-3rem] lg:hidden p-3 text-white bg-[#00e5ff] rounded-full">
             <X className="w-5 h-5 text-[#0b0e14]" aria-hidden="true" />
           </button>
        </div>
      </div>

      <ErrorBoundary>
        <Suspense fallback={null}>
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
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary>
        <Suspense fallback={null}>
          <AdminPortal
            isOpen={isAdminOpen}
            onClose={() => setIsAdminOpen(false)}
            user={user!}
            onUpdateUser={setUser}
          />
        </Suspense>
      </ErrorBoundary>

      {user && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <PricingModal
              user={user}
              isOpen={isPricingOpen}
              onClose={() => setIsPricingOpen(false)}
              onPlanChange={handlePlanUpgrade}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {user && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <AIAssistant user={user} onUpdateUsage={(credits) => setUser(u => u ? {...u, credits: {...u.credits, ai: credits}} : null)} />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* Notification & Onboarding Overlays */}
      {showChangelog && currentChangelog && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <ChangelogModal
              isOpen={showChangelog}
              onClose={dismissChangelog}
              changelog={currentChangelog}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {user && showOnboarding && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <OnboardingFlow
              isOpen={showOnboarding}
              onComplete={completeOnboarding}
              onSkip={skipOnboarding}
              userName={user.name}
              userPlan={user.plan}
              onOpenPricing={() => setIsPricingOpen(true)}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {user && activeMilestone && isMilestoneOpen && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <MilestoneModal
              isOpen={isMilestoneOpen}
              milestone={activeMilestone}
              onClose={handleMilestoneClose}
              onAction={handleMilestoneAction}
            />
          </Suspense>
        </ErrorBoundary>
      )}
    </div>
  );
};

// Main App component with providers and error boundaries
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <GlobalErrorHandler>
        <LanguageProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </LanguageProvider>
      </GlobalErrorHandler>
    </ErrorBoundary>
  );
};

export default App;

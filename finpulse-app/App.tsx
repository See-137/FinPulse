
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Logo, SaaS_PLANS } from './constants';
// Critical components - loaded immediately
import { MarketTicker } from './components/MarketTicker';
import { LandingPage } from './components/LandingPage';
import { Footer } from './components/Footer';
import { NotificationBell } from './components/NotificationBell';
import { TopBanner } from './components/TopBanner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SyncStatusIndicator } from './components/SyncStatusIndicator';

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
import { Shield, LayoutGrid, Users, Menu, X, Terminal, Star, Globe, Check } from 'lucide-react';
import { User, PlanType, Theme, Currency } from './types';
import { auth, type CognitoUser } from './services/authService';
import { LanguageProvider, useLanguage, type Language } from './i18n';
import { usePortfolioStore } from './store/portfolioStore';
import { api } from './services/apiService';

// Loading fallback component
const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex items-center justify-center p-4">
      <div className={`${sizeClasses[size]} border-2 border-[#00e5ff]/20 border-t-[#00e5ff] rounded-full animate-spin`} />
    </div>
  );
};

// Map backend plan names to frontend plan types
const mapBackendPlanToFrontend = (backendPlan: string | undefined): PlanType => {
  const planMap: Record<string, PlanType> = {
    'FREE': 'FREE',
    'free': 'FREE',
    'PROPULSE': 'PROPULSE',
    'propulse': 'PROPULSE',
    'PREMIUM': 'PROPULSE',    // Backend 'premium' maps to 'PROPULSE'
    'premium': 'PROPULSE',
    'SUPERPULSE': 'SUPERPULSE',
    'superpulse': 'SUPERPULSE',
    'PRO': 'SUPERPULSE',       // Backend 'PRO' maps to 'SUPERPULSE' (highest tier)
    'pro': 'SUPERPULSE',
    'ENTERPRISE': 'SUPERPULSE',
    'enterprise': 'SUPERPULSE'
  };
  return planMap[backendPlan || 'FREE'] || 'FREE';
};

const USER_STORAGE_KEY = 'finpulse_user_session';

// Inner App component that uses language context
const AppContent: React.FC = () => {
  const { t, language, setLanguage, isRTL } = useLanguage();
  const { setCurrentUser, clearCurrentUser, getHoldings } = usePortfolioStore();
  
  // OAuth callback handling state
  const [isOAuthProcessing, setIsOAuthProcessing] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  
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
  const [user, setUser] = useState<User | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewsSidebarOpen, setIsNewsSidebarOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  
  // Track user creation date for onboarding logic
  const [userCreatedAt, setUserCreatedAt] = useState<string | undefined>(undefined);
  
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

  // Auth initialization state
  const [isAuthInitializing, setIsAuthInitializing] = useState(true);

  // Restore session from Cognito (proper auth flow with async token refresh)
  useEffect(() => {
    const restoreAuth = async () => {
      setIsAuthInitializing(true);
      
      try {
        // Use new async initializeAuth that properly waits for token refresh
        const cognitoUser = await auth.initializeAuth();
        
        if (!cognitoUser) {
          console.log('[App] No valid session to restore');
          setIsAuthInitializing(false);
          return; // No session to restore - stay on landing
        }
        
        const idToken = localStorage.getItem('finpulse_id_token');
        if (!idToken) {
          // Partial session state - clean it up
          console.log('[App] Partial session state, cleaning up');
          clearAuthData();
          setIsAuthInitializing(false);
          return;
        }
        
        // Token is already validated and refreshed by initializeAuth
        api.setIdToken(idToken);
        
        // Create User object from Cognito credentials + backend data
        const result = await fetchUserProfile(cognitoUser.userId);
        if (result) {
          console.log('[App] Session restored for user:', result.user.email);
          setUser(result.user);
          setUserCreatedAt(result.createdAt);
          setCurrentUser(result.user.id);
          setView('dashboard');
        } else {
          // Profile fetch returned null (401/error handled inside)
          console.log('[App] Profile fetch failed, clearing auth');
          clearAuthData();
        }
      } catch (error) {
        // Auth error - clear and stay on landing
        console.error('[App] Auth restoration error:', error);
        clearAuthData();
      } finally {
        setIsAuthInitializing(false);
      }
    };
    restoreAuth();
  }, [setCurrentUser]);

  // Handle OAuth callback (Google Sign-In)
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const searchParams = new URLSearchParams(window.location.search);
      const pathname = window.location.pathname;
      
      // Check if this is an OAuth callback
      if (!searchParams.has('code') && !pathname.includes('/oauth/callback')) {
        return;
      }

      // Parse the callback
      const callbackResult = auth.parseOAuthCallback();
      
      if (!callbackResult.success) {
        setOauthError(callbackResult.errorDescription || callbackResult.error || 'OAuth failed');
        // Clear the URL params
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      if (!callbackResult.code) {
        return;
      }

      setIsOAuthProcessing(true);
      setOauthError(null);

      try {
        // Exchange code for tokens and complete sign-in
        const result = await auth.exchangeOAuthCode(callbackResult.code);
        
        // Clear the URL params
        window.history.replaceState({}, '', '/');
        
        if (result.success && result.user) {
          // Sign-in successful
          const idToken = localStorage.getItem('finpulse_id_token');
          if (idToken) {
            api.setIdToken(idToken);
          }
          
          const profile = await fetchUserProfile(result.user.userId);
          if (profile) {
            setUser(profile.user);
            setUserCreatedAt(profile.createdAt);
            setCurrentUser(profile.user.id);
            setView('dashboard');
          }
        } else if (result.requiresLinking) {
          // Account collision - needs password verification
          // Store linking info and show linking UI
          sessionStorage.setItem('oauth_linking', JSON.stringify({
            existingUserId: result.existingUserId,
            linkingToken: result.linkingToken,
            error: result.error
          }));
          setOauthError(result.error || 'An account with this email already exists. Please sign in with your password to link accounts.');
        } else {
          setOauthError(result.error || 'OAuth sign-in failed');
        }
      } catch (error) {
        console.error('OAuth callback error:', error);
        setOauthError('Failed to complete sign-in. Please try again.');
      } finally {
        setIsOAuthProcessing(false);
      }
    };

    handleOAuthCallback();
  }, []); // Run once on mount

  // Persist session
  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }
  }, [user]);

  // Handle demo_upgrade parameter from pricing modal
  useEffect(() => {
    if (!user) return;

    const searchParams = new URLSearchParams(window.location.search);
    const demoUpgrade = searchParams.get('demo_upgrade');

    if (demoUpgrade && demoUpgrade.toUpperCase() !== user.plan) {
      const newPlan = demoUpgrade.toUpperCase() as PlanType;
      
      // Apply the plan change
      setUser({
        ...user,
        plan: newPlan,
        credits: {
          ...user.credits,
          maxAi: SaaS_PLANS[newPlan].maxAiQueries,
          maxAssets: SaaS_PLANS[newPlan].maxAssets
        }
      });

      // Clear the demo parameter from URL
      window.history.replaceState({}, '', window.location.pathname);
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
  // Returns user object and createdAt timestamp for onboarding logic
  const fetchUserProfile = async (userId: string): Promise<{ user: User; createdAt?: string } | null> => {
    try {
      const idToken = localStorage.getItem('finpulse_id_token');
      if (!idToken) {
        console.log('[App] fetchUserProfile: No idToken in localStorage');
        return null;
      }

      const apiUrl = import.meta.env.VITE_API_URL || 'https://b3fgmin9yj.execute-api.us-east-1.amazonaws.com/prod';
      console.log('[App] fetchUserProfile: Calling', `${apiUrl}/auth/me`);
      const response = await fetch(`${apiUrl}/auth/me`, {
        headers: { 'Authorization': `Bearer ${idToken}` },
      });
      
      if (!response.ok) {
        console.error('[App] fetchUserProfile: API returned', response.status, response.statusText);
        const errorBody = await response.text().catch(() => 'Could not read error body');
        console.error('[App] fetchUserProfile: Error body:', errorBody);
        return null;
      }
      
      const data = await response.json();
      console.log('[App] fetchUserProfile: Got user data', data);
      const backendUser = data.data || data;
      
      // Map backend plan to frontend plan type
      const frontendPlan = mapBackendPlanToFrontend(backendUser.plan);
      
      // Map backend user to frontend User type
      const user: User = {
        id: backendUser.userId,
        email: backendUser.email,
        name: backendUser.name,
        plan: frontendPlan,
        userRole: backendUser.userRole || 'user',
        credits: {
          ai: backendUser.credits?.ai || 0,
          maxAi: backendUser.credits?.maxAi || SaaS_PLANS[frontendPlan].maxAiQueries,
          assets: backendUser.credits?.assets || 0,
          maxAssets: backendUser.credits?.maxAssets || SaaS_PLANS[frontendPlan].maxAssets
        },
        subscriptionStatus: backendUser.subscriptionStatus || 'active'
      };
      
      return { user, createdAt: backendUser.createdAt };
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
    const result = await fetchUserProfile(cognitoUser.userId);

    if (result) {
      setUser(result.user);
      setUserCreatedAt(result.createdAt); // Pass to onboarding hook
      setCurrentUser(result.user.id); // Set persistent userId from Cognito
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
    setUserCreatedAt(undefined); // Clear for next user
    clearCurrentUser(); // Clear portfolio user scope
    localStorage.removeItem(USER_STORAGE_KEY);
    // Note: onboarding state is now user-scoped, so no need to clear it
    setView('landing');
  };

  const handleContinue = () => setView('dashboard');

  // Legal pages (accessible via URL hash: #terms, #privacy, #pricing, #accessibility)
  if (view === 'terms') return (
    <Suspense fallback={<LoadingSpinner size="lg" />}>
      <TermsOfService onBack={() => { window.location.hash = ''; setView('landing'); }} />
    </Suspense>
  );
  if (view === 'privacy') return (
    <Suspense fallback={<LoadingSpinner size="lg" />}>
      <PrivacyPolicy onBack={() => { window.location.hash = ''; setView('landing'); }} />
    </Suspense>
  );
  if (view === 'pricing') return (
    <Suspense fallback={<LoadingSpinner size="lg" />}>
      <PricingPage onBack={() => { window.location.hash = ''; setView('landing'); }} />
    </Suspense>
  );
  if (view === 'accessibility') return (
    <Suspense fallback={<LoadingSpinner size="lg" />}>
      <AccessibilityStatement onBack={() => { window.location.hash = ''; setView('landing'); }} />
    </Suspense>
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
    const showcaseDisabled = (import.meta as any)?.env?.VITE_LANDING_SHOWCASE === 'false';
    
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
      ? <Suspense fallback={<LoadingSpinner size="lg" />}><LandingPageShowcase onLogin={handleLogin} initialError={oauthError} /></Suspense>
      : <LandingPage onLogin={handleLogin} />;
  }
  
  if (view === 'welcome' && user) return (
    <Suspense fallback={<LoadingSpinner size="lg" />}>
      <WelcomePage userName={user.name} onContinue={handleContinue} />
    </Suspense>
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
            <ErrorBoundary fallback={<div className="p-8 text-center text-red-400">Failed to load view. <button onClick={() => window.location.reload()} className="underline">Reload</button></div>}>
              <Suspense fallback={<LoadingSpinner size="lg" />}>
                {activeTab === 'portfolio' ? (
                  <PortfolioView 
                    user={user!} 
                    onUpdateUser={setUser} 
                    currency={currency} 
                    onCurrencyChange={setCurrency}
                    onUpgradeClick={() => setIsPricingOpen(true)}
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
              </Suspense>
            </ErrorBoundary>
          </div>
          <Footer onNavigate={handleNavigate} />
        </div>
      </div>

      <div className={`fixed inset-y-0 right-0 z-50 lg:relative lg:block transition-transform duration-500 transform ${isNewsSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        <div className="h-full relative w-[85vw] sm:w-[380px] lg:w-[380px]">
           <ErrorBoundary fallback={<div className="p-4 text-center text-slate-400">News unavailable</div>}>
             <Suspense fallback={<LoadingSpinner />}>
               <NewsSidebar userPlan={user?.plan || 'FREE'} user={user} onUpgradeClick={() => setIsPricingOpen(true)} />
             </Suspense>
           </ErrorBoundary>
           <button onClick={() => setIsNewsSidebarOpen(false)} aria-label="Close news sidebar" className="absolute top-6 left-[-3rem] lg:hidden p-3 text-white bg-[#00e5ff] rounded-full">
             <X className="w-5 h-5 text-[#0b0e14]" aria-hidden="true" />
           </button>
        </div>
      </div>

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

      <Suspense fallback={null}>
        <AdminPortal 
          isOpen={isAdminOpen} 
          onClose={() => setIsAdminOpen(false)} 
          user={user!} 
          onUpdateUser={setUser} 
        />
      </Suspense>

      {user && (
        <Suspense fallback={null}>
          <PricingModal
            user={user}
            isOpen={isPricingOpen}
            onClose={() => setIsPricingOpen(false)}
            onPlanChange={handlePlanUpgrade}
          />
        </Suspense>
      )}

      {user && (
        <Suspense fallback={null}>
          <AIAssistant user={user} onUpdateUsage={(credits) => setUser(u => u ? {...u, credits: {...u.credits, ai: credits}} : null)} />
        </Suspense>
      )}

      {/* Notification & Onboarding Overlays */}
      {showChangelog && currentChangelog && (
        <Suspense fallback={null}>
          <ChangelogModal
            isOpen={showChangelog}
            onClose={dismissChangelog}
            changelog={currentChangelog}
          />
        </Suspense>
      )}

      {user && showOnboarding && (
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
      )}

      {user && activeMilestone && isMilestoneOpen && (
        <Suspense fallback={null}>
          <MilestoneModal
            isOpen={isMilestoneOpen}
            milestone={activeMilestone}
            onClose={handleMilestoneClose}
            onAction={handleMilestoneAction}
          />
        </Suspense>
      )}
    </div>
  );
};

// Main App component with LanguageProvider and ErrorBoundary wrappers
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ErrorBoundary>
  );
};

export default App;

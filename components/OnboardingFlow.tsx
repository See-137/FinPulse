/**
 * FinPulse V2: Onboarding Flow Component
 * Progressive 7-step welcome experience for new users
 */

import React, { useState, useEffect } from 'react';
import { 
  X, ChevronRight, ChevronLeft, Sparkles, LayoutGrid, 
  Plus, RefreshCw, Bot, Users, Crown, Lock, Check,
  TrendingUp, Zap, ArrowRight
} from 'lucide-react';
import { NOTIFICATION_STORAGE_KEYS, OnboardingStep } from '../types/notifications';
import { useLanguage } from '../i18n';
import { SaaS_PLANS } from '../constants';
import { PlanType } from '../types';
import { componentLogger } from '../services/logger';

interface OnboardingFlowProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
  userName?: string;
  userPlan?: PlanType;
  onOpenPricing?: () => void;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to FinPulse! 🎉',
    description: 'Your all-in-one portfolio tracker for crypto, stocks, and commodities.'
  },
  {
    id: 'dashboard',
    title: 'Your Portfolio Mirror',
    description: 'See all your assets in one place with real-time prices and performance tracking.'
  },
  {
    id: 'add-asset',
    title: 'Add Your First Asset',
    description: 'Track Bitcoin, Ethereum, Apple, Tesla, and thousands more. Choose from 35+ popular assets or search for any ticker.'
  },
  {
    id: 'live-prices',
    title: 'Real-Time Updates',
    description: 'Prices refresh automatically every 60 seconds. Upgrade for 30-second refresh rates.'
  },
  {
    id: 'ai-copilot',
    title: 'AI-Powered Insights',
    description: 'Ask questions about market trends, get portfolio analysis, and discover opportunities.',
    locked: true,
    unlockPlan: 'PROPULSE'
  },
  {
    id: 'community',
    title: 'Join the Community',
    description: 'See what other investors are tracking, share insights, and discover winning strategies.'
  },
  {
    id: 'plans',
    title: 'Choose Your Plan',
    description: 'Start free or unlock premium features with ProPulse or SuperPulse.'
  }
];

// Step content components
const WelcomeStep: React.FC<{ userName?: string }> = ({ userName }) => {
  const { t } = useLanguage();
  return (
    <div className="text-center py-8">
      <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-[#00e5ff]/20 to-blue-500/20 rounded-3xl flex items-center justify-center">
        <Sparkles className="w-12 h-12 text-[#00e5ff]" />
      </div>
      <h2 className="text-3xl font-black mb-4 bg-gradient-to-r from-[#00e5ff] to-blue-500 bg-clip-text text-transparent">
        {userName ? `Welcome, ${userName}!` : 'Welcome to FinPulse!'}
      </h2>
      <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
        {t('onboarding.welcomeDesc')}
      </p>
    </div>
  );
};

const DashboardStep: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="text-center py-6">
      <div className="relative max-w-md mx-auto mb-6">
        {/* Mock dashboard preview */}
        <div className="bg-slate-100 dark:bg-[#0b0e14] rounded-2xl p-4 border border-slate-200 dark:border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-[#00e5ff]" />
              <span className="font-bold text-sm">{t('onboarding.yourMirror')}</span>
            </div>
            <span className="text-xs text-green-500 font-bold">+12.5%</span>
          </div>
          <div className="space-y-2">
            {['BTC', 'ETH', 'AAPL'].map(symbol => (
              <div key={symbol} className="flex items-center justify-between p-2 bg-white dark:bg-[#151921] rounded-xl">
                <span className="font-mono text-sm font-bold">{symbol}</span>
                <span className="text-xs text-slate-500">$••••</span>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute -top-2 -right-2 bg-[#00e5ff] text-black text-xs font-bold px-2 py-1 rounded-lg">
          {t('common.live')}
        </div>
      </div>
      <p className="text-slate-600 dark:text-slate-400 text-sm">
        {t('onboarding.dashboardDesc')}
      </p>
    </div>
  );
};

const AddAssetStep: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="text-center py-6">
      <div className="max-w-md mx-auto mb-6">
        <div className="bg-slate-100 dark:bg-[#0b0e14] rounded-2xl p-4 border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2 mb-4 p-3 bg-white dark:bg-[#151921] rounded-xl border-2 border-dashed border-[#00e5ff]/50">
            <Plus className="w-5 h-5 text-[#00e5ff]" />
            <span className="text-sm text-slate-500">{t('onboarding.searchAssets')}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {['BTC', 'ETH', 'AAPL', 'MSFT', 'TSLA', 'NVDA', 'SOL', 'XRP'].map(symbol => (
              <div key={symbol} className="p-2 bg-white dark:bg-[#151921] rounded-xl text-center">
                <span className="font-mono text-xs font-bold">{symbol}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="text-slate-600 dark:text-slate-400 text-sm">
        {t('onboarding.addAssetDesc')}
      </p>
    </div>
  );
};

const LivePricesStep: React.FC = () => {
  const { t } = useLanguage();
  const [counter, setCounter] = useState(60);

  useEffect(() => {
    const timer = setInterval(() => {
      setCounter(c => c > 0 ? c - 1 : 60);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-center py-6">
      <div className="max-w-md mx-auto mb-6">
        <div className="relative bg-slate-100 dark:bg-[#0b0e14] rounded-2xl p-6 border border-slate-200 dark:border-white/10">
          <RefreshCw className="w-16 h-16 mx-auto mb-4 text-[#00e5ff] animate-spin" style={{ animationDuration: '3s' }} />
          <div className="text-4xl font-mono font-black text-[#00e5ff] mb-2">
            {counter}s
          </div>
          <p className="text-xs text-slate-500">{t('onboarding.nextRefresh')}</p>
        </div>
      </div>
      <p className="text-slate-600 dark:text-slate-400 text-sm">
        {t('onboarding.livePricesDesc')}
      </p>
    </div>
  );
};

const AICopilotStep: React.FC<{ isLocked: boolean; onUnlock?: () => void }> = ({ isLocked, onUnlock }) => {
  const { t } = useLanguage();
  return (
    <div className="text-center py-6">
      <div className="relative max-w-md mx-auto mb-6">
        <div className={`bg-slate-100 dark:bg-[#0b0e14] rounded-2xl p-4 border border-slate-200 dark:border-white/10 ${isLocked ? 'blur-sm opacity-50' : ''}`}>
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-[#00e5ff]" />
            <span className="font-bold text-sm">{t('onboarding.aiCopilot')}</span>
          </div>
          <div className="space-y-2 text-left">
            <div className="p-3 bg-white dark:bg-[#151921] rounded-xl text-xs">
              <span className="text-slate-500">You:</span> What's happening with BTC?
            </div>
            <div className="p-3 bg-[#00e5ff]/10 rounded-xl text-xs">
              <span className="text-[#00e5ff]">AI:</span> Bitcoin is up 2.3% today...
            </div>
          </div>
        </div>
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white dark:bg-[#151921] p-6 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 text-center">
              <Lock className="w-8 h-8 mx-auto mb-3 text-[#00e5ff]" />
              <h4 className="font-bold mb-2">{t('onboarding.unlockAI')}</h4>
              <p className="text-xs text-slate-500 mb-3">{t('onboarding.availableOn')} ProPulse</p>
              {onUnlock && (
                <button
                  onClick={onUnlock}
                  className="px-4 py-2 bg-gradient-to-r from-[#00e5ff] to-blue-500 text-black text-xs font-bold rounded-xl"
                >
                  {t('common.upgrade')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      <p className="text-slate-600 dark:text-slate-400 text-sm">
        {t('onboarding.aiDesc')}
      </p>
    </div>
  );
};

const CommunityStep: React.FC = () => {
  const { t } = useLanguage();
  return (
    <div className="text-center py-6">
      <div className="max-w-md mx-auto mb-6">
        <div className="bg-slate-100 dark:bg-[#0b0e14] rounded-2xl p-4 border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-[#00e5ff]" />
            <span className="font-bold text-sm">{t('onboarding.globalPulse')}</span>
          </div>
          <div className="space-y-2">
            {[
              { user: 'Trader_X', action: 'added BTC to watchlist' },
              { user: 'CryptoKing', action: 'shared analysis on ETH' },
              { user: 'StockPro', action: 'posted a trade idea' }
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-white dark:bg-[#151921] rounded-xl text-xs">
                <div className="w-6 h-6 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full flex items-center justify-center text-[10px] font-bold">
                  {item.user[0]}
                </div>
                <span className="text-slate-600 dark:text-slate-400">
                  <span className="font-bold text-slate-900 dark:text-white">{item.user}</span> {item.action}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="text-slate-600 dark:text-slate-400 text-sm">
        {t('onboarding.communityDesc')}
      </p>
    </div>
  );
};

const PlansStep: React.FC<{ onSelectPlan?: () => void }> = ({ onSelectPlan }) => {
  const { t } = useLanguage();
  const plans = [
    { key: 'FREE' as PlanType, icon: Zap, highlight: false },
    { key: 'PROPULSE' as PlanType, icon: TrendingUp, highlight: true },
    { key: 'SUPERPULSE' as PlanType, icon: Crown, highlight: false }
  ];

  return (
    <div className="py-4">
      <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
        {plans.map(({ key, icon: Icon, highlight }) => {
          const plan = SaaS_PLANS[key];
          return (
            <div
              key={key}
              className={`p-4 rounded-2xl border text-center ${
                highlight 
                  ? 'bg-gradient-to-br from-[#00e5ff]/10 to-blue-500/10 border-[#00e5ff]/30' 
                  : 'bg-slate-50 dark:bg-[#0b0e14] border-slate-200 dark:border-white/10'
              }`}
            >
              <Icon className={`w-6 h-6 mx-auto mb-2 ${highlight ? 'text-[#00e5ff]' : 'text-slate-400'}`} />
              <h4 className="font-bold text-sm mb-1">{plan.name}</h4>
              <p className={`text-lg font-black ${highlight ? 'text-[#00e5ff]' : ''}`}>{plan.price}</p>
              <p className="text-[10px] text-slate-500 mt-1">{plan.maxAssets} assets</p>
              <p className="text-[10px] text-slate-500">{plan.maxAiQueries} AI/day</p>
              {highlight && (
                <span className="inline-block mt-2 text-[9px] font-bold text-[#00e5ff] bg-[#00e5ff]/10 px-2 py-0.5 rounded-full">
                  {t('onboarding.recommended')}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {onSelectPlan && (
        <button
          onClick={onSelectPlan}
          className="mt-4 mx-auto block text-sm text-[#00e5ff] hover:underline flex items-center gap-1 justify-center"
        >
          {t('onboarding.comparePlans')} <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  isOpen,
  onComplete,
  onSkip,
  userName,
  userPlan = 'FREE',
  onOpenPricing
}) => {
  const { t, isRTL } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      localStorage.setItem(NOTIFICATION_STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
      localStorage.setItem(NOTIFICATION_STORAGE_KEYS.USER_SIGNUP_DATE, new Date().toISOString());
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem(NOTIFICATION_STORAGE_KEYS.ONBOARDING_COMPLETED, 'true');
    localStorage.setItem(NOTIFICATION_STORAGE_KEYS.USER_SIGNUP_DATE, new Date().toISOString());
    onSkip();
  };

  const renderStepContent = () => {
    switch (step.id) {
      case 'welcome': return <WelcomeStep userName={userName} />;
      case 'dashboard': return <DashboardStep />;
      case 'add-asset': return <AddAssetStep />;
      case 'live-prices': return <LivePricesStep />;
      case 'ai-copilot': return <AICopilotStep isLocked={userPlan === 'FREE'} onUnlock={onOpenPricing} />;
      case 'community': return <CommunityStep />;
      case 'plans': return <PlansStep onSelectPlan={onOpenPricing} />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300" />
      
      {/* Modal */}
      <div 
        className={`relative w-full max-w-xl bg-white dark:bg-[#151921] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300 ${isRTL ? 'rtl' : 'ltr'}`}
      >
        {/* Progress Bar */}
        <div className="h-1 bg-slate-200 dark:bg-white/10">
          <div 
            className="h-full bg-gradient-to-r from-[#00e5ff] to-blue-500 transition-all duration-500"
            style={{ width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#00e5ff]">
              {currentStep + 1}/{ONBOARDING_STEPS.length}
            </span>
            <span className="text-xs text-slate-500">{step.title}</span>
          </div>
          <button
            onClick={handleSkip}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            {t('onboarding.skip')}
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-slate-200 dark:border-white/10">
          <button
            onClick={handleBack}
            disabled={isFirstStep}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              isFirstStep 
                ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed' 
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            {t('onboarding.back')}
          </button>

          {/* Step indicators */}
          <div className="flex items-center gap-1.5">
            {ONBOARDING_STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === currentStep 
                    ? 'bg-[#00e5ff]' 
                    : i < currentStep 
                      ? 'bg-[#00e5ff]/50' 
                      : 'bg-slate-300 dark:bg-white/20'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-[#00e5ff] to-blue-500 text-black hover:opacity-90 transition-opacity"
          >
            {isLastStep ? t('onboarding.getStarted') : t('onboarding.next')}
            {!isLastStep && <ChevronRight className="w-4 h-4" />}
            {isLastStep && <Check className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};

// Hook to manage onboarding state
// Accepts userCreatedAt to distinguish new vs returning users
// Accepts userId to make completion state user-scoped
export const useOnboarding = (userCreatedAt?: string, userId?: string) => {
  const [showOnboarding, setShowOnboarding] = useState(false);

  // User-scoped storage key
  const getStorageKey = () => userId 
    ? `finpulse_onboarding_completed_${userId}` 
    : NOTIFICATION_STORAGE_KEYS.ONBOARDING_COMPLETED;

  useEffect(() => {
    // Wait for userId to be available
    if (!userId) return;

    const storageKey = getStorageKey();
    const hasCompleted = localStorage.getItem(storageKey);
    
    // If already completed for this user, don't show
    if (hasCompleted) {
      return;
    }
    
    // If we have user creation date, check if this is a returning user
    if (userCreatedAt) {
      const createdTime = new Date(userCreatedAt).getTime();
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      // If account is older than 5 minutes, this is a returning user
      // who cleared localStorage - auto-complete onboarding
      if (now - createdTime > fiveMinutes) {
        localStorage.setItem(storageKey, 'true');
        componentLogger.debug('Returning user detected, skipping onboarding');
        return;
      }
    }
    
    // For new users (or unknown state), show onboarding after delay
    const timer = setTimeout(() => setShowOnboarding(true), 500);
    return () => clearTimeout(timer);
  }, [userCreatedAt, userId]);

  const completeOnboarding = () => {
    localStorage.setItem(getStorageKey(), 'true');
    setShowOnboarding(false);
  };
  
  const skipOnboarding = () => {
    localStorage.setItem(getStorageKey(), 'true');
    setShowOnboarding(false);
  };
  
  const resetOnboarding = () => {
    localStorage.removeItem(getStorageKey());
    localStorage.removeItem(NOTIFICATION_STORAGE_KEYS.USER_SIGNUP_DATE);
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding
  };
};

export default OnboardingFlow;

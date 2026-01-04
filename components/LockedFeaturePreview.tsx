/**
 * FinPulse V2: Locked Feature Preview Component
 * Shows premium features with lock overlays to create awareness
 */

import React from 'react';
import { Lock, ArrowRight, Sparkles, Crown } from 'lucide-react';
import { PlanType } from '../types';
import { SaaS_PLANS } from '../constants';
import { useLanguage } from '../i18n';

interface LockedFeaturePreviewProps {
  title: string;
  description: string;
  unlockPlan: PlanType;
  currentPlan: PlanType;
  children: React.ReactNode;
  onUpgrade?: () => void;
  variant?: 'blur' | 'overlay' | 'inline';
  showPreview?: boolean;
}

export const LockedFeaturePreview: React.FC<LockedFeaturePreviewProps> = ({
  title,
  description,
  unlockPlan,
  currentPlan,
  children,
  onUpgrade,
  variant = 'overlay',
  showPreview = true
}) => {
  const { t } = useLanguage();

  // Check if feature is unlocked
  const planHierarchy: PlanType[] = ['FREE', 'PROPULSE', 'SUPERPULSE'];
  const currentPlanIndex = planHierarchy.indexOf(currentPlan);
  const unlockPlanIndex = planHierarchy.indexOf(unlockPlan);
  const isUnlocked = currentPlanIndex >= unlockPlanIndex;

  // If unlocked, just render children
  if (isUnlocked) {
    return <>{children}</>;
  }

  const unlockPlanInfo = SaaS_PLANS[unlockPlan];

  // Blur variant - content is blurred with centered overlay
  if (variant === 'blur') {
    return (
      <div className="relative">
        <div className="blur-sm opacity-50 grayscale pointer-events-none select-none">
          {showPreview && children}
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 dark:bg-black/20">
          <div className="text-center p-6 bg-white dark:bg-[#151921] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 max-w-sm mx-4">
            <div className="w-14 h-14 mx-auto mb-4 bg-[#00e5ff]/20 rounded-2xl flex items-center justify-center border border-[#00e5ff]/30">
              <Lock className="w-7 h-7 text-[#00e5ff]" />
            </div>
            <h3 className="text-lg font-bold mb-2 text-slate-900 dark:text-white">{title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{description}</p>
            {onUpgrade && (
              <button
                onClick={onUpgrade}
                className="px-6 py-2.5 bg-gradient-to-r from-[#00e5ff] to-blue-500 text-black text-sm font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto"
              >
                {t('lockedFeature.unlockWith')} {unlockPlanInfo.name}
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            <p className="text-xs text-slate-500 mt-3">
              {unlockPlanInfo.price}/mo
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Overlay variant - semi-transparent overlay with lock badge
  if (variant === 'overlay') {
    return (
      <div className="relative group">
        <div className="opacity-60 pointer-events-none select-none transition-opacity group-hover:opacity-40">
          {showPreview && children}
        </div>
        
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="text-center p-4 bg-white/95 dark:bg-[#151921]/95 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 dark:border-white/10">
            <Lock className="w-6 h-6 text-[#00e5ff] mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">{title}</p>
            <p className="text-xs text-slate-500 mb-3">{t('lockedFeature.availableOn')} {unlockPlanInfo.name}</p>
            {onUpgrade && (
              <button
                onClick={onUpgrade}
                className="px-4 py-1.5 bg-[#00e5ff] text-black text-xs font-bold rounded-lg hover:opacity-90"
              >
                {t('common.upgrade')}
              </button>
            )}
          </div>
        </div>
        
        {/* Lock badge */}
        <div className="absolute top-2 right-2 px-2 py-1 bg-slate-900/80 dark:bg-white/10 rounded-lg flex items-center gap-1.5">
          <Lock className="w-3 h-3 text-[#00e5ff]" />
          <span className="text-[10px] font-bold text-white">{unlockPlanInfo.name}</span>
        </div>
      </div>
    );
  }

  // Inline variant - compact inline message
  return (
    <div className="p-4 bg-slate-100 dark:bg-[#0b0e14] rounded-2xl border border-slate-200 dark:border-white/10">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-[#00e5ff]/20 rounded-xl shrink-0">
          <Lock className="w-5 h-5 text-[#00e5ff]" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-900 dark:text-white mb-1">{title}</h4>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{description}</p>
          <div className="flex items-center gap-3">
            {onUpgrade && (
              <button
                onClick={onUpgrade}
                className="px-4 py-2 bg-gradient-to-r from-[#00e5ff] to-blue-500 text-black text-xs font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {t('lockedFeature.unlockWith')} {unlockPlanInfo.name}
              </button>
            )}
            <span className="text-xs text-slate-500">{unlockPlanInfo.price}/mo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Simple locked badge for small elements
 */
interface LockedBadgeProps {
  plan: PlanType;
  size?: 'sm' | 'md';
}

export const LockedBadge: React.FC<LockedBadgeProps> = ({ plan, size = 'sm' }) => {
  const planInfo = SaaS_PLANS[plan];
  const isPro = plan !== 'FREE';
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
      isPro ? 'bg-[#00e5ff]/10 text-[#00e5ff]' : 'bg-purple-500/10 text-purple-500'
    } ${size === 'sm' ? 'text-[9px]' : 'text-xs'} font-bold`}>
      {isPro ? <Crown className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} /> : <Lock className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />}
      {planInfo.name}
    </span>
  );
};

export default LockedFeaturePreview;

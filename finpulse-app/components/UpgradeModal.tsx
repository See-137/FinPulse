/**
 * FinPulse Upgrade Modal
 * Styled plan-gate modal shown when free users hit feature limits.
 * Follows MilestoneModal visual pattern.
 */

import React from 'react';
import { X, Lock, ArrowRight } from 'lucide-react';
import { PlanType } from '../types';
import { SaaS_PLANS } from '../constants';
import { useLanguage } from '../i18n';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  featureName: string;
  featureDescription: string;
  requiredPlan: PlanType;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  onUpgrade,
  featureName,
  featureDescription,
  requiredPlan,
}) => {
  const { t, isRTL } = useLanguage();

  if (!isOpen) return null;

  const planInfo = SaaS_PLANS[requiredPlan];

  const handleUpgrade = () => {
    onUpgrade();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-md bg-white dark:bg-[#151921] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in zoom-in-95 duration-300 ${isRTL ? 'rtl' : 'ltr'}`}
      >
        {/* Decorative gradient */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-[#00e5ff]/20 via-blue-500/10 to-purple-500/10" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors z-10"
        >
          <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>

        {/* Content */}
        <div className="relative p-8 pt-12 text-center">
          {/* Lock icon */}
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center bg-[#00e5ff]/20 border-2 border-[#00e5ff]/30">
            <Lock className="w-10 h-10 text-[#00e5ff]" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-black mb-2 text-slate-900 dark:text-white">
            {featureName}
          </h2>

          {/* Plan info */}
          <p className="text-sm text-slate-500 mb-1">
            {t('upgrade.availableOn')} {planInfo.name} — From {planInfo.price}/mo
          </p>

          {/* Description */}
          <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
            {featureDescription}
          </p>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={handleUpgrade}
              className="w-full py-3 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-gradient-to-r from-[#00e5ff] to-blue-500 text-black hover:opacity-90 transition-all"
            >
              {t('upgrade.upgradeNow')}
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 px-6 rounded-2xl font-bold text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
            >
              {t('milestones.maybeLater')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;

/**
 * FinPulse V2: Milestone Modal Component
 * Displays milestone achievements and upgrade prompts
 */

import React from 'react';
import { X, Trophy, ArrowRight, Sparkles } from 'lucide-react';
import { Milestone } from '../types/notifications';
import { useLanguage } from '../i18n';

interface MilestoneModalProps {
  isOpen: boolean;
  milestone: Milestone | null;
  onClose: () => void;
  onAction: () => void;
}

export const MilestoneModal: React.FC<MilestoneModalProps> = ({
  isOpen,
  milestone,
  onClose,
  onAction
}) => {
  const { t, isRTL } = useLanguage();

  if (!isOpen || !milestone) return null;

  const isUpgradePrompt = milestone.ctaUrl?.includes('pricing');
  const isCelebration = milestone.message.includes('🎉') || milestone.id.includes('first_');

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
        <div className={`absolute top-0 left-0 right-0 h-32 ${
          isCelebration 
            ? 'bg-gradient-to-br from-green-500/20 via-emerald-500/10 to-teal-500/10' 
            : 'bg-gradient-to-br from-[#00e5ff]/20 via-blue-500/10 to-purple-500/10'
        }`} />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors z-10"
        >
          <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
        </button>

        {/* Content */}
        <div className="relative p-8 pt-12 text-center">
          {/* Icon */}
          <div className={`w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center ${
            isCelebration 
              ? 'bg-green-500/20 border-2 border-green-500/30' 
              : 'bg-[#00e5ff]/20 border-2 border-[#00e5ff]/30'
          }`}>
            {isCelebration ? (
              <Trophy className="w-10 h-10 text-green-500" />
            ) : (
              <Sparkles className="w-10 h-10 text-[#00e5ff]" />
            )}
          </div>

          {/* Title */}
          <h2 className="text-xl font-black mb-3 text-slate-900 dark:text-white">
            {isCelebration ? t('milestones.congratulations') : t('milestones.headsUp')}
          </h2>

          {/* Message */}
          <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
            {milestone.message}
          </p>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={onAction}
              className={`w-full py-3 px-6 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                isUpgradePrompt
                  ? 'bg-gradient-to-r from-[#00e5ff] to-blue-500 text-black hover:opacity-90'
                  : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {milestone.ctaText}
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

export default MilestoneModal;

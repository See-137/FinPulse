import React from 'react';
import { Check, Loader2, ExternalLink, Crown, Rocket, Zap } from 'lucide-react';
import { PlanType } from '../types';
import { SaaS_PLANS } from '../constants';
import { useLanguage } from '../i18n';

interface PricingCardProps {
  planKey: PlanType;
  plan: typeof SaaS_PLANS.FREE;
  isCurrentPlan: boolean;
  isUpgrade: boolean;
  isDowngrade: boolean;
  loading: PlanType | null;
  onUpgrade: (plan: PlanType) => void;
  onManageSubscription: () => void;
}

const planIcons: Record<PlanType, React.ReactNode> = {
  FREE: <Zap className="w-6 h-6" />,
  PROPULSE: <Crown className="w-6 h-6" />,
  SUPERPULSE: <Rocket className="w-6 h-6" />
};

const planColors: Record<PlanType, string> = {
  FREE: 'from-slate-500 to-slate-600',
  PROPULSE: 'from-cyan-500 to-blue-500',
  SUPERPULSE: 'from-purple-500 to-pink-500'
};

const planBorderColors: Record<PlanType, string> = {
  FREE: 'border-slate-500/30',
  PROPULSE: 'border-cyan-500/50',
  SUPERPULSE: 'border-purple-500/50'
};

/**
 * PricingCard Component
 * Individual pricing plan card showing features and upgrade/downgrade options
 * Extracted from PricingModal for better component modularity
 */
export const PricingCard: React.FC<PricingCardProps> = ({
  planKey,
  plan,
  isCurrentPlan,
  isUpgrade,
  isDowngrade,
  loading,
  onUpgrade,
  onManageSubscription,
}) => {
  const { t } = useLanguage();

  return (
    <div
      className={`relative rounded-2xl p-6 transition-all duration-300 ${
        isCurrentPlan 
          ? `bg-gradient-to-br ${planColors[planKey]} bg-opacity-10 border-2 ${planBorderColors[planKey]}` 
          : 'bg-white/5 border border-white/10 hover:border-white/20'
      }`}
    >
      {/* Popular Badge */}
      {planKey === 'PROPULSE' && !isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-bold px-4 py-1 rounded-full">
            {t('pricing.popular')}
          </span>
        </div>
      )}

      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-white text-[#0f1318] text-xs font-bold px-4 py-1 rounded-full">
            {t('pricing.currentPlan')}
          </span>
        </div>
      )}

      {/* Plan Icon */}
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${planColors[planKey]} flex items-center justify-center text-white mb-4`}>
        {planIcons[planKey]}
      </div>

      {/* Plan Name & Price */}
      <h3 className="text-xl font-bold text-white">{plan.name}</h3>
      <div className="flex items-baseline gap-1 mt-2">
        <span className="text-4xl font-black text-white">${plan.price}</span>
        <span className="text-slate-400">{t('pricing.perMonth')}</span>
      </div>

      {/* Description */}
      <p className="text-slate-400 text-sm mt-3">{plan.description}</p>

      {/* CTA Button */}
      <button
        onClick={() => {
          if (isCurrentPlan) {
            onManageSubscription();
          } else {
            onUpgrade(planKey);
          }
        }}
        disabled={loading === planKey || (!isUpgrade && !isDowngrade && !isCurrentPlan && planKey !== 'FREE')}
        className={`w-full mt-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
          isCurrentPlan
            ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
            : isUpgrade
            ? `bg-gradient-to-r ${planColors[planKey]} text-white hover:shadow-lg`
            : isDowngrade
            ? 'bg-white/10 hover:bg-white/20 text-slate-300'
            : 'bg-white/5 text-slate-400 cursor-not-allowed'
        }`}
      >
        {loading === planKey ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('pricing.processing')}
          </>
        ) : isCurrentPlan ? (
          <>
            <ExternalLink className="w-4 h-4" />
            {t('pricing.manageBilling')}
          </>
        ) : isUpgrade ? (
          t('pricing.upgrade')
        ) : isDowngrade ? (
          t('pricing.downgrade')
        ) : (
          t('pricing.currentPlan')
        )}
      </button>

      {/* Features List */}
      <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
        {plan.features.map((feature, idx) => (
          <div key={idx} className="flex items-start gap-3">
            <Check className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-slate-300">{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Check, Crown, Rocket, Zap, X, Loader2, ExternalLink, CreditCard } from 'lucide-react';
import { User, PlanType } from '../types';
import { SaaS_PLANS } from '../constants';
import { redirectToCheckout, redirectToCustomerPortal } from '../services/stripeService';
import { useLanguage } from '../i18n';

interface PricingModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onPlanChange: (plan: PlanType) => void;
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

export const PricingModal: React.FC<PricingModalProps> = ({ 
  user, 
  isOpen, 
  onClose,
  onPlanChange 
}) => {
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState<PlanType | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (plan: PlanType) => {
    if (plan === 'FREE') {
      // Downgrade handled differently
      return;
    }
    
    if (plan === user.plan) {
      return;
    }

    setLoading(plan);
    setError(null);

    try {
      await redirectToCheckout(user.id, user.email, plan as Exclude<PlanType, 'FREE'>);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setLoading(user.plan);
    setError(null);
    
    try {
      await redirectToCustomerPortal(user.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open billing portal.');
      setLoading(null);
    }
  };

  if (!isOpen) return null;

  const plans = Object.entries(SaaS_PLANS) as [PlanType, typeof SaaS_PLANS.FREE][];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className={`bg-[#0f1318] rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl ${isRTL ? 'rtl' : 'ltr'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#0f1318]/95 backdrop-blur-xl p-6 border-b border-white/5 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-black text-white">{t('pricing.title')}</h2>
            <p className="text-slate-400 text-sm mt-1">{t('pricing.subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Plans Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(([planKey, plan]) => {
            const isCurrentPlan = user.plan === planKey;
            const isUpgrade = planKey !== 'FREE' && 
              (user.plan === 'FREE' || (user.plan === 'PROPULSE' && planKey === 'SUPERPULSE'));
            const isDowngrade = (user.plan === 'PROPULSE' && planKey === 'FREE') ||
              (user.plan === 'SUPERPULSE' && (planKey === 'FREE' || planKey === 'PROPULSE'));
            
            return (
              <div
                key={planKey}
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
                  <span className="text-4xl font-black text-white">{plan.price}</span>
                  {planKey !== 'FREE' && (
                    <span className="text-slate-400 text-sm">/{t('pricing.month')}</span>
                  )}
                </div>

                {/* Limits */}
                <div className="mt-4 space-y-2 text-sm text-slate-400">
                  <div className="flex justify-between">
                    <span>{t('pricing.assets')}</span>
                    <span className="text-white font-bold">{plan.maxAssets}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('pricing.aiQueries')}</span>
                    <span className="text-white font-bold">{plan.maxAiQueries}/{t('pricing.day')}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm text-slate-300">
                      <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${planColors[planKey]} flex items-center justify-center flex-shrink-0`}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                <div className="mt-6">
                  {isCurrentPlan ? (
                    <button
                      onClick={handleManageSubscription}
                      disabled={loading === planKey || planKey === 'FREE'}
                      className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2
                        ${planKey === 'FREE' 
                          ? 'bg-white/5 text-slate-500 cursor-not-allowed' 
                          : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                    >
                      {loading === planKey ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : planKey === 'FREE' ? (
                        t('pricing.freeForever')
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4" />
                          {t('pricing.manageBilling')}
                        </>
                      )}
                    </button>
                  ) : isUpgrade ? (
                    <button
                      onClick={() => handleUpgrade(planKey)}
                      disabled={loading !== null}
                      className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all bg-gradient-to-r ${planColors[planKey]} text-white hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2`}
                    >
                      {loading === planKey ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4" />
                          {t('pricing.upgrade')}
                        </>
                      )}
                    </button>
                  ) : isDowngrade ? (
                    <button
                      onClick={handleManageSubscription}
                      disabled={loading !== null}
                      className="w-full py-3 px-4 rounded-xl font-bold text-sm transition-all bg-white/5 text-slate-400 hover:bg-white/10 flex items-center justify-center gap-2"
                    >
                      {loading === planKey ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        t('pricing.downgrade')
                      )}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 text-center">
          <p className="text-slate-500 text-sm">
            {t('pricing.securePayment')} <span className="text-cyan-400">Stripe</span>
          </p>
          <p className="text-slate-600 text-xs mt-2">
            {t('pricing.cancelAnytime')}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingModal;

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { User, PlanType } from '../types';
import { SaaS_PLANS } from '../constants';
import { createCheckoutSession, redirectToCustomerPortal } from '../services/lemonSqueezyService';
import { useLanguage } from '../i18n';
import { PricingCard } from './PricingCard';

interface PricingModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onPlanChange: (plan: PlanType) => void;
}

/**
 * PricingModal Component
 * Displays pricing tiers with upgrade/downgrade options
 * Uses PricingCard component for individual plan rendering
 */
export const PricingModal: React.FC<PricingModalProps> = ({
  user,
  isOpen,
  onClose,
  onPlanChange
}) => {
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState<PlanType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [_isDemoMode, setIsDemoMode] = useState(false);

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
      const { url } = await createCheckoutSession(user.id, user.email, plan as Exclude<PlanType, 'FREE'>);
      
      // Check if it's a demo URL (doesn't contain stripe.com)
      if (url.includes('demo_upgrade') || url.includes('demo_')) {
        setIsDemoMode(true);
        // In demo mode, immediately apply the plan change
        onPlanChange(plan);
        setLoading(null);
        // Show success message
        setError(null);
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
          window.location.href = url; // Navigate to show success
        }, 500);
      } else {
        // Real Stripe checkout
        window.location.href = url;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Payment failed. Please try again.';
      console.error('Upgrade error:', err);
      setError(errorMsg);
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
              <PricingCard
                key={planKey}
                planKey={planKey}
                plan={plan}
                isCurrentPlan={isCurrentPlan}
                isUpgrade={isUpgrade}
                isDowngrade={isDowngrade}
                loading={loading}
                onUpgrade={handleUpgrade}
                onManageSubscription={handleManageSubscription}
              />
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

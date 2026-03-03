/**
 * Subscription Status Banner
 * Shows warning/info banners for past_due or cancelled subscriptions.
 * Non-dismissible — resolves when subscription status changes.
 */

import React from 'react';
import { AlertTriangle, Info, ChevronRight } from 'lucide-react';
import { User } from '../types';
import { useLanguage } from '../i18n';
import { redirectToCustomerPortal } from '../services/lemonSqueezyService';

interface SubscriptionBannerProps {
  user: User;
}

export const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({ user }) => {
  const { t } = useLanguage();

  if (user.subscriptionStatus !== 'past_due' && user.subscriptionStatus !== 'cancelled') {
    return null;
  }

  const isPastDue = user.subscriptionStatus === 'past_due';

  const handleClick = async () => {
    try {
      await redirectToCustomerPortal(user.id);
    } catch {
      // Portal redirect failed — user can try again
    }
  };

  return (
    <div
      className={`w-full ${
        isPastDue
          ? 'bg-red-500/10 dark:bg-red-500/20 border-b border-red-500/20'
          : 'bg-yellow-500/10 dark:bg-yellow-500/20 border-b border-yellow-500/20'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="shrink-0">
            {isPastDue ? (
              <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            ) : (
              <Info className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            )}
          </span>
          <p
            className={`text-sm font-medium truncate ${
              isPastDue
                ? 'text-red-700 dark:text-red-300'
                : 'text-yellow-700 dark:text-yellow-300'
            }`}
          >
            {isPastDue ? t('subscription.pastDue') : t('subscription.cancelled')}
          </p>
        </div>

        <button
          onClick={handleClick}
          className={`${
            isPastDue
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-yellow-500 hover:bg-yellow-600'
          } text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors shrink-0`}
        >
          {isPastDue ? t('subscription.updatePayment') : t('subscription.resubscribe')}
          <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default SubscriptionBanner;

/**
 * FinPulse V2: Top Banner Announcements Component
 * Dismissible time-sensitive announcements with CTA
 */

import React, { useState, useEffect } from 'react';
import { X, ChevronRight, Info, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { BannerAnnouncement, NOTIFICATION_STORAGE_KEYS } from '../types/notifications';
import { PlanType } from '../types';
import { componentLogger } from '../services/logger';

interface BannerAnnouncementProps {
  userPlan: PlanType;
  onNavigate?: (url: string) => void;
}

const VARIANT_STYLES = {
  info: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    border: 'border-blue-500/20',
    text: 'text-blue-700 dark:text-blue-300',
    icon: <Info className="w-4 h-4" />,
    button: 'bg-blue-500 hover:bg-blue-600'
  },
  success: {
    bg: 'bg-green-500/10 dark:bg-green-500/20',
    border: 'border-green-500/20',
    text: 'text-green-700 dark:text-green-300',
    icon: <CheckCircle className="w-4 h-4" />,
    button: 'bg-green-500 hover:bg-green-600'
  },
  warning: {
    bg: 'bg-yellow-500/10 dark:bg-yellow-500/20',
    border: 'border-yellow-500/20',
    text: 'text-yellow-700 dark:text-yellow-300',
    icon: <AlertTriangle className="w-4 h-4" />,
    button: 'bg-yellow-500 hover:bg-yellow-600'
  },
  error: {
    bg: 'bg-red-500/10 dark:bg-red-500/20',
    border: 'border-red-500/20',
    text: 'text-red-700 dark:text-red-300',
    icon: <AlertCircle className="w-4 h-4" />,
    button: 'bg-red-500 hover:bg-red-600'
  }
};

export const TopBanner: React.FC<BannerAnnouncementProps> = ({ userPlan, onNavigate }) => {
  const [activeBanner, setActiveBanner] = useState<BannerAnnouncement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const loadBanners = async () => {
      try {
        const response = await fetch('/banners.json');
        const data = await response.json();
        const banners = data.banners as BannerAnnouncement[];

        // Get dismissed banners from localStorage
        const dismissedBanners = JSON.parse(
          localStorage.getItem(NOTIFICATION_STORAGE_KEYS.DISMISSED_BANNERS) || '[]'
        );

        const now = new Date();

        // Filter and sort banners
        const eligibleBanners = banners
          .filter(banner => {
            // Not dismissed
            if (dismissedBanners.includes(banner.id)) return false;
            
            // Within date range
            const startDate = new Date(banner.startDate);
            const endDate = new Date(banner.endDate);
            if (now < startDate || now > endDate) return false;
            
            // Plan filter (null means all plans)
            if (banner.targetPlans && !banner.targetPlans.includes(userPlan)) return false;
            
            return true;
          })
          .sort((a, b) => b.priority - a.priority);

        // Show highest priority banner
        if (eligibleBanners.length > 0) {
          setActiveBanner(eligibleBanners[0]);
          // Small delay for animation
          setTimeout(() => setIsVisible(true), 100);
        }
      } catch (error) {
        componentLogger.error('Failed to load banners:', error);
      }
    };

    loadBanners();
  }, [userPlan]);

  const dismissBanner = () => {
    if (!activeBanner) return;

    // Save to localStorage
    const dismissedBanners = JSON.parse(
      localStorage.getItem(NOTIFICATION_STORAGE_KEYS.DISMISSED_BANNERS) || '[]'
    );
    dismissedBanners.push(activeBanner.id);
    localStorage.setItem(NOTIFICATION_STORAGE_KEYS.DISMISSED_BANNERS, JSON.stringify(dismissedBanners));

    // Animate out
    setIsVisible(false);
    setTimeout(() => setActiveBanner(null), 300);
  };

  const handleCtaClick = () => {
    if (activeBanner?.ctaUrl && onNavigate) {
      onNavigate(activeBanner.ctaUrl);
    }
    dismissBanner();
  };

  if (!activeBanner) return null;

  const styles = VARIANT_STYLES[activeBanner.variant];

  return (
    <div 
      className={`w-full transition-all duration-300 ${
        isVisible 
          ? 'max-h-20 opacity-100 translate-y-0' 
          : 'max-h-0 opacity-0 -translate-y-full'
      } overflow-hidden`}
    >
      <div className={`${styles.bg} ${styles.text} border-b ${styles.border}`}>
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="shrink-0">{styles.icon}</span>
            <p className="text-sm font-medium truncate">
              {activeBanner.message}
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            {activeBanner.ctaText && (
              <button
                onClick={handleCtaClick}
                className={`${styles.button} text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors`}
              >
                {activeBanner.ctaText}
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={dismissBanner}
              className="p-1.5 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBanner;

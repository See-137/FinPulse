/**
 * FinPulse V2: Milestone Service
 * Tracks user behavior and triggers upgrade prompts at strategic moments
 */

import { User } from '../types';
import { Milestone, UserStats, NOTIFICATION_STORAGE_KEYS } from '../types/notifications';
import { SaaS_PLANS } from '../constants';

// Milestone definitions with triggers
export const MILESTONES: Milestone[] = [
  {
    id: 'asset_limit_warning',
    trigger: (user, stats) => {
      const maxAssets = SaaS_PLANS[user.plan].maxAssets;
      return user.plan === 'FREE' && stats.assetsCount >= maxAssets - 2;
    },
    message: "You're running low on asset slots! Upgrade to track more investments.",
    ctaText: 'Upgrade Now',
    ctaUrl: '#pricing',
    showOnce: false // Can show multiple times
  },
  {
    id: 'asset_limit_reached',
    trigger: (user, stats) => {
      const maxAssets = SaaS_PLANS[user.plan].maxAssets;
      return stats.assetsCount >= maxAssets;
    },
    message: "You've reached your asset limit! Upgrade to unlock more slots.",
    ctaText: 'Unlock More Assets',
    ctaUrl: '#pricing',
    showOnce: true
  },
  {
    id: 'ai_queries_low',
    trigger: (user) => {
      const maxQueries = SaaS_PLANS[user.plan].maxAiQueries;
      return user.credits.ai >= maxQueries - 1 && user.plan === 'FREE';
    },
    message: "You're almost out of AI queries! Upgrade for more insights.",
    ctaText: 'Get More AI',
    ctaUrl: '#pricing',
    showOnce: false
  },
  {
    id: 'ai_queries_exhausted',
    trigger: (user) => {
      const maxQueries = SaaS_PLANS[user.plan].maxAiQueries;
      return user.credits.ai >= maxQueries;
    },
    message: "You've used all your AI queries for today. Upgrade for unlimited insights!",
    ctaText: 'Unlock AI',
    ctaUrl: '#pricing',
    showOnce: false // Can trigger daily
  },
  {
    id: 'portfolio_growing',
    trigger: (user, stats) => {
      return stats.portfolioValue > 10000 && user.plan === 'FREE';
    },
    message: "Your portfolio is growing! Get advanced analytics with ProPulse.",
    ctaText: 'See Analytics',
    ctaUrl: '#pricing',
    showOnce: true
  },
  {
    id: 'active_user_7days',
    trigger: (user, stats) => {
      return stats.daysActive >= 7 && user.plan === 'FREE';
    },
    message: "You've been tracking for a week! Here's 20% off ProPulse as a thank you.",
    ctaText: 'Claim Offer',
    ctaUrl: '#pricing?promo=loyal20',
    showOnce: true
  },
  {
    id: 'first_asset_added',
    trigger: (_user, stats) => {
      return stats.assetsCount === 1;
    },
    message: "🎉 Great job! You added your first asset. Keep building your portfolio!",
    ctaText: 'Add More',
    showOnce: true
  },
  {
    id: 'community_engagement',
    trigger: (user, stats) => {
      return stats.daysActive >= 3 && user.plan === 'FREE';
    },
    message: "Have you checked the Community? See what other investors are tracking!",
    ctaText: 'Explore',
    ctaUrl: '#community',
    showOnce: true
  }
];

export interface MilestoneResult {
  milestone: Milestone;
  shouldShow: boolean;
}

class MilestoneService {
  private completedMilestones: Set<string>;
  private sessionShownMilestones: Set<string>; // Track what's shown this session

  constructor() {
    const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEYS.COMPLETED_MILESTONES);
    this.completedMilestones = new Set(stored ? JSON.parse(stored) : []);
    this.sessionShownMilestones = new Set();
  }

  /**
   * Get user stats for milestone evaluation
   */
  getUserStats(user: User, portfolioValue: number = 0): UserStats {
    const signupDate = localStorage.getItem(NOTIFICATION_STORAGE_KEYS.USER_SIGNUP_DATE) || new Date().toISOString();
    const daysActive = Math.floor(
      (Date.now() - new Date(signupDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      assetsCount: user.credits.assets,
      aiQueriesUsed: user.credits.ai,
      portfolioValue,
      daysActive,
      signupDate
    };
  }

  /**
   * Check all milestones and return the first one that should trigger
   */
  checkMilestones(user: User, stats: UserStats): MilestoneResult | null {
    for (const milestone of MILESTONES) {
      // Skip if already completed and showOnce = true
      if (milestone.showOnce && this.completedMilestones.has(milestone.id)) {
        continue;
      }

      // Skip if already shown this session (prevent spam)
      if (this.sessionShownMilestones.has(milestone.id)) {
        continue;
      }

      // Check trigger condition
      try {
        if (milestone.trigger(user, stats)) {
          return { milestone, shouldShow: true };
        }
      } catch (error) {
        console.error(`Milestone ${milestone.id} trigger error:`, error);
      }
    }

    return null;
  }

  /**
   * Mark a milestone as shown/completed
   */
  markCompleted(milestoneId: string): void {
    this.completedMilestones.add(milestoneId);
    this.sessionShownMilestones.add(milestoneId);
    
    localStorage.setItem(
      NOTIFICATION_STORAGE_KEYS.COMPLETED_MILESTONES,
      JSON.stringify([...this.completedMilestones])
    );
  }

  /**
   * Check if a milestone was completed
   */
  isCompleted(milestoneId: string): boolean {
    return this.completedMilestones.has(milestoneId);
  }

  /**
   * Reset milestones (for testing)
   */
  reset(): void {
    this.completedMilestones.clear();
    this.sessionShownMilestones.clear();
    localStorage.removeItem(NOTIFICATION_STORAGE_KEYS.COMPLETED_MILESTONES);
  }
}

// Singleton instance
export const milestoneService = new MilestoneService();

export default MilestoneService;

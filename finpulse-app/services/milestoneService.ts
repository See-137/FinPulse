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
  },
  // Login streak milestones
  {
    id: 'login_streak_3',
    trigger: (_user, stats) => stats.loginStreak >= 3,
    message: "🎉 3-day streak! You're building a great habit. Keep tracking your portfolio daily!",
    ctaText: 'Keep Going',
    showOnce: true,
  },
  {
    id: 'login_streak_7',
    trigger: (_user, stats) => stats.loginStreak >= 7,
    message: "🎉 7-day streak! A full week of tracking. You're a disciplined investor!",
    ctaText: 'View Portfolio',
    showOnce: true,
  },
  {
    id: 'login_streak_14',
    trigger: (_user, stats) => stats.loginStreak >= 14,
    message: "🎉 14-day streak! Two weeks of consistency. ProPulse users get even more insights!",
    ctaText: 'See ProPulse',
    ctaUrl: '#pricing',
    showOnce: true,
  }
];

// ---- Login Streak Tracking ----

/**
 * Record a login for today. Maintains an array of ISO date strings.
 * Keeps only the last 30 days to bound storage.
 */
export function recordLoginDate(): void {
  const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
  const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEYS.LOGIN_DATES);
  const dates: string[] = stored ? JSON.parse(stored) : [];

  if (dates.length > 0 && dates[dates.length - 1] === today) return; // Already recorded

  dates.push(today);
  // Keep only last 30 dates
  const trimmed = dates.slice(-30);
  localStorage.setItem(NOTIFICATION_STORAGE_KEYS.LOGIN_DATES, JSON.stringify(trimmed));
}

/**
 * Calculate current login streak (consecutive days ending today or yesterday).
 */
export function getLoginStreak(): number {
  const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEYS.LOGIN_DATES);
  if (!stored) return 0;

  const dates: string[] = JSON.parse(stored);
  if (dates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  const checkDate = new Date(today);

  for (let i = dates.length - 1; i >= 0; i--) {
    const loginDate = new Date(dates[i] + 'T00:00:00');
    const diff = Math.round((checkDate.getTime() - loginDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diff === 0) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

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
      signupDate,
      loginStreak: getLoginStreak(),
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

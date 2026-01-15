/**
 * FinPulse V2: Notifications & Onboarding Types
 * Based on Technical Architecture Specification v2.0
 */

import { PlanType, User } from '../types';

// ========================================
// NOTIFICATION TYPES
// ========================================

export interface Notification {
  id: string;
  type: 'feature' | 'maintenance' | 'offer' | 'announcement';
  title: string;
  description: string;
  timestamp: string;  // ISO date
  isRead: boolean;
  ctaText?: string;
  ctaUrl?: string;
  targetPlans?: PlanType[];
  expiresAt?: string;
}

export interface ChangelogEntry {
  version: string;           // "2.1.0"
  releaseDate: string;       // ISO date
  features: string[];        // ["New AI copilot features", "Faster portfolio sync"]
  bugFixes?: string[];
  improvements?: string[];
}

export interface BannerAnnouncement {
  id: string;               // "banner_asset_selector_launch"
  message: string;
  variant: 'info' | 'success' | 'warning' | 'error';
  ctaText?: string;
  ctaUrl?: string;
  targetPlans?: PlanType[];
  startDate: string;        // ISO date - when to start showing
  endDate: string;          // ISO date - when to auto-hide
  priority: number;         // Higher = shows first (if multiple)
}

// ========================================
// ONBOARDING TYPES
// ========================================

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  locked?: boolean;
  unlockPlan?: PlanType;
}

export interface Milestone {
  id: string;
  trigger: (user: User, stats: UserStats) => boolean;
  message: string;
  ctaText: string;
  ctaUrl?: string;
  ctaAction?: () => void;
  showOnce: boolean;  // Only trigger once
}

export interface UserStats {
  assetsCount: number;
  aiQueriesUsed: number;
  portfolioValue: number;
  daysActive: number;
  signupDate: string;
}

// ========================================
// PROGRESSIVE DISCLOSURE TYPES
// ========================================

export interface ProgressiveFeature {
  id: string;
  showAfterDays: number;
  type: 'tooltip' | 'badge' | 'panel' | 'banner';
  target?: string;
  title: string;
  description: string;
  ctaText?: string;
  ctaUrl?: string;
  dismissible: boolean;
  condition?: (user: User) => boolean;
}

// ========================================
// STORAGE KEYS
// ========================================

export const NOTIFICATION_STORAGE_KEYS = {
  LAST_SEEN_CHANGELOG: 'finpulse_last_seen_changelog_version',
  ONBOARDING_COMPLETED: 'finpulse_onboarding_completed',
  DISMISSED_BANNERS: 'finpulse_dismissed_banners',
  COMPLETED_MILESTONES: 'finpulse_completed_milestones',
  DISMISSED_PROGRESSIVE: 'finpulse_dismissed_progressive_features',
  USER_SIGNUP_DATE: 'finpulse_user_signup_date',
  READ_NOTIFICATIONS: 'finpulse_read_notifications',
} as const;

// ========================================
// PLAN FEATURE MATRIX
// ========================================

export const PLAN_FEATURES = {
  FREE: {
    maxAssets: 8,
    maxAiQueries: 5,
    refreshRate: 60,
    features: ['stocks', 'crypto', 'basic_news', 'community'],
    locked: ['advanced_charts', 'csv_exports', 'commodities', 'ad_free']
  },
  PROPULSE: {
    maxAssets: 20,
    maxAiQueries: 10,
    refreshRate: 30,
    features: ['stocks', 'crypto', 'commodities', 'advanced_news', 'community', 'csv_exports', 'advanced_charts'],
    locked: ['api_access', 'white_label', 'priority_support']
  },
  SUPERPULSE: {
    maxAssets: 50,
    maxAiQueries: 50,
    refreshRate: 30,
    features: ['stocks', 'crypto', 'commodities', 'advanced_news', 'community', 'csv_exports', 'advanced_charts', 'api_access', 'priority_support', 'ad_free'],
    locked: ['white_label', 'team_workspaces']
  }
} as const;

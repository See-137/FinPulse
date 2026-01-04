import { INFLUENCER_LIST, getInfluencersByPlan } from '../constants';
import { PlanType, Influencer } from '../types';

/**
 * Influencer Service - Handles X.com influencer tracking with plan-based gating
 * FREE: 5 influencers | PROPULSE: 15 influencers | SUPERPULSE: 30 influencers
 */

export const influencerService = {
  /**
   * Get influencers accessible to user based on their plan
   */
  getAccessibleInfluencers(plan: PlanType): Influencer[] {
    return getInfluencersByPlan(plan);
  },

  /**
   * Get influencer count limits by plan
   */
  getInfluencerLimits(): Record<PlanType, number> {
    return {
      FREE: 5,
      PROPULSE: 15,
      SUPERPULSE: 30,
    };
  },

  /**
   * Check if user has access to a specific influencer
   */
  hasAccessToInfluencer(influencerUsername: string, userPlan: PlanType): boolean {
    const accessible = this.getAccessibleInfluencers(userPlan);
    return accessible.some(inf => inf.username === influencerUsername);
  },

  /**
   * Get upgrade suggestion - next tier to unlock more influencers
   */
  getUpgradeSuggestion(currentPlan: PlanType): { nextPlan: PlanType; additionalInfluencers: number } | null {
    const limits = this.getInfluencerLimits();
    
    if (currentPlan === 'FREE') {
      return {
        nextPlan: 'PROPULSE',
        additionalInfluencers: limits.PROPULSE - limits.FREE, // 10 more
      };
    }
    
    if (currentPlan === 'PROPULSE') {
      return {
        nextPlan: 'SUPERPULSE',
        additionalInfluencers: limits.SUPERPULSE - limits.PROPULSE, // 15 more
      };
    }
    
    // Already on SUPERPULSE
    return null;
  },

  /**
   * Group influencers by focus area
   */
  groupByFocus(influencers: Influencer[]): Record<string, Influencer[]> {
    return influencers.reduce((acc, inf) => {
      if (!acc[inf.focus]) {
        acc[inf.focus] = [];
      }
      acc[inf.focus].push(inf);
      return acc;
    }, {} as Record<string, Influencer[]>);
  },

  /**
   * Build Twitter search query for influencer
   * Returns URL for embedding or API query
   */
  buildTwitterQuery(influencerUsername: string): string {
    return `from:${influencerUsername}`;
  },

  /**
   * Get influencer by username
   */
  getInfluencer(username: string): Influencer | undefined {
    return INFLUENCER_LIST.find(inf => inf.username === username);
  },

  /**
   * Get all influencers in a specific tier
   */
  getInfluencersByTier(tier: PlanType): Influencer[] {
    return INFLUENCER_LIST.filter(inf => inf.tier === tier);
  },
};

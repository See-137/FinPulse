import { INFLUENCER_LIST, getInfluencersByPlan } from '../constants';
import { PlanType, Influencer } from '../types';

/**
 * Influencer Service - Handles X.com influencer tracking with plan-based gating
 * FREE: 5 influencers | PROPULSE: 15 influencers | SUPERPULSE: 30 influencers
 */

// Focus area categories for better organization
export const FOCUS_CATEGORIES = {
  'Leaders': ['BTC/DOGE', 'BTC', 'ETH', 'Binance/BNB', 'Coinbase'],
  'Analysts': ['On-chain', 'Analytics', 'Data', 'TA', 'S2F model'],
  'Traders': ['Trading', 'Whales', 'Sentiment', 'Inverse signal'],
  'Macro': ['Macro', 'Crypto macro', 'Tech stocks', 'Tech', 'TSLA/Tech'],
  'Research': ['Research', 'Messari', 'VC', 'DeFi', 'Galaxy'],
  'News': ['BTC news', 'Breaking'],
} as const;

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
   * Group influencers by category (broader grouping)
   */
  groupByCategory(influencers: Influencer[]): Record<string, Influencer[]> {
    const result: Record<string, Influencer[]> = {};
    
    influencers.forEach(inf => {
      let category = 'Other';
      for (const [cat, focuses] of Object.entries(FOCUS_CATEGORIES)) {
        if ((focuses as readonly string[]).includes(inf.focus)) {
          category = cat;
          break;
        }
      }
      if (!result[category]) {
        result[category] = [];
      }
      result[category].push(inf);
    });
    
    return result;
  },

  /**
   * Build Twitter/X.com URL for influencer
   */
  getTwitterUrl(influencerUsername: string): string {
    return `https://x.com/${influencerUsername}`;
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

  /**
   * Get locked influencers for a user (ones they can't access)
   */
  getLockedInfluencers(userPlan: PlanType): Influencer[] {
    const accessible = this.getAccessibleInfluencers(userPlan);
    return INFLUENCER_LIST.filter(inf => !accessible.some(a => a.username === inf.username));
  },

  /**
   * Search influencers by name, username, or focus
   */
  searchInfluencers(query: string, influencers?: Influencer[]): Influencer[] {
    const list = influencers || INFLUENCER_LIST;
    const searchTerm = query.toLowerCase().trim();
    
    if (!searchTerm) return list;
    
    return list.filter(inf =>
      inf.name.toLowerCase().includes(searchTerm) ||
      inf.username.toLowerCase().includes(searchTerm) ||
      inf.focus.toLowerCase().includes(searchTerm) ||
      (inf.bio?.toLowerCase().includes(searchTerm))
    );
  },

  /**
   * Get unique focus areas from a list of influencers
   */
  getUniqueFocusAreas(influencers: Influencer[]): string[] {
    return Array.from(new Set(influencers.map(inf => inf.focus)));
  },

  /**
   * Get stats about influencer access
   */
  getAccessStats(userPlan: PlanType): {
    accessible: number;
    locked: number;
    total: number;
    percentUnlocked: number;
  } {
    const accessible = this.getAccessibleInfluencers(userPlan).length;
    const total = INFLUENCER_LIST.length;
    return {
      accessible,
      locked: total - accessible,
      total,
      percentUnlocked: Math.round((accessible / total) * 100),
    };
  },
};

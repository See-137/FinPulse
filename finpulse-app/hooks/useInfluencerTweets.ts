import { useState, useEffect, useCallback, useMemo } from 'react';
import { getTwitterClient, buildInfluencerQuery } from '../services/dataProviders/twitterAPI';
import { influencerService } from '../services/influencerService';
import type { TweetData, PlanType } from '../types';

// Symbol keywords for broader matching (same as NewsSidebar)
const SYMBOL_KEYWORDS: Record<string, string[]> = {
  'BTC': ['bitcoin', 'btc'],
  'ETH': ['ethereum', 'eth'],
  'SOL': ['solana', 'sol'],
  'NVDA': ['nvidia', 'nvda'],
  'MSTR': ['microstrategy', 'mstr'],
  'AAPL': ['apple', 'aapl'],
  'MSFT': ['microsoft', 'msft'],
  'GOOGL': ['google', 'alphabet', 'googl'],
  'TSLA': ['tesla', 'tsla'],
  'PLTR': ['palantir', 'pltr'],
  'DOGE': ['dogecoin', 'doge'],
  'BNB': ['binance', 'bnb'],
  'XRP': ['ripple', 'xrp'],
  'ADA': ['cardano', 'ada'],
  'AVAX': ['avalanche', 'avax'],
  'DOT': ['polkadot', 'dot'],
  'MATIC': ['polygon', 'matic'],
};

// Mock tweets for demo mode (when Twitter API is not configured)
const MOCK_TWEETS: TweetData[] = [
  {
    id: 'mock-1',
    authorUsername: 'elonmusk',
    text: 'Bitcoin is the future of money. The legacy financial system is slowly waking up to this reality. $BTC',
    createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
    metrics: { likes: 125000, retweets: 28000, replies: 15000, views: 8500000 },
    mentionedSymbols: ['BTC'],
  },
  {
    id: 'mock-2',
    authorUsername: 'saylor',
    text: 'MicroStrategy now holds 450,000 BTC. Digital gold is the best treasury reserve asset for corporations. The math is undeniable. #Bitcoin',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    metrics: { likes: 45000, retweets: 12000, replies: 3200, views: 2100000 },
    mentionedSymbols: ['BTC'],
  },
  {
    id: 'mock-3',
    authorUsername: 'VitalikButerin',
    text: 'The Ethereum roadmap continues to execute. Layer 2 scaling is working better than expected. $ETH ecosystem grows stronger every day.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
    metrics: { likes: 38000, retweets: 8500, replies: 2800, views: 1800000 },
    mentionedSymbols: ['ETH'],
  },
  {
    id: 'mock-4',
    authorUsername: 'CathieDWood',
    text: 'NVDA continues to lead the AI revolution. Our research shows GPU demand will accelerate through 2026. Innovation solves problems.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    metrics: { likes: 22000, retweets: 5200, replies: 1800, views: 950000 },
    mentionedSymbols: ['NVDA'],
  },
  {
    id: 'mock-5',
    authorUsername: 'cz_binance',
    text: 'Crypto adoption is happening faster in emerging markets. Building the future of finance, one block at a time. $BNB',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
    metrics: { likes: 31000, retweets: 7800, replies: 2400, views: 1400000 },
    mentionedSymbols: ['BNB'],
  },
  {
    id: 'mock-6',
    authorUsername: 'elonmusk',
    text: 'Tesla accepting Bitcoin again. The network has improved significantly on energy efficiency. $TSLA $BTC',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
    metrics: { likes: 185000, retweets: 42000, replies: 28000, views: 12000000 },
    mentionedSymbols: ['TSLA', 'BTC'],
  },
];

interface UseInfluencerTweetsOptions {
  refreshInterval?: number; // ms, default 5 minutes
  maxTweets?: number; // max tweets to return
}

interface UseInfluencerTweetsResult {
  tweets: TweetData[];
  loading: boolean;
  error: string | null;
  isDemo: boolean;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

/**
 * Hook to fetch influencer tweets filtered by user's holdings
 */
export function useInfluencerTweets(
  userPlan: PlanType | undefined,
  holdingSymbols: string[],
  options: UseInfluencerTweetsOptions = {}
): UseInfluencerTweetsResult {
  const { refreshInterval = 5 * 60 * 1000, maxTweets = 20 } = options;

  const [tweets, setTweets] = useState<TweetData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Get accessible influencers based on user plan
  const accessibleInfluencers = useMemo(() => {
    if (!userPlan) return [];
    return influencerService.getAccessibleInfluencers(userPlan);
  }, [userPlan]);

  // Build search keywords from holdings
  const searchKeywords = useMemo(() => {
    const keywords: string[] = [];
    holdingSymbols.forEach(symbol => {
      const upperSymbol = symbol.toUpperCase();
      keywords.push(`$${upperSymbol}`);
      const extraKeywords = SYMBOL_KEYWORDS[upperSymbol];
      if (extraKeywords) {
        keywords.push(...extraKeywords);
      }
    });
    return [...new Set(keywords)];
  }, [holdingSymbols]);

  const fetchTweets = useCallback(async () => {
    if (!userPlan || accessibleInfluencers.length === 0) {
      setTweets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const client = getTwitterClient();

      // Check if Twitter API is configured
      if (!client.isConfigured()) {
        // Use mock data in demo mode
        const mockFiltered = filterTweetsByHoldings(MOCK_TWEETS, holdingSymbols, accessibleInfluencers.map(i => i.username));
        setTweets(mockFiltered.slice(0, maxTweets));
        setIsDemo(true);
        setLastUpdated(new Date());
        setLoading(false);
        return;
      }

      // Build query for accessible influencers + holding keywords
      const usernames = accessibleInfluencers.map(inf => inf.username);

      // If user has no holdings, just get recent tweets from influencers
      let query: string;
      if (searchKeywords.length > 0) {
        query = buildInfluencerQuery(usernames, searchKeywords);
      } else {
        // Get all tweets from accessible influencers
        query = usernames.map(u => `from:${u}`).join(' OR ');
      }

      const results = await client.searchTweets(query, maxTweets);

      // Additional client-side filtering to ensure relevance
      const filtered = filterTweetsByHoldings(results, holdingSymbols, usernames);
      setTweets(filtered);
      setIsDemo(false);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching influencer tweets:', err);
      // Fall back to mock data on error
      const mockFiltered = filterTweetsByHoldings(MOCK_TWEETS, holdingSymbols, accessibleInfluencers.map(i => i.username));
      setTweets(mockFiltered.slice(0, maxTweets));
      setIsDemo(true);
      setError(err instanceof Error ? err.message : 'Failed to fetch tweets');
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, [userPlan, accessibleInfluencers, searchKeywords, holdingSymbols, maxTweets]);

  // Initial fetch
  useEffect(() => {
    fetchTweets();
  }, [fetchTweets]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(fetchTweets, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchTweets, refreshInterval]);

  return {
    tweets,
    loading,
    error,
    isDemo,
    refetch: fetchTweets,
    lastUpdated,
  };
}

/**
 * Filter tweets to only include those from accessible influencers
 * and optionally those mentioning user's holdings
 */
function filterTweetsByHoldings(
  tweets: TweetData[],
  holdingSymbols: string[],
  accessibleUsernames: string[]
): TweetData[] {
  // First filter by accessible influencers
  let filtered = tweets.filter(tweet =>
    accessibleUsernames.some(username =>
      username.toLowerCase() === tweet.authorUsername.toLowerCase()
    )
  );

  // If user has holdings, prioritize tweets mentioning those symbols
  if (holdingSymbols.length > 0) {
    const upperHoldings = holdingSymbols.map(s => s.toUpperCase());

    // Separate into matching and non-matching
    const matching = filtered.filter(tweet =>
      tweet.mentionedSymbols.some(symbol =>
        upperHoldings.includes(symbol.toUpperCase())
      ) ||
      // Also check tweet text for keywords
      upperHoldings.some(symbol => {
        const keywords = [symbol, ...(SYMBOL_KEYWORDS[symbol] || [])];
        return keywords.some(kw =>
          tweet.text.toLowerCase().includes(kw.toLowerCase())
        );
      })
    );

    const nonMatching = filtered.filter(tweet =>
      !matching.includes(tweet)
    );

    // Return matching tweets first, then others
    filtered = [...matching, ...nonMatching];
  }

  // Sort by date (newest first)
  return filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

import { useState, useEffect, useCallback, useMemo } from 'react';
import { influencerService } from '../services/influencerService';
import type { TweetData, PlanType } from '../types';

// Backend API endpoint for Twitter proxy
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://b3fgmin9yj.execute-api.us-east-1.amazonaws.com/prod';
const TWITTER_API_URL = `${API_BASE_URL}/twitter/tweets`;

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

// No mock data - show real tweets or proper empty state

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

  // Build search keywords from holdings (reserved for future use)
  const _searchKeywords = useMemo(() => {
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
      const usernames = accessibleInfluencers.map(inf => inf.username);

      // First try: Fetch tweets from influencers WITHOUT keyword filter
      // This ensures we get recent tweets even if they don't mention user's holdings
      const params = new URLSearchParams({
        usernames: usernames.join(','),
        keywords: '', // Empty - get all recent tweets from these users
        max_results: String(Math.max(maxTweets * 2, 50)), // Fetch more, filter client-side
      });

      const response = await fetch(`${TWITTER_API_URL}?${params}`);
      const data = await response.json();

      if (data.success && data.tweets && data.tweets.length > 0) {
        // Transform dates from strings to Date objects
        const allTweets: TweetData[] = data.tweets.map((tweet: TweetData & { createdAt: string }) => ({
          ...tweet,
          createdAt: new Date(tweet.createdAt),
        }));

        // Client-side filtering: prioritize tweets mentioning user's holdings
        const filtered = filterTweetsByHoldings(allTweets, holdingSymbols, usernames);
        setTweets(filtered.slice(0, maxTweets));
        setIsDemo(false);
        setLastUpdated(new Date());
      } else {
        // API returned no tweets - show empty state (no mock data)
        console.log('Twitter API returned no data');
        setTweets([]);
        setIsDemo(true);
        if (data.error) {
          setError(data.error);
        }
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error fetching influencer tweets:', err);
      // Show empty state with error - no mock data
      setTweets([]);
      setIsDemo(true);
      setError(err instanceof Error ? err.message : 'Failed to fetch tweets');
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }, [userPlan, accessibleInfluencers, holdingSymbols, maxTweets]);

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

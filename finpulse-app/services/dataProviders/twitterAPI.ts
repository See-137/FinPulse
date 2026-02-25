/**
 * Twitter/X API v2 Client
 *
 * Integrates with Twitter API v2 to fetch tweets from influencers
 * https://developer.twitter.com/en/docs/twitter-api
 *
 * Rate Limit: 450 requests/15min (free tier)
 */

import { throttle } from '../rateLimiter';
import { apiConfig } from '../../config/apiKeys';
import type { TweetData } from '../../types';

const TWITTER_API_BASE = 'https://api.twitter.com/2';

interface TwitterTweetResponse {
  data: {
    id: string;
    text: string;
    author_id: string;
    created_at: string;
    public_metrics: {
      retweet_count: number;
      reply_count: number;
      like_count: number;
      quote_count: number;
      impression_count?: number;
    };
  }[];
  includes?: {
    users: {
      id: string;
      username: string;
      name: string;
    }[];
  };
  meta?: {
    result_count: number;
    next_token?: string;
  };
}

/**
 * Twitter API v2 Client
 */
export class TwitterAPI {
  private bearerToken: string;

  constructor(bearerToken?: string) {
    this.bearerToken = bearerToken || apiConfig.twitter.bearerToken || '';

    if (!this.bearerToken && !import.meta.env.PROD) {
      console.log('Twitter Bearer Token not configured - using mock data'); // eslint-disable-line no-console
    }
  }

  /**
   * Check if API is configured
   */
  isConfigured(): boolean {
    return !!this.bearerToken;
  }

  /**
   * Fetch recent tweets from a user
   * @param username Twitter username (without @)
   * @param maxResults Maximum tweets to return (default: 10, max: 100)
   */
  async getUserTweets(username: string, maxResults: number = 10): Promise<TweetData[]> {
    if (!this.isConfigured()) {
      throw new Error('Twitter Bearer Token not configured');
    }

    try {
      // Step 1: Get user ID from username
      const userId = await this.getUserId(username);

      // Step 2: Get user's tweets
      const url = new URL(`${TWITTER_API_BASE}/users/${userId}/tweets`);
      url.searchParams.append('max_results', Math.min(maxResults, 100).toString());
      url.searchParams.append('tweet.fields', 'created_at,public_metrics');
      url.searchParams.append('expansions', 'author_id');
      url.searchParams.append('user.fields', 'username');

      const response = await throttle('twitter', async () => {
        const res = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${this.bearerToken}`,
          },
        });

        if (!res.ok) {
          if (res.status === 429) {
            throw new Error('Twitter rate limit exceeded');
          }
          throw new Error(`Twitter API error: ${res.status} ${res.statusText}`);
        }

        return res.json();
      });

      const data = response as TwitterTweetResponse;

      if (!data.data || data.data.length === 0) {
        return [];
      }

      return data.data.map(tweet => this.transformTweet(tweet, username));
    } catch (error) {
      console.error(`Error fetching tweets for @${username}:`, error);
      throw error;
    }
  }

  /**
   * Search recent tweets by query
   * @param query Search query (e.g., "BTC OR bitcoin")
   * @param maxResults Maximum tweets to return (default: 10, max: 100)
   */
  async searchTweets(query: string, maxResults: number = 10): Promise<TweetData[]> {
    if (!this.isConfigured()) {
      throw new Error('Twitter Bearer Token not configured');
    }

    try {
      const url = new URL(`${TWITTER_API_BASE}/tweets/search/recent`);
      url.searchParams.append('query', query);
      url.searchParams.append('max_results', Math.min(maxResults, 100).toString());
      url.searchParams.append('tweet.fields', 'created_at,public_metrics,author_id');
      url.searchParams.append('expansions', 'author_id');
      url.searchParams.append('user.fields', 'username');

      const response = await throttle('twitter', async () => {
        const res = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${this.bearerToken}`,
          },
        });

        if (!res.ok) {
          if (res.status === 429) {
            throw new Error('Twitter rate limit exceeded');
          }
          throw new Error(`Twitter API error: ${res.status} ${res.statusText}`);
        }

        return res.json();
      });

      const data = response as TwitterTweetResponse;

      if (!data.data || data.data.length === 0) {
        return [];
      }

      // Map author IDs to usernames from includes
      const userMap = new Map<string, string>();
      if (data.includes?.users) {
        for (const user of data.includes.users) {
          userMap.set(user.id, user.username);
        }
      }

      return data.data.map(tweet => {
        const username = userMap.get(tweet.author_id) || 'unknown';
        return this.transformTweet(tweet, username);
      });
    } catch (error) {
      console.error(`Error searching tweets for query "${query}":`, error);
      throw error;
    }
  }

  /**
   * Get user ID from username
   */
  private async getUserId(username: string): Promise<string> {
    const url = new URL(`${TWITTER_API_BASE}/users/by/username/${username}`);

    const response = await throttle('twitter', async () => {
      const res = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to get user ID for @${username}`);
      }

      return res.json();
    });

    return response.data.id;
  }

  /**
   * Extract mentioned symbols from tweet text
   */
  private extractSymbols(text: string): string[] {
    const symbols: string[] = [];
    const symbolPatterns = [
      /\$([A-Z]{2,5})\b/g, // $BTC format
      /\b(BTC|ETH|USDT|USDC|BNB|XRP|ADA|SOL|DOGE|MATIC|DOT|AVAX|SHIB|LTC|UNI)\b/gi, // Common symbols
    ];

    for (const pattern of symbolPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const symbol = match[1].toUpperCase();
        if (!symbols.includes(symbol)) {
          symbols.push(symbol);
        }
      }
    }

    return symbols;
  }

  /**
   * Transform Twitter API response to internal format
   */
  private transformTweet = (
    tweet: TwitterTweetResponse['data'][0],
    username: string
  ): TweetData => {
    return {
      id: tweet.id,
      authorUsername: username,
      text: tweet.text,
      createdAt: new Date(tweet.created_at),
      metrics: {
        likes: tweet.public_metrics.like_count,
        retweets: tweet.public_metrics.retweet_count,
        replies: tweet.public_metrics.reply_count,
        views: tweet.public_metrics.impression_count,
      },
      mentionedSymbols: this.extractSymbols(tweet.text),
    };
  };
}

/**
 * Build search query for multiple influencers
 * Example: "(from:elonmusk OR from:saylor) (BTC OR bitcoin)"
 */
export function buildInfluencerQuery(usernames: string[], keywords: string[]): string {
  const userPart = usernames.map(u => `from:${u}`).join(' OR ');
  const keywordPart = keywords.join(' OR ');

  return `(${userPart}) (${keywordPart})`;
}

// Singleton instance
let twitterInstance: TwitterAPI | null = null;

export function getTwitterClient(): TwitterAPI {
  if (!twitterInstance) {
    twitterInstance = new TwitterAPI();
  }
  return twitterInstance;
}

export default TwitterAPI;

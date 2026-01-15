/**
 * Sentiment Service
 *
 * Aggregates social sentiment from X/Twitter influencers and converts
 * to SentimentSignal format for the signal analysis framework.
 */

import { getTwitterClient, buildInfluencerQuery } from './dataProviders/twitterAPI';
import { getSentimentAnalyzer } from './nlp/sentimentAnalyzer';
import { cacheService, getSentimentCacheKey, getInfluencerTweetsCacheKey } from './cacheService';
import { apiConfig } from '../config/apiKeys';
import { INFLUENCERS } from '../constants';
import type {
  TweetData,
  InfluencerSentiment,
  SentimentSignal,
  SignalDirection,
  Influencer,
} from '../types';

export class SentimentService {
  /**
   * Fetch recent tweets from influencer list
   * @param symbol Asset symbol (BTC, ETH, etc.)
   * @param hours Time window in hours (default: 24)
   */
  async fetchInfluencerTweets(symbol: string, hours: number = 24): Promise<TweetData[]> {
    if (!apiConfig.features.liveSentiment || !apiConfig.twitter.enabled) {
      return this.generateMockTweets(symbol, 10);
    }

    try {
      // Build search query for symbol
      const keywords = this.getSymbolKeywords(symbol);
      const influencerUsernames = INFLUENCERS.map(inf => inf.username);

      const client = getTwitterClient();
      const query = buildInfluencerQuery(influencerUsernames, keywords);

      // Fetch tweets
      const tweets = await client.searchTweets(query, 100);

      // Filter to time window
      const cutoff = Date.now() - hours * 3600000;
      return tweets.filter(tweet => tweet.createdAt.getTime() >= cutoff);
    } catch (error) {
      console.error(`Error fetching influencer tweets for ${symbol}:`, error);
      return this.generateMockTweets(symbol, 10);
    }
  }

  /**
   * Analyze sentiment for tweets and aggregate by influencer
   */
  async analyzeInfluencerSentiment(
    tweets: TweetData[]
  ): Promise<InfluencerSentiment[]> {
    const analyzer = getSentimentAnalyzer();

    // Group tweets by influencer
    const tweetsByInfluencer = new Map<string, TweetData[]>();
    for (const tweet of tweets) {
      const existing = tweetsByInfluencer.get(tweet.authorUsername) || [];
      existing.push(tweet);
      tweetsByInfluencer.set(tweet.authorUsername, existing);
    }

    // Analyze sentiment for each influencer
    const results: InfluencerSentiment[] = [];

    for (const [username, userTweets] of tweetsByInfluencer.entries()) {
      let totalSentiment = 0;
      let totalConfidence = 0;
      let totalEngagement = 0;

      for (const tweet of userTweets) {
        const analysis = await analyzer.analyzeSentiment(tweet);

        // Weight by engagement
        const engagement = tweet.metrics.likes + tweet.metrics.retweets * 2;
        totalSentiment += analysis.sentiment * engagement;
        totalConfidence += analysis.confidence;
        totalEngagement += engagement;
      }

      // Calculate weighted average
      const avgSentiment = totalEngagement > 0 ? totalSentiment / totalEngagement : 0;
      const avgConfidence = userTweets.length > 0 ? totalConfidence / userTweets.length : 0;

      results.push({
        username,
        sentiment: avgSentiment,
        confidence: avgConfidence,
        tweets: userTweets,
        aggregatedScore: avgSentiment * avgConfidence,
      });
    }

    return results.sort((a, b) => Math.abs(b.aggregatedScore) - Math.abs(a.aggregatedScore));
  }

  /**
   * Get aggregated sentiment signal for a symbol (cached)
   */
  async getAggregatedSentiment(symbol: string, hours: number = 24): Promise<SentimentSignal> {
    // Check cache first
    const cacheKey = getSentimentCacheKey(symbol, hours);
    const cached = await cacheService.getOrSet(
      cacheKey,
      () => this.fetchAndAggregateSentiment(symbol, hours),
      apiConfig.cache.sentimentTTL
    );

    return cached;
  }

  /**
   * Fetch and aggregate sentiment from API
   */
  private async fetchAndAggregateSentiment(
    symbol: string,
    hours: number
  ): Promise<SentimentSignal> {
    try {
      // Fetch tweets
      const tweets = await this.fetchInfluencerTweets(symbol, hours);

      if (tweets.length === 0) {
        return this.generateMockSentiment(symbol);
      }

      // Analyze sentiment
      const influencerSentiments = await this.analyzeInfluencerSentiment(tweets);

      // Aggregate across all influencers (weighted by historical accuracy if available)
      let totalScore = 0;
      let totalWeight = 0;

      for (const inf of influencerSentiments) {
        const weight = inf.historicalAccuracy || 0.7; // Default 70% if no history
        totalScore += inf.aggregatedScore * weight;
        totalWeight += weight;
      }

      const avgSentiment = totalWeight > 0 ? totalScore / totalWeight : 0;

      // Determine direction
      let direction: SignalDirection = 'neutral';
      if (avgSentiment > 0.3) direction = 'bullish';
      else if (avgSentiment < -0.3) direction = 'bearish';

      // Calculate score (0-100)
      const score = Math.min(100, Math.abs(avgSentiment) * 100 + influencerSentiments.length * 2);

      // Calculate momentum (sentiment trend)
      const momentum = this.calculateMomentum(influencerSentiments);

      return {
        symbol,
        direction,
        score: Math.round(score),
        source: 'social',
        momentum,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error(`Error aggregating sentiment for ${symbol}:`, error);
      return this.generateMockSentiment(symbol);
    }
  }

  /**
   * Detect echo chamber (consensus >95%)
   */
  detectEchoChamber(sentiments: InfluencerSentiment[]): boolean {
    if (sentiments.length < 3) return false;

    const bullishCount = sentiments.filter(s => s.sentiment > 0.3).length;
    const bearishCount = sentiments.filter(s => s.sentiment < -0.3).length;

    const totalCount = sentiments.length;
    const maxConsensus = Math.max(bullishCount, bearishCount) / totalCount;

    return maxConsensus > 0.95;
  }

  /**
   * Calculate sentiment momentum (trend over time)
   */
  private calculateMomentum(sentiments: InfluencerSentiment[]): number {
    // Compare recent tweets vs older tweets
    const allTweets = sentiments.flatMap(s => s.tweets);

    if (allTweets.length < 5) return 0;

    // Sort by timestamp
    const sorted = allTweets.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    // Split into old half and new half
    const midpoint = Math.floor(sorted.length / 2);
    const oldTweets = sorted.slice(0, midpoint);
    const newTweets = sorted.slice(midpoint);

    // Calculate average sentiment for each half
    const oldAvg = oldTweets.reduce((sum, t) => sum + (t.mentionedSymbols.length > 0 ? 0.5 : 0), 0) / oldTweets.length;
    const newAvg = newTweets.reduce((sum, t) => sum + (t.mentionedSymbols.length > 0 ? 0.5 : 0), 0) / newTweets.length;

    // Momentum = change from old to new (-100 to 100)
    return (newAvg - oldAvg) * 100;
  }

  /**
   * Get symbol-specific search keywords
   */
  private getSymbolKeywords(symbol: string): string[] {
    const keywordMap: Record<string, string[]> = {
      BTC: ['BTC', 'Bitcoin', '$BTC'],
      ETH: ['ETH', 'Ethereum', '$ETH', 'ether'],
      SOL: ['SOL', 'Solana', '$SOL'],
      DOGE: ['DOGE', 'Dogecoin', '$DOGE'],
      BNB: ['BNB', 'Binance', '$BNB'],
      // Add more as needed
    };

    return keywordMap[symbol] || [symbol, `$${symbol}`];
  }

  /**
   * Generate mock sentiment for testing
   */
  private generateMockSentiment(symbol: string): SentimentSignal {
    const sentiment = (Math.random() - 0.5) * 2; // -1 to 1
    const direction: SignalDirection =
      sentiment > 0.3 ? 'bullish' : sentiment < -0.3 ? 'bearish' : 'neutral';

    return {
      symbol,
      direction,
      score: Math.round(Math.abs(sentiment) * 70 + Math.random() * 30), // 0-100
      source: 'social',
      momentum: (Math.random() - 0.5) * 100, // -50 to 50
      timestamp: Date.now(),
    };
  }

  /**
   * Generate mock tweets for testing
   */
  private generateMockTweets(symbol: string, count: number = 10): TweetData[] {
    const tweets: TweetData[] = [];
    const influencers = INFLUENCERS.slice(0, 5).map(inf => inf.username);

    const templates = [
      `${symbol} looking strong! 🚀`,
      `Just bought more ${symbol}`,
      `${symbol} breakout incoming?`,
      `Bearish on ${symbol} short term`,
      `${symbol} consolidating nicely`,
      `Watching ${symbol} closely`,
      `${symbol} to the moon! 🌙`,
      `Taking profits on ${symbol}`,
      `${symbol} at key support level`,
      `${symbol} showing weakness`,
    ];

    for (let i = 0; i < count; i++) {
      const username = influencers[i % influencers.length];
      const text = templates[i % templates.length];

      tweets.push({
        id: `mock_${Date.now()}_${i}`,
        authorUsername: username,
        text,
        createdAt: new Date(Date.now() - Math.random() * 86400000), // Last 24h
        metrics: {
          likes: Math.floor(Math.random() * 1000),
          retweets: Math.floor(Math.random() * 500),
          replies: Math.floor(Math.random() * 100),
        },
        mentionedSymbols: [symbol],
      });
    }

    return tweets;
  }
}

// Singleton instance
let sentimentServiceInstance: SentimentService | null = null;

export function getSentimentService(): SentimentService {
  if (!sentimentServiceInstance) {
    sentimentServiceInstance = new SentimentService();
  }
  return sentimentServiceInstance;
}

export default SentimentService;

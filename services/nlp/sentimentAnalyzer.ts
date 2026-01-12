/**
 * Sentiment Analyzer
 *
 * Analyzes tweet sentiment using keyword-based analysis.
 * Can be upgraded to use GPT-4 or FinBERT for more accuracy.
 */

import { throttle } from '../rateLimiter';
import { apiConfig } from '../../config/apiKeys';
import type { TweetData } from '../../types';

/**
 * Sentiment keywords
 */
const BULLISH_KEYWORDS = [
  'bullish', 'buy', 'long', 'moon', 'pump', 'rally', 'breakout', 'accumulate',
  'hodl', 'accumulating', 'all-time high', 'ath', 'surge', 'soaring', 'uptrend',
  'bottom', 'oversold', 'undervalued', 'buying opportunity', 'strong support',
  '🚀', '📈', '💎', '🔥', '💪', '🐂', // Emojis
];

const BEARISH_KEYWORDS = [
  'bearish', 'sell', 'short', 'dump', 'crash', 'drop', 'correction', 'plunge',
  'bear market', 'resistance', 'overbought', 'overvalued', 'distribution',
  'exit', 'take profit', 'stop loss', 'downtrend', 'falling', 'collapse',
  '📉', '🐻', '⚠️', '💔', '😱', // Emojis
];

const NEUTRAL_KEYWORDS = [
  'waiting', 'watching', 'observing', 'sideways', 'consolidation', 'range-bound',
  'uncertain', 'mixed signals', 'flat', 'stable', 'neutral',
];

/**
 * Sentiment intensity modifiers
 */
const STRONG_MODIFIERS = [
  'very', 'extremely', 'massively', 'incredibly', 'super', 'mega', 'ultra',
  'huge', 'enormous', 'explosive', 'insane', 'crazy',
];

const WEAK_MODIFIERS = [
  'slightly', 'somewhat', 'maybe', 'possibly', 'might', 'perhaps',
  'could', 'potentially', 'marginally',
];

const NEGATIONS = ['not', 'no', 'never', "don't", "won't", "can't", "isn't", "aren't"];

/**
 * Sentiment Analysis Result
 */
interface SentimentResult {
  sentiment: number; // -1 (bearish) to 1 (bullish)
  confidence: number; // 0 to 1
  reasoning: string;
}

/**
 * Sentiment Analyzer
 */
export class SentimentAnalyzer {
  /**
   * Analyze tweet sentiment
   */
  async analyzeSentiment(tweet: TweetData): Promise<SentimentResult> {
    // Check if OpenAI is available for advanced analysis
    if (apiConfig.openai.enabled) {
      return await this.analyzeWithGPT(tweet);
    }

    // Fallback to keyword-based analysis
    return this.analyzeWithKeywords(tweet);
  }

  /**
   * Keyword-based sentiment analysis
   */
  private analyzeWithKeywords(tweet: TweetData): SentimentResult {
    const text = tweet.text.toLowerCase();
    const words = text.split(/\s+/);

    let bullishScore = 0;
    let bearishScore = 0;
    let neutralScore = 0;

    // Track modifiers and negations
    const modifiers: string[] = [];
    const negated: boolean[] = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      // Check for modifiers
      if (STRONG_MODIFIERS.includes(word)) {
        modifiers.push('strong');
        continue;
      }
      if (WEAK_MODIFIERS.includes(word)) {
        modifiers.push('weak');
        continue;
      }

      // Check for negations
      if (NEGATIONS.includes(word)) {
        negated.push(true);
        continue;
      }

      // Score keywords
      let score = 1;
      if (modifiers.includes('strong')) score = 2;
      if (modifiers.includes('weak')) score = 0.5;
      const isNegated = negated.length > 0;

      if (BULLISH_KEYWORDS.includes(word)) {
        bullishScore += isNegated ? -score : score;
      } else if (BEARISH_KEYWORDS.includes(word)) {
        bearishScore += isNegated ? -score : score;
      } else if (NEUTRAL_KEYWORDS.includes(word)) {
        neutralScore += score;
      }

      // Reset modifiers and negations after keyword
      modifiers.length = 0;
      negated.length = 0;
    }

    // Check for price mentions and patterns
    const pricePattern = /\$?\d{1,3}(,?\d{3})*(\.\d+)?[kKmMbB]?/g;
    const prices = text.match(pricePattern);
    if (prices && prices.length > 0) {
      // Multiple price mentions = more confident analysis
      bullishScore *= 1.2;
      bearishScore *= 1.2;
    }

    // Calculate net sentiment
    const totalScore = bullishScore + bearishScore + neutralScore;
    const netScore = (bullishScore - bearishScore) / Math.max(totalScore, 1);

    // Calculate confidence based on strength of keywords
    const maxKeywords = Math.max(bullishScore, bearishScore, neutralScore);
    const confidence = Math.min(maxKeywords / 5, 1); // Max at 5 keywords

    // Adjust for engagement (more engagement = more confident)
    const engagementBoost = Math.min(
      (tweet.metrics.likes + tweet.metrics.retweets * 2) / 1000,
      0.3
    );

    return {
      sentiment: netScore,
      confidence: Math.min(confidence + engagementBoost, 1),
      reasoning: this.explainSentiment(bullishScore, bearishScore, neutralScore),
    };
  }

  /**
   * GPT-based sentiment analysis (premium)
   */
  private async analyzeWithGPT(tweet: TweetData): Promise<SentimentResult> {
    try {
      const prompt = `Analyze the sentiment of this cryptocurrency/finance tweet. Return a JSON object with:
- sentiment: number from -1 (very bearish) to 1 (very bullish)
- confidence: number from 0 to 1 indicating how confident you are
- reasoning: brief explanation

Tweet: "${tweet.text}"

Respond ONLY with valid JSON.`;

      const response = await throttle('openai', async () => {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiConfig.openai.apiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            max_tokens: 150,
          }),
        });

        if (!res.ok) {
          throw new Error(`OpenAI API error: ${res.status}`);
        }

        return res.json();
      });

      const content = response.choices[0].message.content;
      const parsed = JSON.parse(content);

      return {
        sentiment: parsed.sentiment,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
      };
    } catch (error) {
      console.error('GPT sentiment analysis failed, falling back to keywords:', error);
      return this.analyzeWithKeywords(tweet);
    }
  }

  /**
   * Explain sentiment score
   */
  private explainSentiment(bullish: number, bearish: number, neutral: number): string {
    if (bullish > bearish && bullish > neutral) {
      return `Strong bullish sentiment (${bullish.toFixed(1)} bullish keywords)`;
    } else if (bearish > bullish && bearish > neutral) {
      return `Strong bearish sentiment (${bearish.toFixed(1)} bearish keywords)`;
    } else if (neutral > bullish && neutral > bearish) {
      return `Neutral sentiment (${neutral.toFixed(1)} neutral keywords)`;
    } else {
      return 'Mixed sentiment';
    }
  }

  /**
   * Batch analyze multiple tweets
   */
  async analyzeBatch(tweets: TweetData[]): Promise<Map<string, SentimentResult>> {
    const results = new Map<string, SentimentResult>();

    for (const tweet of tweets) {
      const result = await this.analyzeSentiment(tweet);
      results.set(tweet.id, result);
    }

    return results;
  }
}

// Singleton instance
let analyzerInstance: SentimentAnalyzer | null = null;

export function getSentimentAnalyzer(): SentimentAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new SentimentAnalyzer();
  }
  return analyzerInstance;
}

export default SentimentAnalyzer;

/* eslint-env node */
/**
 * Test Script: Sentiment Analysis
 *
 * Validates Twitter API integration and sentiment analysis.
 * Run with: npx ts-node scripts/testSentimentAnalysis.ts
 */

import { getSentimentService } from '../services/sentimentService';
import { getSentimentAnalyzer } from '../services/nlp/sentimentAnalyzer';
import { apiConfig } from '../config/apiKeys';
import type { TweetData } from '../types';

async function testSentimentAnalysis() {
  console.log('🧪 Testing Sentiment Analysis\n');
  console.log('='.repeat(60));

  // Test 1: Check API configuration
  console.log('\n1. Checking API Configuration...');
  console.log(`   Twitter API configured: ${apiConfig.twitter.enabled ? '✓' : '✗'}`);
  console.log(`   OpenAI configured: ${apiConfig.openai.enabled ? '✓' : '✗'}`);
  console.log(`   Live data enabled: ${apiConfig.features.liveSentiment ? '✓' : '✗'}`);

  if (!apiConfig.twitter.enabled) {
    console.log('   ⚠️  Twitter Bearer Token not configured');
    console.log('   → Using mock data for testing\n');
  }

  // Test 2: Fetch influencer tweets
  console.log('\n2. Fetching Influencer Tweets for BTC...');
  const service = getSentimentService();

  try {
    const tweets = await service.fetchInfluencerTweets('BTC', 24);

    console.log(`   ✓ Retrieved ${tweets.length} tweets`);

    if (tweets.length > 0) {
      console.log('\n   Sample Tweets:');
      tweets.slice(0, 3).forEach((tweet, idx) => {
        const text = tweet.text.slice(0, 60) + (tweet.text.length > 60 ? '...' : '');
        console.log(`   ${idx + 1}. @${tweet.authorUsername}: "${text}"`);
        console.log(`      Likes: ${tweet.metrics.likes} | RTs: ${tweet.metrics.retweets} | Symbols: ${tweet.mentionedSymbols.join(', ')}`);
      });
    }

    // Test 3: Analyze tweet sentiment
    console.log('\n3. Testing Sentiment Analyzer...');
    const analyzer = getSentimentAnalyzer();

    // Create a test tweet
    const testTweet: TweetData = {
      id: 'test_1',
      authorUsername: 'test_user',
      text: 'Bitcoin is breaking out! Very bullish on BTC, accumulating more. 🚀📈',
      createdAt: new Date(),
      metrics: {
        likes: 500,
        retweets: 100,
        replies: 50,
      },
      mentionedSymbols: ['BTC'],
    };

    const analysis = await analyzer.analyzeSentiment(testTweet);

    console.log('   ✓ Test Tweet Analysis:');
    console.log(`     Text: "${testTweet.text}"`);
    console.log(`     Sentiment: ${analysis.sentiment.toFixed(2)} (${analysis.sentiment > 0 ? 'BULLISH' : 'BEARISH'})`);
    console.log(`     Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
    console.log(`     Reasoning: ${analysis.reasoning}`);

    // Test 4: Aggregated sentiment signal
    console.log('\n4. Generating Aggregated Sentiment Signal...');
    const signal = await service.getAggregatedSentiment('BTC');

    console.log('   ✓ Sentiment Signal generated:');
    console.log(`     Symbol: ${signal.symbol}`);
    console.log(`     Direction: ${signal.direction.toUpperCase()}`);
    console.log(`     Score: ${signal.score}/100`);
    console.log(`     Source: ${signal.source}`);
    console.log(`     Momentum: ${signal.momentum.toFixed(1)}`);

    // Test 5: Analyze influencer sentiment breakdown
    if (tweets.length >= 3) {
      console.log('\n5. Analyzing Influencer Sentiment Breakdown...');
      const influencerSentiments = await service.analyzeInfluencerSentiment(tweets);

      console.log(`   ✓ Analyzed ${influencerSentiments.length} influencers:`);

      influencerSentiments.slice(0, 5).forEach((inf, idx) => {
        const sentimentLabel =
          inf.sentiment > 0.3 ? 'BULLISH' : inf.sentiment < -0.3 ? 'BEARISH' : 'NEUTRAL';
        console.log(`   ${idx + 1}. @${inf.username}`);
        console.log(`      Sentiment: ${inf.sentiment.toFixed(2)} (${sentimentLabel})`);
        console.log(`      Confidence: ${(inf.confidence * 100).toFixed(1)}%`);
        console.log(`      Tweets: ${inf.tweets.length}`);
      });

      // Test 6: Echo chamber detection
      console.log('\n6. Checking for Echo Chamber...');
      const isEchoChamber = service.detectEchoChamber(influencerSentiments);

      console.log(`   ${isEchoChamber ? '⚠️' : '✓'} Echo chamber detected: ${isEchoChamber ? 'YES' : 'NO'}`);

      if (isEchoChamber) {
        console.log('   → High consensus (>95%) detected - applying penalty to confidence');
      }
    }

    // Test 7: Validate signal
    console.log('\n7. Validating Signal...');
    const validations = [
      { test: 'Score in range 0-100', pass: signal.score >= 0 && signal.score <= 100 },
      {
        test: 'Direction is valid',
        pass: ['bullish', 'bearish', 'neutral'].includes(signal.direction),
      },
      { test: 'Source is valid', pass: signal.source === 'social' },
      { test: 'Momentum in range', pass: signal.momentum >= -100 && signal.momentum <= 100 },
      { test: 'Timestamp is recent', pass: Date.now() - signal.timestamp < 900000 }, // 15 min
    ];

    validations.forEach(v => {
      console.log(`   ${v.pass ? '✓' : '✗'} ${v.test}`);
    });

    const allPassed = validations.every(v => v.pass);
    console.log(`\n   ${allPassed ? '✅ All validations passed!' : '❌ Some validations failed'}`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Sentiment Analysis Test Complete!\n');
    console.log('Next steps:');
    console.log('  1. Configure TWITTER_BEARER_TOKEN in .env.local for live data');
    console.log('  2. (Optional) Configure OPENAI_API_KEY for advanced sentiment');
    console.log('  3. Set NEXT_PUBLIC_ENABLE_LIVE_SENTIMENT=true');
    console.log('  4. Run this test again to validate API integration\n');

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error);
    process.exit(1);
  }
}

// Run test
if (require.main === module) {
  testSentimentAnalysis()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

export default testSentimentAnalysis;

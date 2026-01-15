# 🚀 Quick Setup Guide - Market News/Whale Intelligence

## ✅ Prerequisites Completed

All NPM packages have been installed successfully:
- ✅ `twitter-api-v2` v1.28.0
- ✅ `openai` v6.16.0
- ✅ `bottleneck` v2.19.5
- ✅ `natural` v8.1.0
- ✅ `@types/natural` v5.1.5

---

## 📝 Next Steps

### 1. Configure API Keys

**Step 1:** Copy the environment template:
```bash
cp .env.local.example .env.local
```

**Step 2:** Edit `.env.local` and add your API keys:

```bash
# ==========================================
# WHALE DATA INTEGRATION
# ==========================================
WHALE_ALERT_API_KEY=your_whale_alert_key_here

# ==========================================
# SOCIAL SENTIMENT INTEGRATION
# ==========================================
TWITTER_BEARER_TOKEN=your_twitter_bearer_token_here
OPENAI_API_KEY=your_openai_key_here

# ==========================================
# FEATURE FLAGS (Set to true to enable)
# ==========================================
NEXT_PUBLIC_ENABLE_LIVE_WHALE_DATA=false
NEXT_PUBLIC_ENABLE_LIVE_SENTIMENT=false
NEXT_PUBLIC_ENABLE_LIVE_TECHNICAL=true  # Free, no key required
```

### 2. Get API Keys

#### Whale Alert API (Free Tier: 30 calls/min)
1. Go to: https://whale-alert.io/signup
2. Sign up for free account
3. Copy API key to `.env.local`

#### Twitter API (Essential Plan: $100/mo)
1. Go to: https://developer.twitter.com/en/portal/petition/essential/basic-info
2. Apply for Essential access
3. Create a project and app
4. Generate Bearer Token
5. Copy to `.env.local`

#### OpenAI API (Optional - GPT-4 Mini: ~$0.0001/tweet)
1. Go to: https://platform.openai.com/signup
2. Add payment method
3. Generate API key
4. Copy to `.env.local`

**Note:** If you don't add OpenAI key, sentiment analysis will use keyword-based approach (still works, less accurate).

---

### 3. Test the Implementation

**Test Whale Data Integration:**
```bash
npx ts-node scripts/testWhaleDataIntegration.ts
```

**Expected Output:**
```
🧪 Testing Whale Data Integration

1. Checking API Configuration...
   ✓ API Key configured
   ✓ Live data enabled

2. Fetching Whale Metrics for BTC...
   ✓ Whale Metrics retrieved:
     Symbol: BTC
     Net Flow (24h): $15.50M
     Large Transfers: 8

3. Converting to WhaleSignal...
   ✓ Signal generated:
     Direction: BULLISH
     Score: 85/100

✅ All validations passed!
```

**Test Sentiment Analysis:**
```bash
npx ts-node scripts/testSentimentAnalysis.ts
```

---

### 4. Enable Features in Production

Once tests pass, enable live data in `.env.local`:

```bash
NEXT_PUBLIC_ENABLE_LIVE_WHALE_DATA=true
NEXT_PUBLIC_ENABLE_LIVE_SENTIMENT=true
NEXT_PUBLIC_ENABLE_LIVE_TECHNICAL=true
```

---

## 🧪 Testing Without API Keys (Mock Mode)

If you don't have API keys yet, the system will automatically fall back to **mock data**:

```bash
# All feature flags = false (or not set)
NEXT_PUBLIC_ENABLE_LIVE_WHALE_DATA=false
NEXT_PUBLIC_ENABLE_LIVE_SENTIMENT=false
NEXT_PUBLIC_ENABLE_LIVE_TECHNICAL=false
```

Run tests to see mock data in action:
```bash
npx ts-node scripts/testWhaleDataIntegration.ts
# Output: "⚠️  Using mock data for testing"
```

---

## 💡 Quick Start (Minimal Setup)

**Want to test immediately with minimal setup?**

1. **Enable Technical Analysis only** (no API key required):
   ```bash
   NEXT_PUBLIC_ENABLE_LIVE_TECHNICAL=true
   ```
   Technical analysis uses Binance public API (free, no signup).

2. **Test it:**
   ```bash
   npx ts-node -e "
   import { getTechnicalAnalysisService } from './services/technicalAnalysisService';

   (async () => {
     const service = getTechnicalAnalysisService();
     const ohlcv = await service.getOHLCV('BTC', '1h', 50);
     const patterns = service.detectPatterns(ohlcv);
     console.log('Detected patterns:', patterns);
   })();
   "
   ```

---

## 📊 Cost Summary

| Service | Free Tier | Pro Tier | Monthly Cost |
|---------|-----------|----------|--------------|
| **Whale Alert** | 30 calls/min | 1000 calls/min | $0 (free) or $49 |
| **Twitter API** | 1500 tweets/mo | 2M tweets/mo | $100 (required) |
| **OpenAI GPT-4 Mini** | - | 500 req/min | ~$15 (optional) |
| **Binance API** | 1200 req/min | - | $0 (free) |

**Total for Basic Setup:** $100/mo (Twitter only)
**Total for Full Setup:** $115-164/mo

---

## 🔍 Verify Installation

Run this to check if everything is installed correctly:

```bash
node -e "
const deps = ['twitter-api-v2', 'openai', 'bottleneck', 'natural'];
deps.forEach(dep => {
  try {
    require.resolve(dep);
    console.log('✓', dep);
  } catch(e) {
    console.log('✗', dep, '- NOT INSTALLED');
  }
});
"
```

Expected output:
```
✓ twitter-api-v2
✓ openai
✓ bottleneck
✓ natural
```

---

## 🐛 Troubleshooting

### Issue: "Module not found: Can't resolve 'twitter-api-v2'"

**Solution:**
```bash
npm install twitter-api-v2 openai bottleneck natural --save
```

### Issue: "Whale Alert API key not configured"

**Solution:**
- Add `WHALE_ALERT_API_KEY` to `.env.local`
- Or set `NEXT_PUBLIC_ENABLE_LIVE_WHALE_DATA=false` to use mock data

### Issue: "Twitter rate limit exceeded"

**Solution:**
- Free tier: Limited to 1500 tweets/month
- Upgrade to Essential plan ($100/mo) for 2M tweets/month
- Or set `NEXT_PUBLIC_ENABLE_LIVE_SENTIMENT=false` temporarily

### Issue: TypeScript errors in new files

**Solution:**
```bash
# Restart TypeScript server in VS Code
# Press Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

---

## 📚 Additional Resources

- **Full Implementation Guide:** `IMPLEMENTATION_SUMMARY.md`
- **Original Plan:** `C:\Users\olegh\.claude\plans\greedy-exploring-castle.md`
- **API Documentation:**
  - Whale Alert: https://docs.whale-alert.io/
  - Twitter API v2: https://developer.twitter.com/en/docs/twitter-api
  - Binance API: https://binance-docs.github.io/apidocs/spot/en/

---

## ✅ Checklist

Before going to production, ensure:

- [ ] All NPM packages installed
- [ ] `.env.local` created and configured
- [ ] Test scripts passing
- [ ] API rate limits understood
- [ ] Caching configured (TTL values in `.env.local`)
- [ ] Feature flags set appropriately
- [ ] Error handling tested (API failures, rate limits)

---

## 🎯 Quick Test Command

Test the entire flow with one command:

```bash
npx ts-node -e "
import { getWhaleWalletService } from './services/whaleWalletService';
import { getSentimentService } from './services/sentimentService';
import { getTechnicalAnalysisService } from './services/technicalAnalysisService';
import { getConfluenceDetector } from './services/confluenceDetector';

(async () => {
  console.log('🧪 Testing Multi-Signal Confluence\n');

  const symbol = 'BTC';

  // Fetch signals
  const whaleService = getWhaleWalletService();
  const whaleMetrics = await whaleService.getWhaleMetrics(symbol);
  const whaleSignal = whaleService.convertToWhaleSignal(whaleMetrics);
  console.log('🐋 Whale Signal:', whaleSignal.direction, '-', whaleSignal.score + '/100');

  const sentimentService = getSentimentService();
  const sentimentSignal = await sentimentService.getAggregatedSentiment(symbol);
  console.log('🐦 Sentiment:', sentimentSignal.direction, '-', sentimentSignal.score + '/100');

  const technicalService = getTechnicalAnalysisService();
  const ohlcv = await technicalService.getOHLCV(symbol);
  const patterns = technicalService.detectPatterns(ohlcv);
  const volumeAnalysis = technicalService.analyzeVolume(ohlcv);
  const technicalSignal = technicalService.convertToTradeSignal(symbol, patterns, volumeAnalysis);
  console.log('📊 Technical:', technicalSignal.direction, '-', technicalSignal.score + '/100');

  // Detect confluence
  const detector = getConfluenceDetector();
  const alert = detector.detectConfluence(whaleSignal, sentimentSignal, technicalSignal, 2, 50000);

  if (alert) {
    const tierLabel = alert.tier === 3 ? 'TRIPLE' : alert.tier === 2 ? 'DOUBLE' : 'SINGLE';
    console.log('\n🎯 Confluence Detected:');
    console.log('   Tier:', tierLabel);
    console.log('   Confidence:', alert.confidence + '%');
    console.log('   Divergence:', alert.divergence || 'None');
  }
})();
"
```

---

**You're all set!** 🎉

Start by running the test scripts to validate your setup, then configure API keys for live data.

# 🐋 Whale Data - Quick Start (2 Minutes)

Get live whale transaction data running in FinPulse in under 2 minutes.

---

## Option 1: Automated Setup (Recommended)

### Windows:
```bash
cd finpulse-app
scripts\enableWhaleData.bat your_api_key_here
npm run dev
```

### Mac/Linux:
```bash
cd finpulse-app
./scripts/enableWhaleData.sh your_api_key_here
npm run dev
```

**Don't have an API key yet?** Get one free at https://whale-alert.io/signup

---

## Option 2: Manual Setup (3 steps)

### Step 1: Get API Key
1. Visit https://whale-alert.io/signup
2. Create account & verify email
3. Copy API key from https://developer.whale-alert.io/api-account/

### Step 2: Configure
Edit `finpulse-app/.env`:
```bash
VITE_WHALE_ALERT_API_KEY=wak_your_key_here
VITE_ENABLE_LIVE_WHALE_DATA=true
```

### Step 3: Start
```bash
cd finpulse-app
npm run dev
```

---

## Verify It's Working

### Check 1: Console Messages
Open browser console (F12):
- ✅ **Success:** No "using mock data" warnings
- ❌ **Still mock:** See warning about missing API key

### Check 2: Test Script
```bash
cd finpulse-app
npx vitest run --reporter=verbose
```

Should show:
```
✓ API Key configured: ✓
✓ Live data enabled: ✓
✓ Whale Metrics retrieved
```

### Check 3: UI Signals
1. Open portfolio in browser
2. Look for whale signals on holdings
3. Numbers should be realistic (not round millions)

---

## What You Get

**With Live Data:**
- Real whale transactions (>$1M)
- Last 24h exchange flows
- Bullish/bearish signals
- 72% historical accuracy

**Free Tier Limits:**
- 30 API calls/minute
- 43,200 calls/day
- Last 10 minutes of data
- More than enough for most users!

---

## Common Issues

### "Still seeing mock data"
```bash
# Restart dev server:
Ctrl+C
npm run dev
```

### "Rate limit exceeded"
Edit `.env`:
```bash
CACHE_TTL_WHALE_DATA=600  # Increase cache to 10 min
RATE_LIMIT_WHALE_ALERT=20  # Lower rate limit
```

### "API authentication error"
Check API key format in `.env`:
```bash
# Should look like:
VITE_WHALE_ALERT_API_KEY=wak_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# No quotes, no spaces
```

---

## Next Steps

- **Full docs:** See `docs/WHALE_SETUP.md`
- **Upgrade:** Pro tier = 1000 calls/min + historical data
- **Optimize:** Tune cache/rate limits for your usage

---

**That's it!** You're now tracking real whale movements. 🚀

Questions? Check `docs/WHALE_SETUP.md` or create an issue.

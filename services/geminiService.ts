
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { config } from '../config';

// Check if we have a Gemini API key available (from env or AI Studio)
const getApiKey = (): string | null => {
  // Check process.env (set by Vite define)
  if (typeof process !== 'undefined' && process.env?.API_KEY) {
    return process.env.API_KEY;
  }
  if (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }
  return null;
};

const getAI = () => {
  const apiKey = getApiKey();
  if (apiKey) {
    return new GoogleGenAI({ apiKey });
  }
  // No API key available, will use backend API
  return null;
};

const handleApiError = async (error: any) => {
  if (error?.message?.includes("Requested entity was not found")) {
    // Safely check for window.aistudio to avoid runtime crashes
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      try {
        await (window as any).aistudio.openSelectKey();
      } catch (e) {
        // Failed to open key selector
      }
    }
    return "API Key Error: Please ensure you have selected a valid API key from a paid GCP project.";
  }
  return "An unexpected error occurred during market analysis.";
};

// Backend-based AI query (for deployed version)
const queryBackendAI = async (query: string, callback: (text: string) => void) => {
  try {
    const token = localStorage.getItem('finpulse_id_token');
    const response = await fetch(`${config.apiUrl}/ai/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({ query })
    });
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const data = await response.json();
    const text = data.response || data.text || "No response received.";
    callback(text);
    return text;
  } catch (error) {
    // Fallback: Return a helpful message with market context
    const fallbackResponse = generateFallbackResponse(query);
    callback(fallbackResponse);
    return fallbackResponse;
  }
};

// Generate helpful response when AI is unavailable
const generateFallbackResponse = (query: string): string => {
  const queryLower = query.toLowerCase();

  // Crypto price queries
  if (queryLower.match(/\b(xrp|ripple|btc|bitcoin|eth|ethereum|doge|ada|sol)\b/) &&
      queryLower.match(/\b(price|cost|value|worth)\b/)) {
    const coin = queryLower.match(/\b(xrp|ripple|btc|bitcoin|eth|ethereum|doge|ada|sol)\b/)?.[0].toUpperCase();
    return `**${coin || 'Crypto'} Price Information:**

To check real-time ${coin || 'crypto'} prices, use these reliable sources:
• **CoinGecko**: https://www.coingecko.com
• **CoinMarketCap**: https://coinmarketcap.com
• **TradingView**: https://www.tradingview.com
• **Binance/Coinbase**: Direct exchange prices

For advanced analysis:
• View 24h volume, market cap, and price changes
• Check order book depth for support/resistance
• Monitor trading pairs (USD, BTC, USDT)
• Set price alerts for your target levels

**Note:** AI-powered real-time analysis coming soon. Enable it in Settings > AI Copilot.`;
  }

  // Technical analysis queries
  if (queryLower.includes('support') || queryLower.includes('resistance') || queryLower.includes('technical')) {
    return `**Technical Analysis Resources:**

For professional chart analysis and key levels:
• **TradingView**: Interactive charts with 100+ indicators
• **CoinGecko**: Historical price charts & patterns
• **CryptoQuant**: On-chain metrics & institutional flows

**Key Technical Factors:**
• Support/Resistance: Historical price zones where buying/selling pressure emerges
• Volume Profile: Areas of high trading activity
• Moving Averages: 50-day, 200-day trends
• RSI/MACD: Momentum indicators

**Note:** AI analysis is temporarily unavailable. These are general guidance resources.`;
  }

  // Sentiment queries
  if (queryLower.includes('sentiment') || queryLower.includes('feel') || queryLower.includes('mood')) {
    return `**Market Sentiment Indicators:**

Track real-time market psychology with:
• **Fear & Greed Index**: alternative.me/crypto/fear-and-greed-index
• **Social Sentiment**: LunarCrush, Santiment
• **On-chain Metrics**: Glassnode, IntoTheBlock
• **Reddit/Twitter**: r/CryptoCurrency, Crypto Twitter

**Sentiment Signals:**
• Extreme Fear: Potential buying opportunity (contrarian)
• Extreme Greed: Potential distribution zone
• Social Volume Spikes: Indicates FOMO or panic

**Note:** AI sentiment analysis coming soon. Enable it in Settings > AI Copilot.`;
  }

  // Bitcoin-specific queries
  if (queryLower.includes('btc') || queryLower.includes('bitcoin')) {
    return `**Bitcoin Market Analysis Resources:**

**Real-time Data:**
• Current Price: CoinGecko, CoinMarketCap
• Hash Rate & Difficulty: blockchain.com/charts
• Exchange Flows: CryptoQuant, Glassnode

**News & Analysis:**
• Institutional Activity: The Block, CoinDesk
• Regulatory Updates: Cointelegraph
• Technical Analysis: TradingView community ideas

**Key Metrics to Monitor:**
• Hash rate (network security indicator)
• Exchange reserves (supply availability)
• Whale movements (large holder activity)
• Futures funding rates (leverage sentiment)

**Note:** AI analysis is temporarily unavailable. These are verified data sources.`;
  }

  // Default response for general queries
  return `**Market Intelligence:**
I've received your query about: *"${query.substring(0, 60)}${query.length > 60 ? '...' : ''}"*

**Recommended Resources:**
• **Crypto Prices**: CoinGecko, CoinMarketCap
• **Stock Data**: Yahoo Finance, Google Finance
• **Technical Charts**: TradingView (50M+ active users)
• **News & Analysis**: Bloomberg, Reuters, CoinDesk

**Portfolio Features:**
• Use the **Watchlist** tab to track your favorite assets
• Add holdings to your **Portfolio** for real-time tracking
• Check the **News** sidebar for market-moving events

**Note:** AI-powered copilot feature coming soon! This will enable:
• Real-time market analysis with Google Search integration
• Custom alerts and pattern recognition
• Portfolio optimization suggestions
• Sentiment analysis across 1000+ sources

Enable early access in **Settings > AI Copilot** (ProPulse & SuperPulse plans).`;
};

export const getMarketInsightStream = async (query: string, callback: (text: string) => void) => {
  // Check if we're in AI Studio environment
  const ai = getAI();
  
  if (!ai) {
    // Use backend API or fallback
    return queryBackendAI(query, callback);
  }
  
  try {
    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-3-pro-preview',
      contents: `Context: You are FinPulse Copilot, an elite AI financial analyst.
      
      STRICT GUARDRAILS:
      1. OBSERVATION ONLY: Describe what is happening in the market based on data.
      2. NO PREDICTIONS: Do NOT use terms like "bullish", "bearish", "buy", "sell", "likely to rise", "accumulation zone", or "distribution".
      3. NO ADVICE: Never give financial advice.
      4. TONE: Institutional, objective, concise.
      
      The user is asking: ${query}. 
      Use real-time data from search to provide context.`,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.3,
        topP: 0.8,
        thinkingConfig: { thinkingBudget: 1000 },
      }
    });

    let fullText = "";
    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        callback(fullText);
      }
    }
    return fullText;
  } catch (error) {
    const errorMsg = await handleApiError(error);
    callback(errorMsg);
    return errorMsg; // Return error string so awaited promises resolve
  }
};

export const summarizeNews = async (headline: string) => {
  const ai = getAI();
  if (!ai) return null;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Provide a 2-sentence institutional-grade factual summary for: "${headline}". 
      Focus on market movements and factual events. Avoid predictive language.`,
      config: { 
        thinkingConfig: { thinkingBudget: 500 },
      }
    });
    return response.text;
  } catch (error) {
    handleApiError(error);
    return null;
  }
};

export const fetchRealtimeNews = async () => {
  const ai = getAI();
  if (!ai) return null;
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Retrieve the 6 most critical global financial news events from the last 12 hours. 
      Focus on Bitcoin, Major Tech Equities, and Macro Economic events.
      Format: Source | Headline | Summary | Tags`,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
      },
    });

    const text = response.text || "";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    return { text, chunks };
  } catch (error) {
    handleApiError(error);
    return null;
  }
};

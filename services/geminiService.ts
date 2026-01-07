
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { config } from '../config';

// Check if we have a Gemini API key available (from env or AI Studio)
const getApiKey = (): string | null => {
  const allowClientKey = import.meta.env.DEV || import.meta.env.VITE_ALLOW_CLIENT_AI_KEY === 'true';
  if (!allowClientKey) {
    return null;
  }
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
  
  if (queryLower.includes('support') || queryLower.includes('resistance')) {
    return `**Market Observation:** For technical support and resistance levels, I recommend checking TradingView or CoinGecko for real-time order book data. Key levels are determined by historical price action and volume profiles.

**Note:** AI analysis is temporarily unavailable. This is a general guidance response.`;
  }
  
  if (queryLower.includes('sentiment') || queryLower.includes('feel')) {
    return `**Market Sentiment Indicators:**
• Fear & Greed Index: Check alternative.me/crypto/fear-and-greed-index
• Social sentiment: Check LunarCrush or Santiment
• On-chain metrics: Check Glassnode or IntoTheBlock

**Note:** AI analysis is temporarily unavailable. This is a general guidance response.`;
  }
  
  if (queryLower.includes('btc') || queryLower.includes('bitcoin')) {
    return `**Bitcoin Market Context:**
• Check current price and 24h change on CoinGecko
• Key metrics: Hash rate, mining difficulty, exchange flows
• Recent news: Monitor CoinDesk and The Block for institutional activity

**Note:** AI analysis is temporarily unavailable. This is a general guidance response.`;
  }
  
  return `**Market Intelligence:**
Thank you for your query about "${query.substring(0, 50)}...". 

For real-time analysis, please check:
• CoinGecko/CoinMarketCap for crypto prices
• Yahoo Finance for equity data  
• TradingView for technical analysis

**Note:** AI-powered analysis requires additional setup. Contact support to enable the AI copilot feature.`;
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

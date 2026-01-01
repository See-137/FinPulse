
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const handleApiError = async (error: any) => {
  console.error("Gemini API Error:", error);
  if (error?.message?.includes("Requested entity was not found")) {
    // Safely check for window.aistudio to avoid runtime crashes
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      try {
        await (window as any).aistudio.openSelectKey();
      } catch (e) {
        console.error("Failed to open key selector:", e);
      }
    }
    return "API Key Error: Please ensure you have selected a valid API key from a paid GCP project.";
  }
  return "An unexpected error occurred during market analysis.";
};

export const getMarketInsightStream = async (query: string, callback: (text: string) => void) => {
  try {
    const ai = getAI();
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
  try {
    const ai = getAI();
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
  try {
    const ai = getAI();
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

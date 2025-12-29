
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const handleApiError = async (error: any) => {
  console.error("Gemini API Error:", error);
  if (error?.message?.includes("Requested entity was not found")) {
    // If the key is invalid or from a non-paid project, prompt re-selection
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
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
      contents: `Context: You are FinPulse Copilot, an elite AI financial strategist. 
      The user is using a real-time Portfolio Mirror to track their global assets (Stocks, Crypto, Commodities). 
      The user is asking: ${query}. 
      Provide a highly sophisticated, concise analysis. Use real-time data from search if needed. 
      Maintain a professional, institutional tone. Be direct and avoid fluff.`,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.7,
        topP: 0.9,
        thinkingConfig: { thinkingBudget: 2000 },
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
  }
};

export const summarizeNews = async (headline: string) => {
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: `Provide a 2-sentence institutional-grade impact summary for: "${headline}". 
      Focus on capital rotation and market sentiment implications.`,
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
      Focus on Bitcoin dominance, Gold spot prices, and AI-sector stock volatility.
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

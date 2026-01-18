// FinPulse AI Service - OpenAI-powered Market Intelligence
// This service connects to the backend Lambda which uses OpenAI GPT-4

import { config } from '../config';

// Portfolio holding type for AI context
interface PortfolioHolding {
  symbol: string;
  name?: string;
  quantity: number;
  avgCost?: number;
  currentPrice?: number;
  type?: string;
}

/**
 * Query the AI backend for market intelligence
 * @param query - User's question
 * @param callback - Callback to update UI with response
 * @param portfolio - Optional portfolio context for personalized analysis
 */
export const getMarketInsightStream = async (
  query: string, 
  callback: (text: string) => void, 
  portfolio?: PortfolioHolding[]
): Promise<string> => {
  try {
    const token = localStorage.getItem('finpulse_id_token');
    
    // Debug logging
    console.log('[AI Query] Token present:', !!token);
    console.log('[AI Query] API URL:', `${config.apiUrl}/ai/query`);
    console.log('[AI Query] Portfolio items:', portfolio?.length || 0);
    
    if (!token) {
      console.warn('[AI Query] No auth token found - user may not be logged in');
      const noAuthResponse = `**Authentication Required**\n\nPlease log in to use the AI Market Intelligence feature. Your portfolio data and preferences will be available after authentication.`;
      callback(noAuthResponse);
      return noAuthResponse;
    }
    
    const response = await fetch(`${config.apiUrl}/ai/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({ query, portfolio })
    });
    
    console.log('[AI Query] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI Query] API Error:', response.status, errorText);
      
      // Handle specific error cases
      if (response.status === 401) {
        const authError = `**Session Expired**\n\nYour session has expired. Please refresh the page and log in again to continue using AI Market Intelligence.`;
        callback(authError);
        return authError;
      }
      
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    const text = data.response || data.text || "No response received.";
    callback(text);
    return text;
  } catch (error) {
    console.error('[AI Query] Error:', error);
    
    // User-friendly error message
    const errorResponse = `**Service Temporarily Unavailable**\n\nThe AI Market Intelligence service is temporarily unavailable. Please try again in a moment.\n\nIn the meantime, you can:\n• Check real-time prices in your **Portfolio**\n• Monitor assets in your **Watchlist**\n• Read latest news in the **News** sidebar`;
    callback(errorResponse);
    return errorResponse;
  }
};

/**
 * Summarize a news headline (requires authentication)
 */
export const summarizeNews = async (headline: string): Promise<string | null> => {
  try {
    const token = localStorage.getItem('finpulse_id_token');
    if (!token) return null;
    
    const response = await fetch(`${config.apiUrl}/ai/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include',
      body: JSON.stringify({ 
        query: `Provide a 2-sentence institutional-grade factual summary for: "${headline}". Focus on market impact. Avoid predictive language.`
      })
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    return data.response || data.text || null;
  } catch (error) {
    console.error('[AI Summary] Error:', error);
    return null;
  }
};

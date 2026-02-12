// FinPulse AI Lambda - OpenAI-powered Market Intelligence
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });

// Cache for API key
let cachedApiKey = null;

// Input validation constants
const MAX_QUERY_LENGTH = 2000;
const MIN_QUERY_LENGTH = 2;

/**
 * Sanitize and validate user query to prevent prompt injection
 * @param {string} query - Raw user query
 * @returns {{ valid: boolean, sanitized?: string, error?: string }}
 */
function sanitizeQuery(query) {
  if (!query || typeof query !== 'string') {
    return { valid: false, error: 'Query must be a non-empty string' };
  }

  // Length validation
  const trimmed = query.trim();
  if (trimmed.length < MIN_QUERY_LENGTH) {
    return { valid: false, error: `Query must be at least ${MIN_QUERY_LENGTH} characters` };
  }
  if (trimmed.length > MAX_QUERY_LENGTH) {
    return { valid: false, error: `Query must not exceed ${MAX_QUERY_LENGTH} characters` };
  }

  // Remove potential prompt injection patterns
  let sanitized = trimmed
    .replace(/\0/g, '') // Null bytes
    .replace(/ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|context|prompts?)/gi, '[filtered]')
    .replace(/system\s*:\s*/gi, '[filtered] ')
    .replace(/you\s+are\s+now\s+/gi, '[filtered] ')
    .replace(/forget\s+(everything|all|your)/gi, '[filtered] ')
    .replace(/disregard\s+(all|your|the)/gi, '[filtered] ')
    .replace(/new\s+instructions?\s*:/gi, '[filtered] ')
    .replace(/override\s+(system|instructions?)/gi, '[filtered] ')
    .replace(/<\|.*?\|>/g, '') // Remove potential system tokens
    .replace(/\[INST\]|\[\/INST\]/gi, ''); // Remove instruction markers

  // Check for excessive special characters (potential injection)
  const specialCharRatio = (sanitized.match(/[^a-zA-Z0-9\s.,?!$%@#&*()-]/g) || []).length / sanitized.length;
  if (specialCharRatio > 0.3) {
    return { valid: false, error: 'Query contains too many special characters' };
  }

  return { valid: true, sanitized };
}

const getOpenAIApiKey = async () => {
  if (cachedApiKey) return cachedApiKey;
  
  try {
    const command = new GetSecretValueCommand({
      SecretId: 'finpulse/prod/openai-api-key'
    });
    const response = await secretsClient.send(command);
    
    // Handle both JSON and plain text secrets
    let apiKey;
    try {
      const secret = JSON.parse(response.SecretString);
      apiKey = secret.apiKey || secret.key || secret.api_key || secret.OPENAI_API_KEY;
    } catch (e) {
      // Secret is plain text
      apiKey = response.SecretString;
    }
    
    if (!apiKey) {
      throw new Error('No API key found in secret');
    }
    
    cachedApiKey = apiKey.trim();
    return cachedApiKey;
  } catch (error) {
    console.error('Failed to get OpenAI API key:', error);
    throw new Error('API key unavailable');
  }
};

const SYSTEM_PROMPT = `You are FinPulse Copilot, an elite AI financial analyst providing institutional-grade market intelligence.

STRICT GUARDRAILS:
1. OBSERVATION ONLY: Describe what is happening in the market based on factual data.
2. NO PREDICTIONS: Do NOT use terms like "bullish", "bearish", "buy", "sell", "likely to rise", "accumulation zone", or "distribution".
3. NO ADVICE: Never give financial advice. Do not recommend specific actions.
4. TONE: Institutional, objective, concise, data-driven.
5. DISCLAIMERS: End with a brief disclaimer that this is for informational purposes.

PORTFOLIO ANALYSIS (when user provides portfolio data):
- You CAN analyze the user's portfolio composition, diversification, and allocation percentages
- You CAN describe each holding's current market metrics (price, volume, market cap)
- You CAN calculate total portfolio value, gains/losses, and sector breakdown
- You CAN observe concentration risks and correlation between holdings
- You CANNOT recommend buying, selling, or rebalancing

When discussing:
- CRYPTO: Reference on-chain metrics, exchange flows, hash rates, network activity
- STOCKS: Reference earnings, revenue, P/E ratios, institutional holdings
- MACRO: Reference Fed policy, inflation data, employment figures, GDP

Format responses with clear sections using markdown. Be concise but thorough.`;

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://finpulse.me',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
    'Access-Control-Allow-Credentials': 'true'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Parse request body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON body' })
      };
    }

    const { query, portfolio } = body;
    
    // Validate and sanitize query
    const validation = sanitizeQuery(query);
    if (!validation.valid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: validation.error })
      };
    }

    const sanitizedQuery = validation.sanitized;
    
    // Build portfolio context if provided
    let portfolioContext = '';
    if (portfolio && Array.isArray(portfolio) && portfolio.length > 0) {
      const holdings = portfolio.map(h => {
        const qty = h.quantity || h.shares || 0;
        const avg = h.avgCost || h.avgPrice || 0;
        const current = h.currentPrice || 0;
        const value = qty * current;
        const gainLoss = qty * (current - avg);
        const gainLossPct = avg > 0 ? ((current - avg) / avg * 100).toFixed(2) : 'N/A';
        return `- ${h.symbol}${h.name ? ` (${h.name})` : ''}: ${qty} units @ $${avg.toFixed(2)} avg cost, current: $${current.toFixed(2)}, value: $${value.toFixed(2)}, P/L: $${gainLoss.toFixed(2)} (${gainLossPct}%), type: ${h.type || 'UNKNOWN'}`;
      }).join('\n');
      
      // Calculate totals
      const totalValue = portfolio.reduce((sum, h) => sum + ((h.quantity || h.shares || 0) * (h.currentPrice || 0)), 0);
      const totalCost = portfolio.reduce((sum, h) => sum + ((h.quantity || h.shares || 0) * (h.avgCost || h.avgPrice || 0)), 0);
      const totalPL = totalValue - totalCost;
      const totalPLPct = totalCost > 0 ? ((totalPL / totalCost) * 100).toFixed(2) : 'N/A';
      
      portfolioContext = `\n\nUSER'S CURRENT PORTFOLIO:\n${holdings}\n\nPORTFOLIO SUMMARY:\n- Total Value: $${totalValue.toFixed(2)}\n- Total Cost Basis: $${totalCost.toFixed(2)}\n- Total P/L: $${totalPL.toFixed(2)} (${totalPLPct}%)\n- Number of Holdings: ${portfolio.length}\n\nAnalyze this portfolio based on the user's query.`;
    }

    // Get OpenAI API key
    const apiKey = await getOpenAIApiKey();

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: sanitizedQuery + portfolioContext }
        ],
        temperature: 0.3,
        max_tokens: 2048
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('OpenAI API error:', openaiResponse.status, errorText);
      
      // Check if it's a quota/rate limit error
      const isQuotaError = openaiResponse.status === 429 || errorText.includes('rate_limit') || errorText.includes('insufficient_quota');
      
      // Return helpful fallback on API error
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          response: isQuotaError 
            ? `**AI Service Temporarily Unavailable**\n\nOur AI service is experiencing high demand. While we work on expanding capacity, here are resources for your query:\n\n• **Crypto Data:** [CoinGecko](https://coingecko.com), [CoinMarketCap](https://coinmarketcap.com)\n• **Stock Data:** [Yahoo Finance](https://finance.yahoo.com), [Seeking Alpha](https://seekingalpha.com)\n• **Technical Analysis:** [TradingView](https://tradingview.com)\n\n*Please try again later. Your AI credits have not been deducted.*`
            : `**Market Intelligence Notice**\n\nI'm currently experiencing high demand. Here are some resources for your query about "${query.substring(0, 50)}...":\n\n• **Crypto Data:** CoinGecko, CoinMarketCap\n• **Stock Data:** Yahoo Finance, Seeking Alpha\n• **Technical Analysis:** TradingView\n• **On-chain Metrics:** Glassnode, IntoTheBlock\n\nPlease try again in a moment.`,
          source: isQuotaError ? 'quota-exceeded' : 'fallback',
          isQuotaError
        })
      };
    }

    const data = await openaiResponse.json();
    
    // Extract text from OpenAI response
    const responseText = data.choices?.[0]?.message?.content 
      || 'No response generated. Please try rephrasing your question.';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        response: responseText,
        source: 'openai',
        model: 'gpt-4o-mini'
      })
    };

  } catch (error) {
    console.error('Lambda error:', error);
    
    return {
      statusCode: 200, // Return 200 with fallback to avoid breaking UI
      headers,
      body: JSON.stringify({
        response: `**Market Intelligence**\n\nI encountered an issue processing your request. For real-time market data, please check:\n\n• CoinGecko for cryptocurrency prices\n• Yahoo Finance for equity data\n• TradingView for technical analysis\n\n*This is an automated fallback response.*`,
        source: 'error-fallback',
        error: process.env.ENVIRONMENT !== 'prod' ? error.message : undefined
      })
    };
  }
};

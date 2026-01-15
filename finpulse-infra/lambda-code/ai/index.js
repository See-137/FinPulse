// FinPulse AI Lambda - OpenAI-powered Market Intelligence
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const secretsClient = new SecretsManagerClient({ region: 'us-east-1' });

// Cache for API key
let cachedApiKey = null;

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
3. NO ADVICE: Never give financial advice. Do not recommend any actions.
4. TONE: Institutional, objective, concise, data-driven.
5. DISCLAIMERS: Always remind users this is for informational purposes only.

When discussing:
- CRYPTO: Reference on-chain metrics, exchange flows, hash rates, network activity
- STOCKS: Reference earnings, revenue, P/E ratios, institutional holdings
- MACRO: Reference Fed policy, inflation data, employment figures, GDP

Format responses with clear sections using markdown. Be concise but thorough.`;

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    process.env.ALLOWED_ORIGIN || 'https://finpulse.me',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
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

    const { query } = body;
    
    if (!query || typeof query !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Query is required' })
      };
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
          { role: 'user', content: query }
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
        error: error.message
      })
    };
  }
};

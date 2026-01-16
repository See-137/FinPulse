/**
 * FinPulse News Service v2.0
 * Multi-provider news with fallback chain: GNews -> NewsAPI -> Static Fallback
 * Includes response caching to minimize API calls
 */

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

// API key cache
let gnewsApiKey = null;
let newsApiKey = null;
let keysCacheTime = 0;
const KEYS_CACHE_TTL = 300000; // 5 minutes

// News response cache (critical for avoiding rate limits)
let newsCache = {};
const NEWS_CACHE_TTL = 600000; // 10 minutes - cache news responses

async function getApiKeys() {
    const now = Date.now();
    if (gnewsApiKey && newsApiKey && (now - keysCacheTime) < KEYS_CACHE_TTL) {
        return { gnewsApiKey, newsApiKey };
    }
    
    const env = process.env.ENVIRONMENT || 'prod';
    
    // Fetch both keys in parallel
    const [gnewsResult, newsApiResult] = await Promise.allSettled([
        secretsClient.send(new GetSecretValueCommand({ SecretId: `finpulse/${env}/gnews-api-key` })),
        secretsClient.send(new GetSecretValueCommand({ SecretId: `finpulse/${env}/newsapi-key` }))
    ]);
    
    if (gnewsResult.status === 'fulfilled') {
        try {
            const secretValue = gnewsResult.value.SecretString;
            try {
                const secret = JSON.parse(secretValue);
                gnewsApiKey = secret.api_key || secret.apiKey || secret.key || secretValue;
            } catch (parseErr) {
                gnewsApiKey = secretValue.trim();
            }
        } catch (e) { console.warn('Failed to parse GNews key'); }
    }
    
    if (newsApiResult.status === 'fulfilled') {
        try {
            const secretValue = newsApiResult.value.SecretString;
            try {
                const secret = JSON.parse(secretValue);
                newsApiKey = secret.api_key || secret.apiKey || secret.key || secretValue;
            } catch (parseErr) {
                newsApiKey = secretValue.trim();
            }
        } catch (e) { console.warn('Failed to parse NewsAPI key'); }
    }
    
    keysCacheTime = now;
    return { gnewsApiKey, newsApiKey };
}

// GNews API provider
async function fetchFromGNews(category, limit, apiKey) {
    const categoryMap = { 'crypto': 'business', 'stocks': 'business', 'markets': 'business', 'tech': 'technology' };
    const gnewsCategory = categoryMap[category] || 'business';
    
    const url = `https://gnews.io/api/v4/top-headlines?category=${gnewsCategory}&lang=en&max=${limit}&apikey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.errors) {
        throw new Error(data.errors[0] || 'GNews API error');
    }
    
    return (data.articles || []).map((article, index) => ({
        id: `gnews-${Date.now()}-${index}`,
        title: article.title,
        description: article.description,
        content: article.content,
        source: article.source?.name || 'Unknown',
        url: article.url,
        image: article.image,
        publishedAt: article.publishedAt,
        category: category
    }));
}

// NewsAPI provider (fallback)
async function fetchFromNewsAPI(category, limit, apiKey) {
    const categoryMap = { 'crypto': 'bitcoin OR cryptocurrency', 'stocks': 'stock market OR trading', 'markets': 'financial markets', 'tech': 'technology', 'business': 'business finance' };
    const query = categoryMap[category] || 'finance business';
    
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=${limit}&apiKey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'ok') {
        throw new Error(data.message || 'NewsAPI error');
    }
    
    return (data.articles || []).map((article, index) => ({
        id: `newsapi-${Date.now()}-${index}`,
        title: article.title,
        description: article.description,
        content: article.content,
        source: article.source?.name || 'Unknown',
        url: article.url,
        image: article.urlToImage,
        publishedAt: article.publishedAt,
        category: category
    }));
}

// Static fallback news (always works)
function getStaticFallbackNews(category) {
    const now = new Date().toISOString();
    return [
        { id: 'static-1', title: 'Markets Show Mixed Signals Amid Economic Uncertainty', description: 'Global markets continue to navigate uncertain waters as investors weigh economic data and central bank policies.', source: 'FinPulse', url: '#', image: null, publishedAt: now, category },
        { id: 'static-2', title: 'Cryptocurrency Market Update: Key Levels to Watch', description: 'Digital assets maintain steady trading as institutional interest continues to grow in the sector.', source: 'FinPulse', url: '#', image: null, publishedAt: now, category },
        { id: 'static-3', title: 'Federal Reserve Policy Decisions Impact Markets', description: 'Central bank decisions continue to influence investor sentiment and market movements globally.', source: 'FinPulse', url: '#', image: null, publishedAt: now, category },
        { id: 'static-4', title: 'Tech Sector Leads Market Recovery', description: 'Technology stocks show resilience as quarterly earnings season approaches with optimistic forecasts.', source: 'FinPulse', url: '#', image: null, publishedAt: now, category },
        { id: 'static-5', title: 'Global Trade Developments Affect Currency Markets', description: 'International trade negotiations and economic policies continue to impact foreign exchange rates.', source: 'FinPulse', url: '#', image: null, publishedAt: now, category }
    ];
}

// Main fetch function with fallback chain
async function fetchNews(category = 'business', limit = 10) {
    // Check cache first
    const cacheKey = `${category}-${limit}`;
    const cached = newsCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp) < NEWS_CACHE_TTL) {
        console.log('Returning cached news for:', cacheKey);
        return { articles: cached.articles, source: cached.source, fromCache: true };
    }
    
    const { gnewsApiKey, newsApiKey } = await getApiKeys();
    let articles = [];
    let source = 'fallback';
    
    // Try GNews first
    if (gnewsApiKey) {
        try {
            console.log('Trying GNews API...');
            articles = await fetchFromGNews(category, limit, gnewsApiKey);
            source = 'gnews';
            console.log('GNews success:', articles.length, 'articles');
        } catch (error) {
            console.warn('GNews failed:', error.message);
        }
    }
    
    // Fallback to NewsAPI
    if (articles.length === 0 && newsApiKey) {
        try {
            console.log('Trying NewsAPI as fallback...');
            articles = await fetchFromNewsAPI(category, limit, newsApiKey);
            source = 'newsapi';
            console.log('NewsAPI success:', articles.length, 'articles');
        } catch (error) {
            console.warn('NewsAPI failed:', error.message);
        }
    }
    
    // Final fallback to static content
    if (articles.length === 0) {
        console.log('Using static fallback news');
        articles = getStaticFallbackNews(category);
        source = 'static';
    }
    
    // Cache the result
    newsCache[cacheKey] = { articles, source, timestamp: Date.now() };
    
    return { articles, source, fromCache: false };
}

// Search function with fallback
async function searchNews(query, limit = 10) {
    const cacheKey = `search-${query}-${limit}`;
    const cached = newsCache[cacheKey];
    if (cached && (Date.now() - cached.timestamp) < NEWS_CACHE_TTL) {
        return { articles: cached.articles, source: cached.source, fromCache: true };
    }
    
    const { gnewsApiKey, newsApiKey } = await getApiKeys();
    let articles = [];
    let source = 'fallback';
    
    // Try GNews search
    if (gnewsApiKey) {
        try {
            const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&lang=en&max=${limit}&apikey=${gnewsApiKey}`;
            const response = await fetch(url);
            const data = await response.json();
            if (!data.errors && data.articles) {
                articles = data.articles.map((a, i) => ({
                    id: `gnews-search-${Date.now()}-${i}`, title: a.title, description: a.description,
                    source: a.source?.name || 'Unknown', url: a.url, image: a.image, publishedAt: a.publishedAt
                }));
                source = 'gnews';
            }
        } catch (e) { console.warn('GNews search failed:', e.message); }
    }
    
    // Fallback to NewsAPI search
    if (articles.length === 0 && newsApiKey) {
        try {
            const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=relevancy&pageSize=${limit}&apiKey=${newsApiKey}`;
            const response = await fetch(url);
            const data = await response.json();
            if (data.status === 'ok' && data.articles) {
                articles = data.articles.map((a, i) => ({
                    id: `newsapi-search-${Date.now()}-${i}`, title: a.title, description: a.description,
                    source: a.source?.name || 'Unknown', url: a.url, image: a.urlToImage, publishedAt: a.publishedAt
                }));
                source = 'newsapi';
            }
        } catch (e) { console.warn('NewsAPI search failed:', e.message); }
    }
    
    // Static fallback for search
    if (articles.length === 0) {
        articles = getStaticFallbackNews('search').map(a => ({ ...a, title: `${query}: ${a.title}` }));
        source = 'static';
    }
    
    newsCache[cacheKey] = { articles, source, timestamp: Date.now() };
    return { articles, source, fromCache: false };
}

/**
 * Sanitize event for logging (remove sensitive headers)
 */
function sanitizeEvent(event) {
  const sanitized = { ...event };
  if (sanitized.headers) {
    sanitized.headers = { ...sanitized.headers };
    delete sanitized.headers.Authorization;
    delete sanitized.headers.authorization;
    delete sanitized.headers.Cookie;
    delete sanitized.headers.cookie;
  }
  if (sanitized.multiValueHeaders) {
    sanitized.multiValueHeaders = { ...sanitized.multiValueHeaders };
    delete sanitized.multiValueHeaders.Authorization;
    delete sanitized.multiValueHeaders.authorization;
  }
  return sanitized;
}

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(sanitizeEvent(event)));

    // SECURITY FIX: Restrict CORS to allowed origin only (no wildcard)
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://finpulse.me',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,OPTIONS',
        'Access-Control-Allow-Credentials': 'true'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const path = event.path || '';
        const queryParams = event.queryStringParameters || {};
        
        // GET /news/latest or /news
        if (path.includes('/latest') || path.endsWith('/news') || path.match(/\/news\/[^/]*$/)) {
            const category = queryParams.category || 'business';
            const limit = Math.min(parseInt(queryParams.limit) || 10, 20);
            
            const { articles, source, fromCache } = await fetchNews(category, limit);
            
            return {
                statusCode: 200, headers,
                body: JSON.stringify({
                    success: true,
                    articles: articles,
                    count: articles.length,
                    source: source,
                    cached: fromCache,
                    timestamp: new Date().toISOString()
                })
            };
        }
        
        // GET /news/search?q=bitcoin
        if (path.includes('/search')) {
            const query = queryParams.q || queryParams.query || 'finance';
            const limit = Math.min(parseInt(queryParams.limit) || 10, 20);
            
            const { articles, source, fromCache } = await searchNews(query, limit);
            
            return {
                statusCode: 200, headers,
                body: JSON.stringify({
                    success: true,
                    articles: articles,
                    count: articles.length,
                    query: query,
                    source: source,
                    cached: fromCache,
                    timestamp: new Date().toISOString()
                })
            };
        }
        
        // GET /news/categories
        if (path.includes('/categories')) {
            return {
                statusCode: 200, headers,
                body: JSON.stringify({ success: true, categories: ['crypto', 'stocks', 'business', 'markets', 'tech', 'all'] })
            };
        }
        
        // Default
        return {
            statusCode: 200, headers,
            body: JSON.stringify({
                service: 'news',
                version: '2.0.0',
                providers: ['gnews.io', 'newsapi.org', 'static-fallback'],
                endpoints: ['GET /news/latest', 'GET /news/search?q=query', 'GET /news/categories']
            })
        };
        
    } catch (error) {
        console.error('News Error:', error);
        
        // Even on error, return static fallback so users always see something
        const fallbackNews = getStaticFallbackNews('business');
        return {
            statusCode: 200, // Return 200 with fallback data instead of 500
            headers,
            body: JSON.stringify({
                success: true,
                articles: fallbackNews,
                count: fallbackNews.length,
                source: 'static',
                cached: false,
                timestamp: new Date().toISOString()
            })
        };
    }
};

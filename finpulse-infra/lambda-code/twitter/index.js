/**
 * FinPulse Twitter/X API Proxy Service
 * Proxies Twitter API v2 requests to avoid CORS issues
 *
 * Endpoints:
 * - GET /twitter/tweets?usernames=elonmusk,saylor&keywords=BTC,ETH - Search tweets
 * - GET /twitter/user/:username/tweets - Get user's recent tweets
 */

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

// Bearer token cache
let bearerToken = null;
let tokenCacheTime = 0;
const TOKEN_CACHE_TTL = 300000; // 5 minutes

// Response cache to minimize API calls
const tweetsCache = new Map();
const TWEETS_CACHE_TTL = 300000; // 5 minutes

const TWITTER_API_BASE = 'https://api.twitter.com/2';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Content-Type': 'application/json'
};

/**
 * Get Twitter Bearer Token from Secrets Manager
 */
async function getBearerToken() {
    const now = Date.now();
    if (bearerToken && (now - tokenCacheTime) < TOKEN_CACHE_TTL) {
        return bearerToken;
    }

    const env = process.env.ENVIRONMENT || 'prod';

    try {
        const result = await secretsClient.send(new GetSecretValueCommand({
            SecretId: `finpulse/${env}/twitter-bearer-token`
        }));

        const secretValue = result.SecretString;
        try {
            const secret = JSON.parse(secretValue);
            bearerToken = secret.bearer_token || secret.bearerToken || secret.token || secretValue;
        } catch (parseErr) {
            bearerToken = secretValue.trim();
        }

        // URL-decode the token if it contains encoded characters (e.g., %3D for =)
        if (bearerToken && bearerToken.includes('%')) {
            try {
                bearerToken = decodeURIComponent(bearerToken);
                console.log('Bearer token was URL-decoded');
            } catch (decodeErr) {
                console.log('Bearer token decode not needed or failed:', decodeErr.message);
            }
        }

        tokenCacheTime = now;
        return bearerToken;
    } catch (error) {
        console.error('Failed to get Twitter bearer token:', error);
        throw new Error('Twitter API not configured');
    }
}

/**
 * Search tweets from multiple users with optional keywords
 */
async function searchTweets(usernames, keywords, maxResults = 20) {
    const token = await getBearerToken();

    // Build query: (from:user1 OR from:user2) optionally with (keyword1 OR keyword2)
    // If no keywords provided, just fetch recent tweets from these users
    const userPart = usernames.map(u => `from:${u}`).join(' OR ');
    const keywordPart = keywords.length > 0 ? ` (${keywords.join(' OR ')})` : '';
    const query = `(${userPart})${keywordPart} -is:retweet`;

    console.log('Twitter search query:', query);
    console.log('Query length:', query.length, '(max 512)');

    // Check cache
    const cacheKey = `search:${query}:${maxResults}`;
    const cached = tweetsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < TWEETS_CACHE_TTL) {
        console.log('Returning cached search results');
        return cached.data;
    }

    const url = new URL(`${TWITTER_API_BASE}/tweets/search/recent`);
    url.searchParams.append('query', query);
    // Twitter API requires max_results between 10 and 100
    url.searchParams.append('max_results', Math.max(10, Math.min(maxResults, 100)).toString());
    url.searchParams.append('tweet.fields', 'created_at,public_metrics,author_id');
    url.searchParams.append('expansions', 'author_id');
    url.searchParams.append('user.fields', 'username,name');

    const response = await fetch(url.toString(), {
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        if (response.status === 429) {
            throw new Error('Twitter rate limit exceeded');
        }
        const errorText = await response.text();
        console.error('Twitter API error:', response.status, errorText);
        throw new Error(`Twitter API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform response
    const tweets = transformTweets(data);

    // Cache results
    tweetsCache.set(cacheKey, { data: tweets, timestamp: Date.now() });

    return tweets;
}

/**
 * Get tweets from a specific user
 */
async function getUserTweets(username, maxResults = 10) {
    const token = await getBearerToken();

    // Check cache
    const cacheKey = `user:${username}:${maxResults}`;
    const cached = tweetsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < TWEETS_CACHE_TTL) {
        console.log('Returning cached user tweets');
        return cached.data;
    }

    // First get user ID
    const userUrl = `${TWITTER_API_BASE}/users/by/username/${username}`;
    const userResponse = await fetch(userUrl, {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!userResponse.ok) {
        throw new Error(`Failed to get user ID for @${username}`);
    }

    const userData = await userResponse.json();
    const userId = userData.data.id;

    // Get tweets
    const url = new URL(`${TWITTER_API_BASE}/users/${userId}/tweets`);
    url.searchParams.append('max_results', Math.min(maxResults, 100).toString());
    url.searchParams.append('tweet.fields', 'created_at,public_metrics');
    url.searchParams.append('exclude', 'retweets,replies');

    const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
        throw new Error(`Twitter API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform and add username
    const tweets = (data.data || []).map(tweet => ({
        id: tweet.id,
        authorUsername: username,
        text: tweet.text,
        createdAt: tweet.created_at,
        metrics: {
            likes: tweet.public_metrics?.like_count || 0,
            retweets: tweet.public_metrics?.retweet_count || 0,
            replies: tweet.public_metrics?.reply_count || 0,
            views: tweet.public_metrics?.impression_count || null,
        },
        mentionedSymbols: extractSymbols(tweet.text),
    }));

    // Cache results
    tweetsCache.set(cacheKey, { data: tweets, timestamp: Date.now() });

    return tweets;
}

/**
 * Transform Twitter API response to internal format
 */
function transformTweets(data) {
    if (!data.data || data.data.length === 0) {
        return [];
    }

    // Map author IDs to usernames
    const userMap = new Map();
    if (data.includes?.users) {
        for (const user of data.includes.users) {
            userMap.set(user.id, user.username);
        }
    }

    return data.data.map(tweet => ({
        id: tweet.id,
        authorUsername: userMap.get(tweet.author_id) || 'unknown',
        text: tweet.text,
        createdAt: tweet.created_at,
        metrics: {
            likes: tweet.public_metrics?.like_count || 0,
            retweets: tweet.public_metrics?.retweet_count || 0,
            replies: tweet.public_metrics?.reply_count || 0,
            views: tweet.public_metrics?.impression_count || null,
        },
        mentionedSymbols: extractSymbols(tweet.text),
    }));
}

/**
 * Extract mentioned symbols from tweet text
 */
function extractSymbols(text) {
    const symbols = [];
    const patterns = [
        /\$([A-Z]{2,5})\b/g,
        /\b(BTC|ETH|USDT|USDC|BNB|XRP|ADA|SOL|DOGE|MATIC|DOT|AVAX|SHIB|LTC|UNI|NVDA|AAPL|MSFT|TSLA|GOOGL|AMZN|PLTR|MSTR)\b/gi,
    ];

    for (const pattern of patterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
            const symbol = match[1].toUpperCase();
            if (!symbols.includes(symbol)) {
                symbols.push(symbol);
            }
        }
    }

    return symbols;
}

/**
 * Lambda handler
 */
exports.handler = async (event) => {
    console.log('Twitter Lambda invoked:', JSON.stringify(event, null, 2));

    // Handle OPTIONS (CORS preflight)
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: corsHeaders, body: '' };
    }

    try {
        const path = event.path || '';
        const queryParams = event.queryStringParameters || {};

        // GET /twitter/tweets?usernames=x,y&keywords=BTC,ETH
        if (path.endsWith('/tweets') && event.httpMethod === 'GET') {
            const usernames = (queryParams.usernames || '').split(',').filter(Boolean);
            const keywords = (queryParams.keywords || '').split(',').filter(Boolean);
            const maxResults = parseInt(queryParams.max_results || '20', 10);

            if (usernames.length === 0) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: 'usernames parameter required' })
                };
            }

            const tweets = await searchTweets(usernames, keywords, maxResults);

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    tweets,
                    count: tweets.length,
                    cached: false
                })
            };
        }

        // GET /twitter/user/:username
        const userMatch = path.match(/\/twitter\/user\/([^\/]+)/);
        if (userMatch && event.httpMethod === 'GET') {
            const username = userMatch[1];
            const maxResults = parseInt(queryParams.max_results || '10', 10);

            const tweets = await getUserTweets(username, maxResults);

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    success: true,
                    tweets,
                    count: tweets.length
                })
            };
        }

        // Unknown endpoint
        return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Not found' })
        };

    } catch (error) {
        console.error('Twitter Lambda error:', error);

        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                success: false,
                error: error.message || 'Internal server error'
            })
        };
    }
};

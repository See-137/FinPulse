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
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://finpulse.me',
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
 * Handles Twitter's 512 character query limit by batching users
 */
async function searchTweets(usernames, keywords, maxResults = 20) {
    const token = await getBearerToken();

    // Twitter API has 512 char query limit
    // We need to batch usernames to stay under the limit
    const MAX_QUERY_LENGTH = 512;
    const SUFFIX = ' -is:retweet';
    const keywordPart = keywords.length > 0 ? ` (${keywords.join(' OR ')})` : '';

    // Calculate how many usernames we can fit per batch
    // Each username takes ~"from:username OR " = ~20-30 chars average
    // Reserve space for parentheses, keywords, and suffix
    const reservedLength = 2 + keywordPart.length + SUFFIX.length + 10; // 10 for safety margin
    const availableLength = MAX_QUERY_LENGTH - reservedLength;

    // Split usernames into batches that fit within query limit
    const batches = [];
    let currentBatch = [];
    let currentLength = 0;

    for (const username of usernames) {
        const addition = currentBatch.length === 0
            ? `from:${username}`.length
            : ` OR from:${username}`.length;

        if (currentLength + addition > availableLength && currentBatch.length > 0) {
            batches.push(currentBatch);
            currentBatch = [username];
            currentLength = `from:${username}`.length;
        } else {
            currentBatch.push(username);
            currentLength += addition;
        }
    }
    if (currentBatch.length > 0) {
        batches.push(currentBatch);
    }

    console.log(`Split ${usernames.length} usernames into ${batches.length} batches`);

    // Check cache for full request
    const cacheKey = `search:${usernames.sort().join(',')}:${keywords.join(',')}:${maxResults}`;
    const cached = tweetsCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < TWEETS_CACHE_TTL) {
        console.log('Returning cached search results');
        return cached.data;
    }

    // Fetch tweets from each batch (max 2 batches to avoid rate limits)
    const batchesToFetch = batches.slice(0, 2);
    const allTweets = [];
    let rateLimited = false;

    for (const batch of batchesToFetch) {
        const userPart = batch.map(u => `from:${u}`).join(' OR ');
        const query = `(${userPart})${keywordPart}${SUFFIX}`;

        console.log('Twitter search query:', query);
        console.log('Query length:', query.length, '(max 512)');

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
                console.warn('Twitter rate limit hit');
                rateLimited = true;
                break; // Stop fetching, try to return cached/partial data
            }
            const errorText = await response.text();
            console.error('Twitter API error:', response.status, errorText);
            continue; // Try next batch
        }

        const data = await response.json();
        const tweets = transformTweets(data);
        allTweets.push(...tweets);
    }

    // If rate limited and we got nothing, try to return stale cache (up to 30 min old)
    if (rateLimited && allTweets.length === 0 && cached) {
        const STALE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
        if ((Date.now() - cached.timestamp) < STALE_CACHE_TTL) {
            console.log('Rate limited - returning stale cached results');
            return cached.data;
        }
    }

    // Sort by created date and deduplicate
    const uniqueTweets = [...new Map(allTweets.map(t => [t.id, t])).values()]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, maxResults);

    // Only cache if we got results
    if (uniqueTweets.length > 0) {
        tweetsCache.set(cacheKey, { data: uniqueTweets, timestamp: Date.now() });
    }

    return uniqueTweets;
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
    // Sanitize event for logging (remove sensitive headers)
    const sanitized = { ...event, headers: { ...event.headers } };
    delete sanitized.headers.Authorization;
    delete sanitized.headers.authorization;
    console.log('Twitter Lambda invoked:', JSON.stringify(sanitized, null, 2));

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
                error: process.env.ENVIRONMENT !== 'prod' ? (error.message || 'Internal server error') : 'Internal server error'
            })
        };
    }
};

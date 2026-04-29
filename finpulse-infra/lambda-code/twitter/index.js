// Redeploy trigger: ship security review fixes from PR #63 (commit 575e0460) that were blocked at the old approval gate.
/**
 * FinPulse Twitter/X API Proxy Service
 * Proxies Twitter API v2 requests to avoid CORS issues
 *
 * Endpoints:
 * - GET /twitter/tweets?usernames=elonmusk,saylor&keywords=BTC,ETH - Search tweets
 * - GET /twitter/user/:username/tweets - Get user's recent tweets
 *
 * Caching strategy (two-tier):
 *   Tier 1 — In-memory Map (5 min TTL, per-instance, fastest)
 *   Tier 2 — DynamoDB finpulse-api-cache-{env} (15 min TTL, survives cold starts)
 * On rate-limit: DynamoDB stale fallback up to 2 hours old
 */

const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

const secretsClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

// DynamoDB client — shared layer has the SDK, Twitter Lambda's package.json
// does not list it explicitly, but Lambda layers expose it at runtime.
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const ddb = DynamoDBDocumentClient.from(ddbClient);

const API_CACHE_TABLE = process.env.API_CACHE_TABLE || `finpulse-api-cache-${process.env.ENVIRONMENT || 'prod'}`;
const API_QUOTA_TABLE = process.env.API_QUOTA_TABLE || `finpulse-api-quota-${process.env.ENVIRONMENT || 'prod'}`;

// TTLs
const DDB_CACHE_TTL_SECONDS  = 15 * 60;      // 15 min — normal DynamoDB write TTL
const DDB_STALE_TTL_SECONDS  = 2 * 60 * 60;  // 2 hours — stale fallback on rate-limit

// Bearer token cache
let bearerToken = null;
let tokenCacheTime = 0;
const TOKEN_CACHE_TTL = 300000; // 5 minutes

// Tier-1 in-memory response cache
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

// ─────────────────────────────────────────────────────────────────────────────
// DynamoDB cache helpers — all non-fatal (failures fall through to live API)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read a cache entry. Returns null on miss, error, or expired item.
 * Performs a client-side expiry check to handle DynamoDB's eventual-consistent TTL.
 */
async function ddbGet(cacheKey) {
    try {
        const result = await ddb.send(new GetCommand({
            TableName: API_CACHE_TABLE,
            Key: { cacheKey }
        }));
        const item = result.Item;
        if (!item || !item.data) return null;
        // Guard against DynamoDB TTL lag (eventually consistent deletion)
        if (item.expiresAt && Math.floor(Date.now() / 1000) > item.expiresAt) return null;
        return { data: item.data, timestamp: item.cachedAt || Date.now() };
    } catch (err) {
        console.warn('DynamoDB get failed (non-fatal):', err.message);
        return null;
    }
}

/**
 * Read a cache entry ignoring its TTL, but respecting a custom stale window.
 * Used as a last resort on rate-limit when the item may already be "expired"
 * by DynamoDB but is still recent enough to show.
 */
async function ddbGetStale(cacheKey, staleWindowSeconds) {
    try {
        const result = await ddb.send(new GetCommand({
            TableName: API_CACHE_TABLE,
            Key: { cacheKey }
        }));
        const item = result.Item;
        if (!item || !item.data || !item.cachedAt) return null;
        const ageSeconds = (Date.now() - item.cachedAt) / 1000;
        if (ageSeconds > staleWindowSeconds) return null;
        return { data: item.data, timestamp: item.cachedAt };
    } catch (err) {
        console.warn('DynamoDB stale get failed (non-fatal):', err.message);
        return null;
    }
}

/**
 * Write a cache entry with an explicit TTL (Unix epoch seconds for DynamoDB TTL).
 */
async function ddbPut(cacheKey, data, ttlSeconds) {
    try {
        await ddb.send(new PutCommand({
            TableName: API_CACHE_TABLE,
            Item: {
                cacheKey,
                data,
                cachedAt: Date.now(),
                expiresAt: Math.floor(Date.now() / 1000) + ttlSeconds
            }
        }));
    } catch (err) {
        console.warn('DynamoDB put failed (non-fatal):', err.message);
    }
}

/**
 * Increment a daily request counter in the quota table.
 * Fire-and-forget — never blocks the response.
 */
function trackQuotaUsage() {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    ddb.send(new UpdateCommand({
        TableName: API_QUOTA_TABLE,
        Key: { providerDate: `twitter#${today}` },
        UpdateExpression: 'ADD #cnt :one SET #provider = :p, expiresAt = if_not_exists(expiresAt, :ttl)',
        ExpressionAttributeNames: { '#cnt': 'requestCount', '#provider': 'provider' },
        ExpressionAttributeValues: {
            ':one': 1,
            ':p': 'twitter',
            ':ttl': Math.floor(Date.now() / 1000) + 90 * 24 * 3600 // 90-day retention
        }
    })).catch(err => console.warn('Quota tracking failed (non-fatal):', err.message));
}

// ─────────────────────────────────────────────────────────────────────────────
// Twitter API helpers
// ─────────────────────────────────────────────────────────────────────────────

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
 * Search tweets from multiple users with optional keywords.
 * Handles Twitter's 512-character query limit by batching users.
 *
 * Cache hierarchy:
 *   1. In-memory (5 min) — fastest, resets on cold start
 *   2. DynamoDB (15 min) — survives cold starts, shared across concurrent instances
 *   3. Live Twitter API — counted against monthly quota
 *   4. DynamoDB stale (2 h) — last resort on rate-limit
 *   5. In-memory stale (30 min) — final fallback on rate-limit
 */
async function searchTweets(usernames, keywords, maxResults = 20) {
    const token = await getBearerToken();

    // Stable cache key — sort usernames so order doesn't matter
    const cacheKey = `twitter:search:${[...usernames].sort().join(',')}:${keywords.join(',')}:${maxResults}`;

    // ── Tier 1: in-memory ────────────────────────────────────────────────────
    const memCached = tweetsCache.get(cacheKey);
    if (memCached && (Date.now() - memCached.timestamp) < TWEETS_CACHE_TTL) {
        console.log('Returning in-memory cached results');
        return memCached.data;
    }

    // ── Tier 2: DynamoDB ─────────────────────────────────────────────────────
    const ddbCached = await ddbGet(cacheKey);
    if (ddbCached) {
        console.log('Returning DynamoDB cached results');
        tweetsCache.set(cacheKey, ddbCached); // seed in-memory for subsequent requests
        return ddbCached.data;
    }

    // ── Tier 3: Live Twitter API ──────────────────────────────────────────────
    // Twitter API has 512 char query limit — batch usernames to stay under it
    const MAX_QUERY_LENGTH = 512;
    const SUFFIX = ' -is:retweet';
    const keywordPart = keywords.length > 0 ? ` (${keywords.join(' OR ')})` : '';

    const reservedLength = 2 + keywordPart.length + SUFFIX.length + 10; // 10 for safety margin
    const availableLength = MAX_QUERY_LENGTH - reservedLength;

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
            headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
            if (response.status === 429) {
                console.warn('Twitter rate limit hit');
                rateLimited = true;
                break; // Stop fetching, fall through to stale cache
            }
            const errorText = await response.text();
            console.error('Twitter API error:', response.status, errorText);
            continue; // Try next batch
        }

        const data = await response.json();
        const tweets = transformTweets(data);
        allTweets.push(...tweets);

        // Count each successful API call toward the daily quota
        trackQuotaUsage();
    }

    // ── Rate-limited fallback ─────────────────────────────────────────────────
    if (rateLimited && allTweets.length === 0) {
        // Tier 4: DynamoDB stale (2-hour window, ignores TTL expiry)
        const ddbStale = await ddbGetStale(cacheKey, DDB_STALE_TTL_SECONDS);
        if (ddbStale) {
            console.log('Rate limited — returning DynamoDB stale results');
            return ddbStale.data;
        }
        // Tier 5: in-memory stale (30-minute window)
        if (memCached) {
            const STALE_MEM_TTL = 30 * 60 * 1000;
            if ((Date.now() - memCached.timestamp) < STALE_MEM_TTL) {
                console.log('Rate limited — returning in-memory stale results');
                return memCached.data;
            }
        }
    }

    // Sort by created date and deduplicate
    const uniqueTweets = [...new Map(allTweets.map(t => [t.id, t])).values()]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, maxResults);

    // Write to both caches on success.
    // Await the DynamoDB put — Lambda freezes the runtime between invocations,
    // so an unawaited promise can be dropped before the write actually flushes,
    // leaving the cache unpopulated and re-spending Twitter API quota next call.
    // ddbPut has its own try/catch so a DDB failure won't bubble up.
    if (uniqueTweets.length > 0) {
        tweetsCache.set(cacheKey, { data: uniqueTweets, timestamp: Date.now() });
        await ddbPut(cacheKey, uniqueTweets, DDB_CACHE_TTL_SECONDS);
    }

    return uniqueTweets;
}

/**
 * Get tweets from a specific user
 */
async function getUserTweets(username, maxResults = 10) {
    const token = await getBearerToken();

    // Check in-memory cache
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
    trackQuotaUsage();

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
    console.log('Twitter Lambda invoked:', event.httpMethod, event.path);

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

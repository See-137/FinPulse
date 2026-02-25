/**
 * FinPulse Portfolio Snapshot Lambda
 *
 * Triggered daily by CloudWatch Events (cron: 0 21 * * ? *)
 * - Scans all users with holdings
 * - Fetches current market prices
 * - Stores daily portfolio value snapshot in DynamoDB
 *
 * Idempotent: skips users who already have today's snapshot.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const https = require('https');

// Environment
const ENVIRONMENT = process.env.ENVIRONMENT || 'prod';
const USERS_TABLE = process.env.USERS_TABLE || `finpulse-users-${ENVIRONMENT}`;
const PORTFOLIO_TABLE = process.env.PORTFOLIO_TABLE || `finpulse-portfolio-${ENVIRONMENT}`;
const SNAPSHOTS_TABLE = process.env.SNAPSHOTS_TABLE || `finpulse-portfolio-snapshots-${ENVIRONMENT}`;
const MARKET_DATA_URL = process.env.MARKET_DATA_URL || 'https://b3fgmin9yj.execute-api.us-east-1.amazonaws.com/prod';

// DynamoDB client (lazy init)
let docClient = null;

function getDocClient() {
  if (!docClient) {
    const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    docClient = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true }
    });
  }
  return docClient;
}

/**
 * Get today's date string in YYYY-MM-DD format (UTC)
 */
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Fetch market prices for a list of symbols via the market-data API
 */
async function fetchPrices(symbols, type = 'stock') {
  return new Promise((resolve) => {
    const symbolsParam = encodeURIComponent(symbols.join(','));
    const url = `${MARKET_DATA_URL}/market/prices?symbols=${symbolsParam}&type=${type}`;

    const req = https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.success && parsed.prices) {
            resolve(parsed.prices);
          } else {
            resolve({});
          }
        } catch {
          resolve({});
        }
      });
    });

    req.on('error', () => resolve({}));
    req.on('timeout', () => { req.destroy(); resolve({}); });
  });
}

/**
 * Get all users who have portfolio holdings
 */
async function getUsersWithHoldings() {
  const db = getDocClient();
  const users = [];
  let lastKey;

  do {
    const result = await db.send(new ScanCommand({
      TableName: PORTFOLIO_TABLE,
      ProjectionExpression: 'userId',
      ...(lastKey && { ExclusiveStartKey: lastKey })
    }));

    if (result.Items) {
      // Deduplicate userIds (portfolio table may have multiple items per user)
      const userIds = [...new Set(result.Items.map(i => i.userId))];
      users.push(...userIds);
    }
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  return [...new Set(users)];
}

/**
 * Get holdings for a user
 */
async function getUserHoldings(userId) {
  const db = getDocClient();
  const result = await db.send(new ScanCommand({
    TableName: PORTFOLIO_TABLE,
    FilterExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId }
  }));
  return result.Items || [];
}

/**
 * Check if snapshot already exists for user + date
 */
async function snapshotExists(userId, date) {
  const db = getDocClient();
  try {
    const result = await db.send(new GetCommand({
      TableName: SNAPSHOTS_TABLE,
      Key: { userId, date }
    }));
    return !!result.Item;
  } catch {
    return false;
  }
}

/**
 * Store a portfolio snapshot
 */
async function storeSnapshot(userId, date, totalValue, holdings) {
  const db = getDocClient();
  const ttl = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year TTL

  await db.send(new PutCommand({
    TableName: SNAPSHOTS_TABLE,
    Item: {
      userId,
      date,
      totalValue,
      holdings: holdings.map(h => ({
        symbol: h.symbol,
        type: h.type || 'STOCK',
        quantity: h.quantity,
        price: h.currentPrice || 0,
        value: (h.currentPrice || 0) * (h.quantity || 0)
      })),
      createdAt: new Date().toISOString(),
      ttl
    }
  }));
}

/**
 * Main handler — triggered by CloudWatch Events
 */
exports.handler = async (event) => {
  const today = getTodayDate();
  console.log(`[Snapshot] Starting daily snapshot for ${today}`);

  try {
    // 1. Get all users with holdings
    const userIds = await getUsersWithHoldings();
    console.log(`[Snapshot] Found ${userIds.length} users with holdings`);

    let processed = 0;
    let skipped = 0;
    let errors = 0;

    // 2. Process each user
    for (const userId of userIds) {
      try {
        // Idempotency: skip if already snapshotted today
        if (await snapshotExists(userId, today)) {
          skipped++;
          continue;
        }

        // Get user's holdings
        const holdings = await getUserHoldings(userId);
        if (holdings.length === 0) {
          skipped++;
          continue;
        }

        // Separate stocks and crypto
        const stocks = holdings.filter(h => (h.type || '').toUpperCase() === 'STOCK');
        const cryptos = holdings.filter(h => (h.type || '').toUpperCase() === 'CRYPTO');
        const commodities = holdings.filter(h => (h.type || '').toUpperCase() === 'COMMODITY');

        // Fetch prices
        const stockPrices = stocks.length > 0
          ? await fetchPrices(stocks.map(h => h.symbol), 'stock')
          : {};
        const cryptoPrices = cryptos.length > 0
          ? await fetchPrices(cryptos.map(h => h.symbol), 'crypto')
          : {};

        // Merge prices into holdings
        const enrichedHoldings = holdings.map(h => {
          const priceMap = (h.type || '').toUpperCase() === 'CRYPTO' ? cryptoPrices : stockPrices;
          const priceData = priceMap[h.symbol] || priceMap[h.symbol?.toUpperCase()];
          return {
            ...h,
            currentPrice: priceData?.price || h.currentPrice || 0
          };
        });

        // Calculate total value
        const totalValue = enrichedHoldings.reduce(
          (sum, h) => sum + ((h.currentPrice || 0) * (h.quantity || 0)),
          0
        );

        // Store snapshot
        await storeSnapshot(userId, today, totalValue, enrichedHoldings);
        processed++;

      } catch (err) {
        console.error(`[Snapshot] Error processing user ${userId}:`, err.message);
        errors++;
      }
    }

    const summary = { today, total: userIds.length, processed, skipped, errors };
    console.log(`[Snapshot] Complete:`, JSON.stringify(summary));

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, ...summary })
    };

  } catch (err) {
    console.error('[Snapshot] Fatal error:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message })
    };
  }
};

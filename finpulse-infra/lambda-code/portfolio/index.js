/**
 * FinPulse Portfolio Service
 * Manages user portfolios, holdings, and transactions
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');

// Alpaca service for live price data
let alpacaService = null;
try {
  alpacaService = require('./alpaca-service');
  console.log('Alpaca service loaded for live price sync');
} catch (e) {
  try {
    alpacaService = require('../shared/alpaca-service');
    console.log('Alpaca service loaded from shared');
  } catch (e2) {
    console.log('Alpaca service not available:', e2.message);
  }
}

// Validation utilities
let validation;
try {
  validation = require('./shared/validation');
} catch {
  // Fallback if shared module not copied yet
  validation = {
    validateHolding: (input) => ({ valid: true, data: input }),
    validateUserId: () => true,
    checkRateLimit: () => ({ allowed: true, remaining: 100 })
  };
}

// Redis cache for distributed rate limiting
let redisCache;
try {
  redisCache = require('./shared/redis-cache');
  console.log('Redis cache loaded for distributed rate limiting');
} catch {
  // Fallback if redis-cache module not available
  redisCache = {
    checkRateLimit: async () => ({ allowed: true, remaining: 100, resetIn: 60 })
  };
  console.log('Redis cache not available, using fallback');
}

// Initialize clients
const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);

const PORTFOLIOS_TABLE = `finpulse-portfolios-${process.env.ENVIRONMENT}`;
const USERS_TABLE = `finpulse-users-${process.env.ENVIRONMENT}`;

/**
 * CORS headers - Restricted to production domain only
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://finpulse.me',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
};

/**
 * Extract user ID from Cognito JWT
 */
function getUserIdFromEvent(event) {
  // From API Gateway with Cognito authorizer
  if (event.requestContext?.authorizer?.claims?.sub) {
    return event.requestContext.authorizer.claims.sub;
  }
  // From headers for testing
  if (event.headers?.['x-user-id']) {
    return event.headers['x-user-id'];
  }
  return null;
}

/**
 * Generate unique ID
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Fetch live prices for holdings from Alpaca
 * @param {Array} holdings - Array of holding objects with symbol and type
 * @returns {Object} - Map of symbol to price data
 */
async function fetchLivePrices(holdings) {
  if (!alpacaService || holdings.length === 0) {
    return {};
  }
  
  try {
    const symbols = holdings.map(h => h.symbol);
    const prices = await alpacaService.getQuotes(symbols);
    console.log(`[Portfolio] Fetched live prices for ${Object.keys(prices).length}/${symbols.length} symbols`);
    return prices;
  } catch (error) {
    console.error('[Portfolio] Failed to fetch live prices:', error.message);
    return {};
  }
}

/**
 * Get user's portfolio with live prices
 * Uses QueryCommand because table has composite key (userId + assetId)
 * @param {string} userId - User ID
 * @param {boolean} includeLivePrices - Whether to fetch live prices (default: true)
 */
async function getPortfolio(userId, includeLivePrices = true) {
  const result = await docClient.send(new QueryCommand({
    TableName: PORTFOLIOS_TABLE,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId
    }
  }));

  // Convert per-asset items to holdings array format
  let holdings = (result.Items || []).map(item => ({
    id: item.assetId,
    symbol: item.symbol,
    type: item.type || 'crypto',
    quantity: parseFloat(item.quantity) || 0,
    avgBuyPrice: parseFloat(item.avgCost) || 0,
    currentPrice: parseFloat(item.currentPrice) || 0,
    change24h: parseFloat(item.change24h) || 0,
    addedAt: item.addedAt || new Date().toISOString(),
    notes: item.notes || ''
  }));

  // Fetch and merge live prices
  if (includeLivePrices && holdings.length > 0) {
    const livePrices = await fetchLivePrices(holdings);
    
    holdings = holdings.map(h => {
      const liveData = livePrices[h.symbol];
      if (liveData) {
        return {
          ...h,
          currentPrice: liveData.price,
          change24h: liveData.change24h || 0,
          priceSource: 'alpaca',
          priceUpdatedAt: new Date().toISOString()
        };
      }
      return { ...h, priceSource: 'stored' };
    });
  }

  // Calculate total value with live prices
  const totalValue = holdings.reduce((sum, h) => {
    return sum + (h.quantity * (h.currentPrice || h.avgBuyPrice));
  }, 0);
  
  // Calculate total cost basis
  const totalCost = holdings.reduce((sum, h) => {
    return sum + (h.quantity * h.avgBuyPrice);
  }, 0);

  return {
    userId,
    holdings,
    totalValue,
    totalCost,
    totalPnL: totalValue - totalCost,
    totalPnLPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Add a holding to portfolio
 * Uses PutCommand with composite key (userId + assetId)
 */
async function addHolding(userId, holding) {
  const symbol = holding.symbol.toUpperCase();
  const assetId = symbol; // Use symbol as assetId
  
  const newItem = {
    userId,
    assetId,
    symbol,
    type: holding.type || 'crypto',
    quantity: parseFloat(holding.quantity),
    avgCost: parseFloat(holding.avgBuyPrice),
    currentPrice: parseFloat(holding.currentPrice) || 0,
    addedAt: new Date().toISOString(),
    notes: holding.notes || ''
  };

  await docClient.send(new PutCommand({
    TableName: PORTFOLIOS_TABLE,
    Item: newItem
  }));

  return {
    id: assetId,
    symbol,
    type: newItem.type,
    quantity: newItem.quantity,
    avgBuyPrice: newItem.avgCost,
    currentPrice: newItem.currentPrice,
    addedAt: newItem.addedAt,
    notes: newItem.notes
  };
}

/**
 * Update a holding
 * Uses UpdateCommand with composite key (userId + assetId)
 */
async function updateHolding(userId, holdingId, updates) {
  // Build update expression dynamically
  const updateParts = [];
  const expressionValues = {};
  const expressionNames = {};

  if (updates.quantity !== undefined) {
    updateParts.push('#quantity = :quantity');
    expressionValues[':quantity'] = parseFloat(updates.quantity);
    expressionNames['#quantity'] = 'quantity';
  }
  if (updates.avgBuyPrice !== undefined) {
    updateParts.push('avgCost = :avgCost');
    expressionValues[':avgCost'] = parseFloat(updates.avgBuyPrice);
  }
  if (updates.currentPrice !== undefined) {
    updateParts.push('currentPrice = :currentPrice');
    expressionValues[':currentPrice'] = parseFloat(updates.currentPrice);
  }
  if (updates.notes !== undefined) {
    updateParts.push('notes = :notes');
    expressionValues[':notes'] = updates.notes;
  }
  
  updateParts.push('updatedAt = :updatedAt');
  expressionValues[':updatedAt'] = new Date().toISOString();

  const params = {
    TableName: PORTFOLIOS_TABLE,
    Key: { userId, assetId: holdingId },
    UpdateExpression: 'SET ' + updateParts.join(', '),
    ExpressionAttributeValues: expressionValues,
    ReturnValues: 'ALL_NEW'
  };

  if (Object.keys(expressionNames).length > 0) {
    params.ExpressionAttributeNames = expressionNames;
  }

  const result = await docClient.send(new UpdateCommand(params));

  return {
    id: result.Attributes.assetId,
    symbol: result.Attributes.symbol,
    type: result.Attributes.type,
    quantity: result.Attributes.quantity,
    avgBuyPrice: result.Attributes.avgCost,
    currentPrice: result.Attributes.currentPrice,
    updatedAt: result.Attributes.updatedAt
  };
}

/**
 * Remove a holding
 * Uses DeleteCommand with composite key (userId + assetId)
 */
async function removeHolding(userId, holdingId) {
  await docClient.send(new DeleteCommand({
    TableName: PORTFOLIOS_TABLE,
    Key: { userId, assetId: holdingId }
  }));

  return { success: true, deleted: holdingId };
}

/**
 * Update holding prices (bulk)
 * Updates each asset individually with composite key
 */
async function updatePrices(userId, priceUpdates) {
  // Get current holdings
  const portfolio = await getPortfolio(userId);
  
  // Update each holding that has a price update
  for (const holding of portfolio.holdings) {
    const priceData = priceUpdates[holding.symbol];
    if (priceData) {
      await docClient.send(new UpdateCommand({
        TableName: PORTFOLIOS_TABLE,
        Key: { userId, assetId: holding.id },
        UpdateExpression: 'SET currentPrice = :price, change24h = :change, priceUpdatedAt = :updated',
        ExpressionAttributeValues: {
          ':price': priceData.price,
          ':change': priceData.change24h || 0,
          ':updated': new Date().toISOString()
        }
      }));
    }
  }

  // Get updated portfolio
  return await getPortfolio(userId);
}

/**
 * Get portfolio analytics
 */
function getAnalytics(portfolio) {
  const holdings = portfolio.holdings || [];
  
  if (holdings.length === 0) {
    return {
      totalValue: 0,
      totalCost: 0,
      totalPnL: 0,
      totalPnLPercent: 0,
      byType: {},
      topGainers: [],
      topLosers: []
    };
  }

  let totalValue = 0;
  let totalCost = 0;
  const byType = {};

  const holdingsWithPnL = holdings.map(h => {
    const currentValue = h.quantity * (h.currentPrice || h.avgBuyPrice);
    const costBasis = h.quantity * h.avgBuyPrice;
    const pnl = currentValue - costBasis;
    const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

    totalValue += currentValue;
    totalCost += costBasis;

    // Group by type
    if (!byType[h.type]) {
      byType[h.type] = { value: 0, count: 0 };
    }
    byType[h.type].value += currentValue;
    byType[h.type].count += 1;

    return { ...h, currentValue, costBasis, pnl, pnlPercent };
  });

  // Sort for top gainers/losers
  const sorted = [...holdingsWithPnL].sort((a, b) => b.pnlPercent - a.pnlPercent);

  return {
    totalValue,
    totalCost,
    totalPnL: totalValue - totalCost,
    totalPnLPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0,
    byType,
    topGainers: sorted.slice(0, 3),
    topLosers: sorted.slice(-3).reverse(),
    holdingsCount: holdings.length
  };
}

/**
 * Main handler
 */
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

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const userId = getUserIdFromEvent(event);
  if (!userId) {
    return {
      statusCode: 401,
      headers: corsHeaders,
      body: JSON.stringify({ success: false, error: 'Unauthorized' })
    };
  }

  try {
    const path = event.path || '';
    const method = event.httpMethod || 'GET';
    const body = event.body ? JSON.parse(event.body) : {};
    const pathParams = event.pathParameters || {};

    // GET /portfolio - Get full portfolio
    if (path.endsWith('/portfolio') && method === 'GET') {
      const portfolio = await getPortfolio(userId);
      const analytics = getAnalytics(portfolio);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: {
            ...portfolio,
            analytics
          }
        })
      };
    }

    // POST /portfolio/holdings - Add holding
    if (path.includes('/holdings') && method === 'POST') {
      // Rate limit check using Redis for distributed limiting
      const rateLimit = await redisCache.checkRateLimit(`${userId}:add_holding`, 30, 60);
      if (!rateLimit.allowed) {
        return {
          statusCode: 429,
          headers: { ...corsHeaders, 'Retry-After': String(rateLimit.resetIn) },
          body: JSON.stringify({ 
            success: false, 
            error: 'Rate limit exceeded. Please try again later.',
            retryAfter: rateLimit.resetIn
          })
        };
      }

      // Validate input
      const validationResult = validation.validateHolding(body);
      if (!validationResult.valid) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ 
            success: false, 
            error: 'Validation failed',
            details: validationResult.errors
          })
        };
      }

      const holding = await addHolding(userId, validationResult.data);

      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: holding
        })
      };
    }

    // PUT /portfolio/holdings/{id} - Update holding
    if (path.includes('/holdings/') && method === 'PUT') {
      const holdingId = pathParams.holdingId || path.split('/').pop();
      const updated = await updateHolding(userId, holdingId, body);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: updated
        })
      };
    }

    // DELETE /portfolio/holdings/{id} - Remove holding
    if (path.includes('/holdings/') && method === 'DELETE') {
      const holdingId = pathParams.holdingId || path.split('/').pop();
      const result = await removeHolding(userId, holdingId);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify(result)
      };
    }

    // POST /portfolio/prices - Update prices
    if (path.includes('/prices') && method === 'POST') {
      const result = await updatePrices(userId, body.prices || {});

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: result
        })
      };
    }

    // GET /portfolio/analytics - Get analytics only
    if (path.includes('/analytics') && method === 'GET') {
      const portfolio = await getPortfolio(userId);
      const analytics = getAnalytics(portfolio);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: analytics
        })
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        service: 'FinPulse Portfolio Service',
        version: '1.0.0',
        endpoints: [
          'GET /portfolio',
          'POST /portfolio/holdings',
          'PUT /portfolio/holdings/{id}',
          'DELETE /portfolio/holdings/{id}',
          'POST /portfolio/prices',
          'GET /portfolio/analytics'
        ]
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: error.message === 'Holding not found' ? 404 : 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      })
    };
  }
};

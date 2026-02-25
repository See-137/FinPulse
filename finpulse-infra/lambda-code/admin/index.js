/**
 * FinPulse Admin Service v2.0
 * Administrative functions and monitoring
 */

// =============================================================================
// Shared Utilities from Lambda Layer (with fallback)
// =============================================================================

let envValidator, requestContext, jwtVerifier;
try {
  envValidator = require('/opt/nodejs/env-validator');
  requestContext = require('/opt/nodejs/request-context');
  jwtVerifier = require('/opt/nodejs/jwt-verifier');
  console.log('[Admin] Loaded shared utilities from Lambda Layer');
} catch (e) {
  // Minimal fallbacks
  envValidator = {
    ensureEnvValidated: () => true,
    getOptionalEnv: (name, def) => process.env[name] || def,
  };
  requestContext = {
    createRequestContext: (event) => ({
      requestId: event?.requestContext?.requestId || 'unknown',
      logger: {
        info: (msg, data) => console.log(JSON.stringify({ level: 'INFO', message: msg, ...data })),
        error: (msg, data) => console.error(JSON.stringify({ level: 'ERROR', message: msg, ...data })),
        warn: (msg, data) => console.warn(JSON.stringify({ level: 'WARN', message: msg, ...data })),
      },
    }),
    addRequestIdHeader: (headers, id) => ({ ...headers, 'X-Request-ID': id }),
  };
}

// Validate environment at cold start
try {
  envValidator.ensureEnvValidated('admin');
} catch (e) {
  console.error('[Admin] Environment validation failed:', e.message);
}

// =============================================================================
// AWS SDK Clients (lazy initialization for cold start optimization)
// =============================================================================

let dynamoClient = null;
let docClient = null;

function getDynamoClient() {
  if (!docClient) {
    const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
    const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
    dynamoClient = new DynamoDBClient({});
    docClient = DynamoDBDocumentClient.from(dynamoClient);
  }
  return docClient;
}

// Import commands
const { ScanCommand, GetCommand, UpdateCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const ENVIRONMENT = process.env.ENVIRONMENT || 'prod';

/**
 * CORS headers - Restricted to production domain only
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://finpulse.me',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
  'Access-Control-Allow-Credentials': 'true'
};

/**
 * Check if user is admin
 * Uses AWS Cognito groups only - no header-based bypass
 */
function isAdmin(event) {
  // Check Cognito groups (primary method)
  const groups = event.requestContext?.authorizer?.claims?.['cognito:groups'];
  if (groups) {
    const groupArray = Array.isArray(groups) ? groups : [groups];
    if (groupArray.includes('admin') || groupArray.includes('Admin')) {
      console.log('[AUDIT] Admin access granted via Cognito group', {
        userId: event.requestContext?.authorizer?.claims?.sub,
        groups: groupArray,
        timestamp: new Date().toISOString()
      });
      return true;
    }
  }

  // Check custom attribute (backup method)
  const isAdminAttr = event.requestContext?.authorizer?.claims?.['custom:isAdmin'];
  if (isAdminAttr === 'true') {
    console.log('[AUDIT] Admin access granted via custom attribute', {
      userId: event.requestContext?.authorizer?.claims?.sub,
      timestamp: new Date().toISOString()
    });
    return true;
  }

  // Log failed admin access attempt
  console.warn('[SECURITY] Unauthorized admin access attempt', {
    userId: event.requestContext?.authorizer?.claims?.sub || 'unknown',
    timestamp: new Date().toISOString(),
    path: event.path,
    sourceIp: event.requestContext?.identity?.sourceIp
  });

  return false;
}

/**
 * Get system statistics
 */
async function getStats() {
  const tables = [
    `finpulse-users-${ENVIRONMENT}`,
    `finpulse-portfolios-${ENVIRONMENT}`,
    `finpulse-community-posts-${ENVIRONMENT}`,
    `finpulse-ai-queries-${ENVIRONMENT}`
  ];

  const stats = {};

  for (const table of tables) {
    try {
      const result = await getDynamoClient().send(new ScanCommand({
        TableName: table,
        Select: 'COUNT'
      }));
      const tableName = table.replace(`finpulse-`, '').replace(`-${ENVIRONMENT}`, '');
      stats[tableName] = result.Count || 0;
    } catch (error) {
      console.error(`Failed to get count for ${table}:`, error);
    }
  }

  return stats;
}

/**
 * Get recent signups
 */
async function getRecentUsers(limit = 10) {
  try {
    const result = await getDynamoClient().send(new ScanCommand({
      TableName: `finpulse-users-${ENVIRONMENT}`,
      Limit: limit * 2 // Get more to sort
    }));

    const sorted = (result.Items || [])
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    return sorted.map(u => ({
      userId: u.userId,
      email: u.email,
      name: u.name,
      plan: u.plan,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin
    }));
  } catch (error) {
    console.error('Failed to get recent users:', error);
    return [];
  }
}

/**
 * Get plan distribution
 */
async function getPlanDistribution() {
  try {
    const result = await getDynamoClient().send(new ScanCommand({
      TableName: `finpulse-users-${ENVIRONMENT}`,
      ProjectionExpression: '#plan',
      ExpressionAttributeNames: { '#plan': 'plan' }
    }));

    const distribution = { FREE: 0, PRO: 0, ENTERPRISE: 0 };
    for (const item of result.Items || []) {
      distribution[item.plan] = (distribution[item.plan] || 0) + 1;
    }

    return distribution;
  } catch (error) {
    console.error('Failed to get plan distribution:', error);
    return {};
  }
}

/**
 * Get AI query usage
 */
async function getAIUsage(days = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await getDynamoClient().send(new ScanCommand({
      TableName: `finpulse-ai-queries-${ENVIRONMENT}`,
      FilterExpression: '#ts >= :startDate',
      ExpressionAttributeNames: { '#ts': 'timestamp' },
      ExpressionAttributeValues: { ':startDate': startDate.toISOString() }
    }));

    const byDay = {};
    for (const item of result.Items || []) {
      const day = item.timestamp.split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    }

    return {
      total: result.Count || 0,
      byDay
    };
  } catch (error) {
    console.error('Failed to get AI usage:', error);
    return { total: 0, byDay: {} };
  }
}

/**
 * Update user plan (admin only)
 */
async function updateUserPlan(userId, newPlan) {
  const planCredits = {
    FREE: { maxAi: 10, maxAssets: 5 },
    PRO: { maxAi: 100, maxAssets: 50 },
    ENTERPRISE: { maxAi: -1, maxAssets: -1 }
  };

  const credits = planCredits[newPlan] || planCredits.FREE;

  await getDynamoClient().send(new UpdateCommand({
    TableName: `finpulse-users-${ENVIRONMENT}`,
    Key: { userId },
    UpdateExpression: 'SET #plan = :plan, credits.maxAi = :maxAi, credits.maxAssets = :maxAssets, updatedAt = :updatedAt',
    ExpressionAttributeNames: { '#plan': 'plan' },
    ExpressionAttributeValues: {
      ':plan': newPlan,
      ':maxAi': credits.maxAi,
      ':maxAssets': credits.maxAssets,
      ':updatedAt': new Date().toISOString()
    }
  }));

  return { success: true, userId, newPlan };
}

/**
 * Health check
 */
async function healthCheck() {
  const checks = {
    dynamodb: false,
    timestamp: new Date().toISOString(),
    environment: ENVIRONMENT,
    region: process.env.AWS_REGION
  };

  try {
    await getDynamoClient().send(new ScanCommand({
      TableName: `finpulse-users-${ENVIRONMENT}`,
      Limit: 1
    }));
    checks.dynamodb = true;
  } catch (error) {
    console.error('DynamoDB health check failed:', error);
  }

  return checks;
}

/**
 * Main handler
 */
exports.handler = async (event) => {
  console.log('Admin Lambda invoked:', event.httpMethod, event.path);

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    const path = event.path || '';
    const method = event.httpMethod || 'GET';
    const body = event.body ? JSON.parse(event.body) : {};

    // Health check - public
    if (path.includes('/health')) {
      const health = await healthCheck();
      return {
        statusCode: health.dynamodb ? 200 : 503,
        headers: corsHeaders,
        body: JSON.stringify({
          success: health.dynamodb,
          data: health
        })
      };
    }

    // Admin endpoints require authentication
    if (!isAdmin(event)) {
      return {
        statusCode: 403,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: 'Admin access required'
        })
      };
    }

    // GET /admin/stats - System statistics
    if (path.includes('/stats') && method === 'GET') {
      const stats = await getStats();
      const planDist = await getPlanDistribution();

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: {
            counts: stats,
            planDistribution: planDist,
            timestamp: new Date().toISOString()
          }
        })
      };
    }

    // GET /admin/users - List recent users
    if (path.includes('/users') && method === 'GET') {
      const limit = parseInt(event.queryStringParameters?.limit) || 10;
      const users = await getRecentUsers(limit);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: users,
          count: users.length
        })
      };
    }

    // PUT /admin/users/{id}/plan - Update user plan
    if (path.includes('/plan') && method === 'PUT') {
      const userId = event.pathParameters?.userId || path.split('/')[path.split('/').indexOf('users') + 1];
      const { plan } = body;

      if (!['FREE', 'PRO', 'ENTERPRISE'].includes(plan)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: 'Invalid plan. Must be FREE, PRO, or ENTERPRISE'
          })
        };
      }

      const result = await updateUserPlan(userId, plan);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: result
        })
      };
    }

    // GET /admin/ai-usage - AI query statistics
    if (path.includes('/ai-usage') && method === 'GET') {
      const days = parseInt(event.queryStringParameters?.days) || 7;
      const usage = await getAIUsage(days);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: usage
        })
      };
    }

    // Default
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        service: 'FinPulse Admin Service',
        version: '1.0.0',
        endpoints: [
          'GET /admin/health (public)',
          'GET /admin/stats',
          'GET /admin/users',
          'PUT /admin/users/{id}/plan',
          'GET /admin/ai-usage'
        ]
      })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error'
      })
    };
  }
};

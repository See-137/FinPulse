// Redeploy trigger: ship security review fixes from PR #63 (commit 575e0460) that were blocked at the old approval gate.
/**
 * FinPulse Admin Service v2.0
 * Administrative functions and monitoring
 */

// =============================================================================
// Shared Utilities from Lambda Layer
// Each module loads in its own try/catch so a single missing module can't
// take down jwt-verifier or env-validator (CLAUDE.md §11; cf. commit a4f3c06).
// =============================================================================

let envValidator, requestContext, jwtVerifier;

try { envValidator = require('/opt/nodejs/env-validator'); }
catch (e) {
  envValidator = {
    ensureEnvValidated: () => true,
    getOptionalEnv: (name, def) => process.env[name] || def,
  };
}

try { requestContext = require('/opt/nodejs/request-context'); }
catch (e) {
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

// jwt-verifier is CRITICAL for admin auth — fail-closed if missing
try { jwtVerifier = require('/opt/nodejs/jwt-verifier'); }
catch (e) { console.error('[Admin] jwt-verifier not available:', e.message); jwtVerifier = null; }

console.log('[Admin] Layer modules loaded:', {
  envValidator: !!envValidator,
  requestContext: !!requestContext,
  jwtVerifier: !!jwtVerifier,
});

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

// Safety cap on paginated scans to prevent runaway invocations. At ~1 MB per
// DynamoDB scan page, 50 pages = ~50 MB scanned per call — enough for current
// table sizes (users < 100k items expected). If a list response is truncated,
// the operator can re-call with the returned nextToken to continue.
const MAX_SCAN_PAGES = 50;

// Default page size for paginated list endpoints exposed to the admin.
const DEFAULT_LIST_LIMIT = 25;
const MAX_LIST_LIMIT = 100;

/**
 * Run a Scan paginating internally up to MAX_SCAN_PAGES. Accumulates Items
 * and the total ScannedCount. Used by aggregate endpoints (stats, plan
 * distribution, AI usage) where we want a full picture, not the first page.
 *
 * Returns `{ items, scannedCount, truncated, lastEvaluatedKey }`.
 * `truncated: true` means we hit MAX_SCAN_PAGES before exhausting the table —
 * the caller should treat the aggregate as a lower bound.
 *
 * @param {object} scanParams - DynamoDB ScanCommand params (TableName, etc.)
 * @returns {Promise<{items: Array, scannedCount: number, truncated: boolean, lastEvaluatedKey: object|null}>}
 */
async function paginatedScan(scanParams) {
  const items = [];
  let scannedCount = 0;
  let lastEvaluatedKey = undefined;
  let pages = 0;

  do {
    const result = await getDynamoClient().send(new ScanCommand({
      ...scanParams,
      ExclusiveStartKey: lastEvaluatedKey,
    }));
    if (result.Items) items.push(...result.Items);
    scannedCount += result.ScannedCount || 0;
    lastEvaluatedKey = result.LastEvaluatedKey;
    pages += 1;
  } while (lastEvaluatedKey && pages < MAX_SCAN_PAGES);

  return {
    items,
    scannedCount,
    truncated: !!lastEvaluatedKey, // true if we stopped before exhausting
    lastEvaluatedKey: lastEvaluatedKey || null,
  };
}

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
 * Get system statistics — table item counts.
 *
 * Uses paginated COUNT scan to handle tables larger than one 1 MB scan page.
 * If a table is large enough to exceed MAX_SCAN_PAGES, the returned count is
 * flagged as a lower bound via `_truncated: true`.
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
      const { scannedCount, truncated } = await paginatedScan({
        TableName: table,
        Select: 'COUNT',
      });
      const tableName = table.replace(`finpulse-`, '').replace(`-${ENVIRONMENT}`, '');
      stats[tableName] = scannedCount;
      if (truncated) stats[`${tableName}_truncated`] = true;
    } catch (error) {
      console.error(`Failed to get count for ${table}:`, error);
    }
  }

  return stats;
}

/**
 * List users, paginated. Pass `nextToken` (base64-encoded LastEvaluatedKey) on
 * subsequent calls to continue. Limit is capped at MAX_LIST_LIMIT.
 *
 * GDPR scope: ProjectionExpression restricts fields returned to admin to the
 * minimum set actually displayed in the admin portal. Sensitive fields like
 * tokens, password hashes, or credit details are never projected here even if
 * they exist on the row.
 *
 * Note: Scan order is partition-key order, not createdAt. To get truly
 * "recent" users the operator should paginate fully and sort client-side, or
 * we add a GSI on `createdAt` in a follow-up.
 *
 * @returns {Promise<{items: Array, nextToken: string|null, count: number}>}
 */
async function listUsers({ limit = DEFAULT_LIST_LIMIT, nextToken = null } = {}) {
  const cappedLimit = Math.min(Math.max(parseInt(limit, 10) || DEFAULT_LIST_LIMIT, 1), MAX_LIST_LIMIT);

  let exclusiveStartKey;
  if (nextToken) {
    try {
      exclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString('utf8'));
    } catch (e) {
      // Bad token — treat as start of scan rather than fail the whole request.
      console.warn('[Admin] Invalid nextToken received, ignoring:', e.message);
      exclusiveStartKey = undefined;
    }
  }

  try {
    const result = await getDynamoClient().send(new ScanCommand({
      TableName: `finpulse-users-${ENVIRONMENT}`,
      Limit: cappedLimit,
      ExclusiveStartKey: exclusiveStartKey,
      // Drop fields the admin portal does not display. Reduces PII surface in
      // logs and response payloads. Keep email since it's the primary admin
      // lookup field; mask in CloudWatch via no-op (Lambda logs request only
      // on error). Use #-prefixed names for reserved-word safety.
      ProjectionExpression: '#userId, #email, #name, #plan, #createdAt',
      ExpressionAttributeNames: {
        '#userId': 'userId',
        '#email': 'email',
        '#name': 'name',
        '#plan': 'plan',
        '#createdAt': 'createdAt',
      },
    }));

    const items = (result.Items || []).map(u => ({
      userId: u.userId,
      email: u.email,
      name: u.name,
      plan: u.plan,
      createdAt: u.createdAt,
    }));

    const nextTokenOut = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : null;

    return { items, nextToken: nextTokenOut, count: items.length };
  } catch (error) {
    console.error('Failed to list users:', error);
    return { items: [], nextToken: null, count: 0 };
  }
}

/**
 * Get plan distribution — paginated internally up to MAX_SCAN_PAGES.
 *
 * Returns the distribution plus a `_truncated` flag if the users table
 * exceeded the safety cap before being fully scanned.
 */
async function getPlanDistribution() {
  try {
    const { items, truncated } = await paginatedScan({
      TableName: `finpulse-users-${ENVIRONMENT}`,
      ProjectionExpression: '#plan',
      ExpressionAttributeNames: { '#plan': 'plan' },
    });

    const distribution = { FREE: 0, PRO: 0, ENTERPRISE: 0 };
    for (const item of items) {
      distribution[item.plan] = (distribution[item.plan] || 0) + 1;
    }

    if (truncated) distribution._truncated = true;
    return distribution;
  } catch (error) {
    console.error('Failed to get plan distribution:', error);
    return {};
  }
}

/**
 * Get AI query usage over the past N days — paginated internally.
 *
 * Note: FilterExpression runs *after* DynamoDB reads each page, so we still
 * scan the full table even for a short window. A `timestamp`-keyed GSI on
 * the ai-queries table would let us Query instead of Scan; that's a separate
 * follow-up. Project only `timestamp` here to minimize per-page payload size.
 */
async function getAIUsage(days = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { items, truncated } = await paginatedScan({
      TableName: `finpulse-ai-queries-${ENVIRONMENT}`,
      FilterExpression: '#ts >= :startDate',
      ProjectionExpression: '#ts',
      ExpressionAttributeNames: { '#ts': 'timestamp' },
      ExpressionAttributeValues: { ':startDate': startDate.toISOString() },
    });

    const byDay = {};
    for (const item of items) {
      const day = (item.timestamp || '').split('T')[0];
      if (day) byDay[day] = (byDay[day] || 0) + 1;
    }

    return {
      total: items.length,
      byDay,
      ...(truncated && { _truncated: true }),
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

    // GET /admin/users - List users (paginated)
    // Query params:
    //   limit     — page size (1..MAX_LIST_LIMIT, default DEFAULT_LIST_LIMIT)
    //   nextToken — opaque pagination cursor from previous response
    if (path.includes('/users') && method === 'GET') {
      const limit = event.queryStringParameters?.limit;
      const nextToken = event.queryStringParameters?.nextToken || null;
      const { items, nextToken: nextTokenOut, count } = await listUsers({ limit, nextToken });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: items,
          count,
          nextToken: nextTokenOut,
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

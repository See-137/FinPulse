/**
 * LemonSqueezy Payments Lambda v2.0
 * Handles checkout sessions, webhooks, and subscription management
 *
 * LemonSqueezy API: https://docs.lemonsqueezy.com/api
 * Webhooks: https://docs.lemonsqueezy.com/guides/developer-guide/webhooks
 */

const crypto = require('crypto');

// =============================================================================
// Shared Utilities from Lambda Layer (with fallback)
// =============================================================================

let envValidator, requestContext;
try {
  envValidator = require('/opt/nodejs/env-validator');
  requestContext = require('/opt/nodejs/request-context');
  console.log('[Payments] Loaded shared utilities from Lambda Layer');
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
      },
    }),
    addRequestIdHeader: (headers, id) => ({ ...headers, 'X-Request-ID': id }),
  };
}

// Validate environment at cold start
try {
  envValidator.ensureEnvValidated('payments');
} catch (e) {
  console.error('[Payments] Environment validation failed:', e.message);
}

// =============================================================================
// Configuration
// =============================================================================

// LemonSqueezy API configuration
const LEMONSQUEEZY_API_KEY = process.env.LEMONSQUEEZY_API_KEY;
const LEMONSQUEEZY_STORE_ID = process.env.LEMONSQUEEZY_STORE_ID;
const LEMONSQUEEZY_WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
const LEMONSQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1';

// Plan mapping: LemonSqueezy variant ID -> Plan name
const VARIANT_TO_PLAN = {
  [process.env.LEMONSQUEEZY_VARIANT_PROPULSE]: 'PROPULSE',
  [process.env.LEMONSQUEEZY_VARIANT_SUPERPULSE]: 'SUPERPULSE',
};

const PLAN_LIMITS = {
  FREE: { maxAssets: 10, maxAiQueries: 10 },
  PROPULSE: { maxAssets: 50, maxAiQueries: 100 },
  SUPERPULSE: { maxAssets: 500, maxAiQueries: 1000 }
};

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://finpulse.me',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Signature',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

// =============================================================================
// AWS SDK Clients (lazy initialization for cold start optimization)
// Uses SDK v2 style for backwards compatibility with existing code
// =============================================================================

let _dynamoDB = null;

// Lazy-loaded DynamoDB DocumentClient
const dynamoDB = {
  put: (params) => {
    if (!_dynamoDB) {
      const AWS = require('aws-sdk');
      _dynamoDB = new AWS.DynamoDB.DocumentClient();
    }
    return _dynamoDB.put(params);
  },
  get: (params) => {
    if (!_dynamoDB) {
      const AWS = require('aws-sdk');
      _dynamoDB = new AWS.DynamoDB.DocumentClient();
    }
    return _dynamoDB.get(params);
  },
  update: (params) => {
    if (!_dynamoDB) {
      const AWS = require('aws-sdk');
      _dynamoDB = new AWS.DynamoDB.DocumentClient();
    }
    return _dynamoDB.update(params);
  },
  delete: (params) => {
    if (!_dynamoDB) {
      const AWS = require('aws-sdk');
      _dynamoDB = new AWS.DynamoDB.DocumentClient();
    }
    return _dynamoDB.delete(params);
  },
  query: (params) => {
    if (!_dynamoDB) {
      const AWS = require('aws-sdk');
      _dynamoDB = new AWS.DynamoDB.DocumentClient();
    }
    return _dynamoDB.query(params);
  },
  scan: (params) => {
    if (!_dynamoDB) {
      const AWS = require('aws-sdk');
      _dynamoDB = new AWS.DynamoDB.DocumentClient();
    }
    return _dynamoDB.scan(params);
  }
};

const ENVIRONMENT = process.env.ENVIRONMENT || 'prod';
const USERS_TABLE = process.env.USERS_TABLE || 'finpulse-users';
const SUBSCRIPTIONS_TABLE = process.env.SUBSCRIPTIONS_TABLE || 'finpulse-subscriptions';
const CACHE_TABLE = `finpulse-api-cache-${ENVIRONMENT}`;

/**
 * Check if a webhook event has already been processed (idempotency)
 * Uses api-cache table with TTL for automatic cleanup
 * @param {string} eventKey - Unique key for the webhook event
 * @returns {Promise<boolean>} - true if already processed
 */
async function isWebhookProcessed(eventKey) {
  try {
    const result = await dynamoDB.get({
      TableName: CACHE_TABLE,
      Key: { cacheKey: `webhook:${eventKey}` }
    }).promise();
    return !!result.Item;
  } catch (error) {
    console.warn('Idempotency check failed, proceeding:', error.message);
    return false;
  }
}

/**
 * Mark a webhook event as processed
 * @param {string} eventKey - Unique key for the webhook event
 * @param {string} eventName - Name of the webhook event
 */
async function markWebhookProcessed(eventKey, eventName) {
  try {
    await dynamoDB.put({
      TableName: CACHE_TABLE,
      Item: {
        cacheKey: `webhook:${eventKey}`,
        dataType: 'webhook',
        eventName,
        processedAt: new Date().toISOString(),
        expiresAt: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7-day TTL
      }
    }).promise();
  } catch (error) {
    console.warn('Failed to mark webhook processed:', error.message);
  }
}

/**
 * Make authenticated request to LemonSqueezy API
 */
async function lemonSqueezyRequest(endpoint, options = {}) {
  const response = await fetch(`${LEMONSQUEEZY_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      'Authorization': `Bearer ${LEMONSQUEEZY_API_KEY}`,
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('LemonSqueezy API error:', response.status, error);
    throw new Error(`LemonSqueezy API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Verify webhook signature
 */
function verifyWebhookSignature(payload, signature) {
  if (!LEMONSQUEEZY_WEBHOOK_SECRET) {
    console.error('[Payments] CRITICAL: No webhook secret configured, rejecting webhook');
    return false;
  }

  if (!signature) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', LEMONSQUEEZY_WEBHOOK_SECRET);
  const digest = hmac.update(payload).digest('hex');

  const sigBuf = Buffer.from(signature);
  const digestBuf = Buffer.from(digest);
  if (sigBuf.length !== digestBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(sigBuf, digestBuf);
}

/**
 * Sanitize event for logging
 */
function sanitizeEvent(event) {
  const sanitized = { ...event };
  if (sanitized.headers) {
    sanitized.headers = { ...sanitized.headers };
    delete sanitized.headers.Authorization;
    delete sanitized.headers.authorization;
    delete sanitized.headers['X-Signature'];
    delete sanitized.headers['x-signature'];
  }
  if (sanitized.body && sanitized.path?.includes('webhook')) {
    sanitized.body = '[REDACTED - webhook payload]';
  }
  return sanitized;
}

exports.handler = async (event) => {
  console.log('Payment event:', JSON.stringify(sanitizeEvent(event), null, 2));
  
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const path = event.path;
  const method = event.httpMethod;

  try {
    // Create checkout session
    if (path.endsWith('/checkout') && method === 'POST') {
      return await handleCreateCheckout(JSON.parse(event.body));
    }
    
    // Customer portal
    if (path.endsWith('/portal') && method === 'POST') {
      return await handleCustomerPortal(JSON.parse(event.body));
    }
    
    // Get subscription status
    if (path.includes('/subscription/') && method === 'GET') {
      const userId = path.split('/subscription/')[1].split('/')[0];
      return await handleGetSubscription(userId);
    }
    
    // Cancel subscription
    if (path.includes('/cancel') && method === 'POST') {
      const userId = path.split('/subscription/')[1].split('/cancel')[0];
      return await handleCancelSubscription(userId);
    }
    
    // Resume subscription
    if (path.includes('/resume') && method === 'POST') {
      const userId = path.split('/subscription/')[1].split('/resume')[0];
      return await handleResumeSubscription(userId);
    }
    
    // Webhook
    if (path.endsWith('/webhook') && method === 'POST') {
      return await handleWebhook(event);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    };

  } catch (error) {
    console.error('Payment error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

/**
 * Create a LemonSqueezy Checkout
 * https://docs.lemonsqueezy.com/api/checkouts
 */
async function handleCreateCheckout(body) {
  const { userId, email, variantId, plan, successUrl, cancelUrl } = body;

  // Create checkout via LemonSqueezy API
  const checkoutData = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          email: email,
          custom: {
            user_id: userId
          }
        },
        checkout_options: {
          success_url: successUrl,
          cancel_url: cancelUrl,
          button_color: '#00e5ff'
        },
        product_options: {
          redirect_url: successUrl,
          receipt_button_text: 'Go to Dashboard',
          receipt_link_url: successUrl
        }
      },
      relationships: {
        store: {
          data: {
            type: 'stores',
            id: LEMONSQUEEZY_STORE_ID
          }
        },
        variant: {
          data: {
            type: 'variants',
            id: variantId
          }
        }
      }
    }
  };

  const result = await lemonSqueezyRequest('/checkouts', {
    method: 'POST',
    body: JSON.stringify(checkoutData)
  });

  const checkoutUrl = result.data.attributes.url;

  // Store pending checkout
  await dynamoDB.put({
    TableName: SUBSCRIPTIONS_TABLE,
    Item: {
      userId,
      status: 'pending',
      plan,
      variantId,
      checkoutUrl,
      createdAt: new Date().toISOString()
    }
  }).promise();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ checkoutUrl })
  };
}

/**
 * Get customer portal URL
 * LemonSqueezy provides customer portal links on subscriptions
 */
async function handleCustomerPortal(body) {
  const { userId, returnUrl } = body;

  // Get subscription from DynamoDB
  const subscription = await dynamoDB.get({
    TableName: SUBSCRIPTIONS_TABLE,
    Key: { userId }
  }).promise();

  if (!subscription.Item?.lemonSqueezySubscriptionId) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'No subscription found' })
    };
  }

  // Get subscription details from LemonSqueezy
  const result = await lemonSqueezyRequest(
    `/subscriptions/${subscription.Item.lemonSqueezySubscriptionId}`
  );

  const portalUrl = result.data.attributes.urls.customer_portal;

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ url: portalUrl || returnUrl })
  };
}

/**
 * Get subscription status
 */
async function handleGetSubscription(userId) {
  const subscription = await dynamoDB.get({
    TableName: SUBSCRIPTIONS_TABLE,
    Key: { userId }
  }).promise();

  if (!subscription.Item || subscription.Item.status === 'pending') {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'No active subscription found' })
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      status: subscription.Item.status,
      plan: subscription.Item.plan,
      currentPeriodEnd: subscription.Item.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.Item.cancelAtPeriodEnd || false
    })
  };
}

/**
 * Cancel subscription
 */
async function handleCancelSubscription(userId) {
  const subscription = await dynamoDB.get({
    TableName: SUBSCRIPTIONS_TABLE,
    Key: { userId }
  }).promise();

  if (!subscription.Item?.lemonSqueezySubscriptionId) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'No subscription found' })
    };
  }

  // Cancel via LemonSqueezy API
  await lemonSqueezyRequest(
    `/subscriptions/${subscription.Item.lemonSqueezySubscriptionId}`,
    {
      method: 'DELETE'
    }
  );

  // Update local record
  await dynamoDB.update({
    TableName: SUBSCRIPTIONS_TABLE,
    Key: { userId },
    UpdateExpression: 'SET cancelAtPeriodEnd = :val',
    ExpressionAttributeValues: { ':val': true }
  }).promise();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  };
}

/**
 * Resume subscription (uncancel)
 */
async function handleResumeSubscription(userId) {
  const subscription = await dynamoDB.get({
    TableName: SUBSCRIPTIONS_TABLE,
    Key: { userId }
  }).promise();

  if (!subscription.Item?.lemonSqueezySubscriptionId) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'No subscription found' })
    };
  }

  // Resume via LemonSqueezy API (update cancelled to false)
  await lemonSqueezyRequest(
    `/subscriptions/${subscription.Item.lemonSqueezySubscriptionId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        data: {
          type: 'subscriptions',
          id: subscription.Item.lemonSqueezySubscriptionId,
          attributes: {
            cancelled: false
          }
        }
      })
    }
  );

  await dynamoDB.update({
    TableName: SUBSCRIPTIONS_TABLE,
    Key: { userId },
    UpdateExpression: 'SET cancelAtPeriodEnd = :val',
    ExpressionAttributeValues: { ':val': false }
  }).promise();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ success: true })
  };
}

/**
 * Handle LemonSqueezy webhooks
 * https://docs.lemonsqueezy.com/guides/developer-guide/webhooks
 */
async function handleWebhook(event) {
  const signature = event.headers['X-Signature'] || event.headers['x-signature'];
  
  // Verify signature
  if (!verifyWebhookSignature(event.body, signature)) {
    console.error('Invalid webhook signature');
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid signature' })
    };
  }

  const payload = JSON.parse(event.body);
  const eventName = payload.meta.event_name;
  const data = payload.data;

  console.log('Webhook event:', eventName);

  // Idempotency check — prevent duplicate processing on webhook retries
  const idempotencyKey = `${eventName}:${data.id}:${data.attributes?.updated_at || 'unknown'}`;
  if (await isWebhookProcessed(idempotencyKey)) {
    console.log('Webhook already processed, skipping:', idempotencyKey);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true, deduplicated: true })
    };
  }

  try {
    switch (eventName) {
      case 'subscription_created':
        await handleSubscriptionCreated(payload);
        break;

      case 'subscription_updated':
        await handleSubscriptionUpdated(payload);
        break;

      case 'subscription_cancelled':
        await handleSubscriptionCancelled(payload);
        break;

      case 'subscription_expired':
        await handleSubscriptionExpired(payload);
        break;

      case 'subscription_payment_success':
        console.log('Payment succeeded for subscription:', data.id);
        break;

      case 'subscription_payment_failed':
        await handlePaymentFailed(payload);
        break;

      default:
        console.log('Unhandled webhook event:', eventName);
    }

    // Mark as processed after successful handling
    await markWebhookProcessed(idempotencyKey, eventName);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true })
    };
  } catch (error) {
    console.error('Webhook processing error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Webhook processing failed' })
    };
  }
}

/**
 * Handle new subscription
 */
async function handleSubscriptionCreated(payload) {
  const data = payload.data;
  const attributes = data.attributes;
  const customData = payload.meta.custom_data || {};
  const userId = customData.user_id;

  if (!userId) {
    console.error('No user_id in subscription custom data');
    return;
  }

  const variantId = attributes.variant_id.toString();
  const plan = VARIANT_TO_PLAN[variantId] || 'PROPULSE';
  const limits = PLAN_LIMITS[plan];

  // Store subscription
  await dynamoDB.put({
    TableName: SUBSCRIPTIONS_TABLE,
    Item: {
      userId,
      lemonSqueezySubscriptionId: data.id,
      lemonSqueezyCustomerId: attributes.customer_id,
      plan,
      variantId,
      status: attributes.status,
      currentPeriodEnd: attributes.renews_at,
      cancelAtPeriodEnd: attributes.cancelled || false,
      createdAt: attributes.created_at,
      updatedAt: new Date().toISOString()
    }
  }).promise();

  // Update user plan
  await dynamoDB.update({
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: 'SET #plan = :plan, maxAssets = :ma, maxAiQueries = :mq, subscriptionStatus = :status',
    ExpressionAttributeNames: { '#plan': 'plan' },
    ExpressionAttributeValues: {
      ':plan': plan,
      ':ma': limits.maxAssets,
      ':mq': limits.maxAiQueries,
      ':status': 'active'
    }
  }).promise();

  console.log(`User ${userId} subscribed to ${plan}`);
}

/**
 * Handle subscription update
 */
async function handleSubscriptionUpdated(payload) {
  const data = payload.data;
  const attributes = data.attributes;
  const customData = payload.meta.custom_data || {};
  const userId = customData.user_id;

  if (!userId) {
    // Try to find by subscription ID
    const result = await dynamoDB.scan({
      TableName: SUBSCRIPTIONS_TABLE,
      FilterExpression: 'lemonSqueezySubscriptionId = :sid',
      ExpressionAttributeValues: { ':sid': data.id }
    }).promise();

    if (!result.Items || result.Items.length === 0) {
      console.error('Cannot find user for subscription:', data.id);
      return;
    }

    const foundUserId = result.Items[0].userId;
    await updateSubscriptionStatus(foundUserId, attributes);
    return;
  }

  await updateSubscriptionStatus(userId, attributes);
}

async function updateSubscriptionStatus(userId, attributes) {
  await dynamoDB.update({
    TableName: SUBSCRIPTIONS_TABLE,
    Key: { userId },
    UpdateExpression: 'SET #status = :status, currentPeriodEnd = :cpe, cancelAtPeriodEnd = :cap, updatedAt = :ua',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': attributes.status,
      ':cpe': attributes.renews_at,
      ':cap': attributes.cancelled || false,
      ':ua': new Date().toISOString()
    }
  }).promise();

  await dynamoDB.update({
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: 'SET subscriptionStatus = :status',
    ExpressionAttributeValues: {
      ':status': attributes.status
    }
  }).promise();

  console.log(`Updated subscription status for ${userId}: ${attributes.status}`);
}

/**
 * Handle subscription cancelled
 */
async function handleSubscriptionCancelled(payload) {
  const data = payload.data;
  const customData = payload.meta.custom_data || {};
  let userId = customData.user_id;

  if (!userId) {
    const result = await dynamoDB.scan({
      TableName: SUBSCRIPTIONS_TABLE,
      FilterExpression: 'lemonSqueezySubscriptionId = :sid',
      ExpressionAttributeValues: { ':sid': data.id }
    }).promise();

    if (result.Items && result.Items.length > 0) {
      userId = result.Items[0].userId;
    } else {
      console.error('Cannot find user for cancelled subscription:', data.id);
      return;
    }
  }

  await dynamoDB.update({
    TableName: SUBSCRIPTIONS_TABLE,
    Key: { userId },
    UpdateExpression: 'SET #status = :status, cancelAtPeriodEnd = :cap',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': 'cancelled',
      ':cap': true
    }
  }).promise();

  console.log(`Subscription cancelled for ${userId}`);
}

/**
 * Handle subscription expired (end of billing period after cancellation)
 */
async function handleSubscriptionExpired(payload) {
  const data = payload.data;
  const customData = payload.meta.custom_data || {};
  let userId = customData.user_id;

  if (!userId) {
    const result = await dynamoDB.scan({
      TableName: SUBSCRIPTIONS_TABLE,
      FilterExpression: 'lemonSqueezySubscriptionId = :sid',
      ExpressionAttributeValues: { ':sid': data.id }
    }).promise();

    if (result.Items && result.Items.length > 0) {
      userId = result.Items[0].userId;
    } else {
      return;
    }
  }

  // Downgrade to FREE
  const limits = PLAN_LIMITS.FREE;
  
  await dynamoDB.update({
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: 'SET #plan = :plan, maxAssets = :ma, maxAiQueries = :mq, subscriptionStatus = :status',
    ExpressionAttributeNames: { '#plan': 'plan' },
    ExpressionAttributeValues: {
      ':plan': 'FREE',
      ':ma': limits.maxAssets,
      ':mq': limits.maxAiQueries,
      ':status': 'expired'
    }
  }).promise();

  await dynamoDB.update({
    TableName: SUBSCRIPTIONS_TABLE,
    Key: { userId },
    UpdateExpression: 'SET #status = :status',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':status': 'expired' }
  }).promise();

  console.log(`User ${userId} downgraded to FREE (subscription expired)`);
}

/**
 * Handle payment failure
 */
async function handlePaymentFailed(payload) {
  const data = payload.data;
  const customData = payload.meta.custom_data || {};
  let userId = customData.user_id;

  if (!userId) {
    const result = await dynamoDB.scan({
      TableName: SUBSCRIPTIONS_TABLE,
      FilterExpression: 'lemonSqueezySubscriptionId = :sid',
      ExpressionAttributeValues: { ':sid': data.id }
    }).promise();

    if (result.Items && result.Items.length > 0) {
      userId = result.Items[0].userId;
    } else {
      return;
    }
  }

  await dynamoDB.update({
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: 'SET subscriptionStatus = :status',
    ExpressionAttributeValues: { ':status': 'past_due' }
  }).promise();

  console.log(`Payment failed for ${userId}`);
}

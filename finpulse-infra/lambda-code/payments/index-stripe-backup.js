/**
 * Stripe Payments Lambda
 * Handles checkout sessions, webhooks, and subscription management
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Plan mapping
const PLAN_MAPPING = {
  'price_pro_monthly': 'PRO',
  'price_team_monthly': 'TEAM',
  // Add your actual Stripe price IDs here
};

const PLAN_LIMITS = {
  FREE: { maxAssets: 10, maxAiQueries: 5 },
  PRO: { maxAssets: 50, maxAiQueries: 100 },
  TEAM: { maxAssets: 1000, maxAiQueries: 1000 }
};

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, stripe-signature',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

// DynamoDB for storing customer data
const AWS = require('aws-sdk');
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const USERS_TABLE = process.env.USERS_TABLE || 'finpulse-users';
const SUBSCRIPTIONS_TABLE = process.env.SUBSCRIPTIONS_TABLE || 'finpulse-subscriptions';

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
    delete sanitized.headers['stripe-signature'];
  }
  // Don't log full webhook body (contains sensitive payment data)
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
    
    // Verify session
    if (path.includes('/verify-session/') && method === 'GET') {
      const sessionId = path.split('/verify-session/')[1];
      return await handleVerifySession(sessionId);
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
 * Create a Stripe Checkout session
 */
async function handleCreateCheckout(body) {
  const { userId, email, priceId, plan, successUrl, cancelUrl } = body;

  // Get or create Stripe customer
  let customerId;
  
  // Check if user already has a Stripe customer ID
  const existingUser = await dynamoDB.get({
    TableName: USERS_TABLE,
    Key: { userId }
  }).promise();

  if (existingUser.Item?.stripeCustomerId) {
    customerId = existingUser.Item.stripeCustomerId;
  } else {
    // Create new Stripe customer
    const customer = await stripe.customers.create({
      email,
      metadata: { userId }
    });
    customerId = customer.id;

    // Store customer ID
    await dynamoDB.update({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET stripeCustomerId = :cid, email = :email',
      ExpressionAttributeValues: {
        ':cid': customerId,
        ':email': email
      }
    }).promise();
  }

  // Create checkout session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{
      price: priceId,
      quantity: 1
    }],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      plan
    },
    subscription_data: {
      metadata: {
        userId,
        plan
      }
    }
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      sessionId: session.id,
      url: session.url
    })
  };
}

/**
 * Create customer portal session
 */
async function handleCustomerPortal(body) {
  const { userId, returnUrl } = body;

  // Get customer ID
  const user = await dynamoDB.get({
    TableName: USERS_TABLE,
    Key: { userId }
  }).promise();

  if (!user.Item?.stripeCustomerId) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'No subscription found' })
    };
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.Item.stripeCustomerId,
    return_url: returnUrl
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ url: session.url })
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

  if (!subscription.Item) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'No subscription found' })
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(subscription.Item)
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

  if (!subscription.Item?.stripeSubscriptionId) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'No subscription found' })
    };
  }

  await stripe.subscriptions.update(subscription.Item.stripeSubscriptionId, {
    cancel_at_period_end: true
  });

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
 * Resume subscription
 */
async function handleResumeSubscription(userId) {
  const subscription = await dynamoDB.get({
    TableName: SUBSCRIPTIONS_TABLE,
    Key: { userId }
  }).promise();

  if (!subscription.Item?.stripeSubscriptionId) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'No subscription found' })
    };
  }

  await stripe.subscriptions.update(subscription.Item.stripeSubscriptionId, {
    cancel_at_period_end: false
  });

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
 * Verify checkout session
 */
async function handleVerifySession(sessionId) {
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== 'paid') {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Payment not completed' })
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success: true,
      plan: session.metadata.plan,
      userId: session.metadata.userId
    })
  };
}

/**
 * Handle Stripe webhooks
 */
async function handleWebhook(event) {
  const sig = event.headers['stripe-signature'] || event.headers['Stripe-Signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      endpointSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid signature' })
    };
  }

  console.log('Webhook event type:', stripeEvent.type);

  switch (stripeEvent.type) {
    case 'checkout.session.completed': {
      const session = stripeEvent.data.object;
      await handleCheckoutComplete(session);
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = stripeEvent.data.object;
      await handleSubscriptionUpdate(subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = stripeEvent.data.object;
      await handleSubscriptionDeleted(subscription);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = stripeEvent.data.object;
      await handlePaymentFailed(invoice);
      break;
    }

    default:
      console.log('Unhandled event type:', stripeEvent.type);
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ received: true })
  };
}

/**
 * Handle successful checkout
 */
async function handleCheckoutComplete(session) {
  const userId = session.metadata.userId;
  const plan = session.metadata.plan;
  const subscriptionId = session.subscription;

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Store subscription info
  await dynamoDB.put({
    TableName: SUBSCRIPTIONS_TABLE,
    Item: {
      userId,
      stripeSubscriptionId: subscriptionId,
      stripeCustomerId: session.customer,
      plan,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      createdAt: new Date().toISOString()
    }
  }).promise();

  // Update user plan
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;
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

  console.log(`User ${userId} upgraded to ${plan}`);
}

/**
 * Handle subscription update
 */
async function handleSubscriptionUpdate(subscription) {
  const userId = subscription.metadata.userId;
  const plan = subscription.metadata.plan;

  if (!userId) {
    console.log('No userId in subscription metadata');
    return;
  }

  await dynamoDB.update({
    TableName: SUBSCRIPTIONS_TABLE,
    Key: { userId },
    UpdateExpression: 'SET #status = :status, currentPeriodEnd = :cpe, cancelAtPeriodEnd = :cap',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': subscription.status,
      ':cpe': new Date(subscription.current_period_end * 1000).toISOString(),
      ':cap': subscription.cancel_at_period_end
    }
  }).promise();

  // Update user status
  await dynamoDB.update({
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: 'SET subscriptionStatus = :status',
    ExpressionAttributeValues: {
      ':status': subscription.status
    }
  }).promise();
}

/**
 * Handle subscription deleted/canceled
 */
async function handleSubscriptionDeleted(subscription) {
  const userId = subscription.metadata.userId;

  if (!userId) return;

  // Downgrade to free
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
      ':status': 'canceled'
    }
  }).promise();

  // Update subscription record
  await dynamoDB.update({
    TableName: SUBSCRIPTIONS_TABLE,
    Key: { userId },
    UpdateExpression: 'SET #status = :status',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':status': 'canceled' }
  }).promise();

  console.log(`User ${userId} downgraded to FREE`);
}

/**
 * Handle payment failure
 */
async function handlePaymentFailed(invoice) {
  const customerId = invoice.customer;

  // Find user by customer ID
  const result = await dynamoDB.scan({
    TableName: USERS_TABLE,
    FilterExpression: 'stripeCustomerId = :cid',
    ExpressionAttributeValues: { ':cid': customerId }
  }).promise();

  if (result.Items && result.Items.length > 0) {
    const userId = result.Items[0].userId;
    await dynamoDB.update({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: 'SET subscriptionStatus = :status',
      ExpressionAttributeValues: { ':status': 'past_due' }
    }).promise();
  }
}

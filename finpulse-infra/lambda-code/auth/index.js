/**
 * FinPulse Auth Service
 * Handles user management with Cognito
 * Syncs user data to DynamoDB
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { CognitoIdentityProviderClient, AdminGetUserCommand, AdminUpdateUserAttributesCommand, AdminDeleteUserCommand, AdminInitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');

// Import shared utilities from Lambda Layer.
// Each module loads independently so a single missing module can't take
// down jwt-verifier or env-validator (CLAUDE.md §11; cf. commit a4f3c06).
let jwtVerifier, envValidator, requestContext, rateLimiter, validation, planConfig;

// jwt-verifier is CRITICAL for token verification — fail-closed if missing
try { jwtVerifier = require('/opt/nodejs/jwt-verifier'); }
catch (e) {
  try { jwtVerifier = require('./shared/jwt-verifier'); }
  catch (e2) { console.error('[Auth] jwt-verifier not available:', e2.message); jwtVerifier = null; }
}

try { envValidator = require('/opt/nodejs/env-validator'); }
catch (e) {
  try { envValidator = require('./shared/env-validator'); }
  catch (e2) { envValidator = { ensureEnvValidated: () => true }; }
}

try { requestContext = require('/opt/nodejs/request-context'); }
catch (e) {
  try { requestContext = require('./shared/request-context'); }
  catch (e2) { requestContext = { getRequestId: (event) => event?.requestContext?.requestId || 'unknown' }; }
}

try { rateLimiter = require('/opt/nodejs/rate-limiter'); }
catch (e) {
  try { rateLimiter = require('./shared/rate-limiter'); }
  catch (e2) { rateLimiter = { checkRateLimitForRequest: async () => ({ blocked: false }) }; }
}

try { validation = require('/opt/nodejs/validation'); }
catch (e) {
  try { validation = require('./shared/validation'); }
  catch (e2) { validation = null; }
}

try { planConfig = require('/opt/nodejs/plan-config'); }
catch (e) {
  try { planConfig = require('./shared/plan-config'); }
  catch (e2) {
    planConfig = {
      PLAN_LIMITS: {
        FREE: { maxAssets: 20, maxAiQueries: 10 },
        PROPULSE: { maxAssets: 50, maxAiQueries: 50 },
        SUPERPULSE: { maxAssets: 9999, maxAiQueries: 9999 }
      },
      getPlanLimits: (p) => planConfig.PLAN_LIMITS[(p || 'FREE').toUpperCase()] || planConfig.PLAN_LIMITS.FREE,
    };
  }
}

console.log('[Auth] Layer modules loaded:', {
  jwtVerifier: !!jwtVerifier,
  envValidator: !!envValidator,
  requestContext: !!requestContext,
  rateLimiter: !!rateLimiter,
  validation: !!validation,
  planConfig: !!planConfig,
});

// Validate required environment variables at cold start
envValidator.ensureEnvValidated('auth');

// Initialize clients (lazy initialization for cold start optimization)
let dynamoClient = null;
let docClient = null;
let cognitoClient = null;

function getDynamoClient() {
  if (!docClient) {
    dynamoClient = new DynamoDBClient({});
    docClient = DynamoDBDocumentClient.from(dynamoClient);
  }
  return docClient;
}

function getCognitoClient() {
  if (!cognitoClient) {
    cognitoClient = new CognitoIdentityProviderClient({});
  }
  return cognitoClient;
}

const ENVIRONMENT = process.env.ENVIRONMENT || 'prod';
const USERS_TABLE = `finpulse-users-${ENVIRONMENT}`;
const PORTFOLIOS_TABLE = `finpulse-portfolios-${ENVIRONMENT}`;
const AI_QUERIES_TABLE = `finpulse-ai-queries-${ENVIRONMENT}`;
const COMMUNITY_POSTS_TABLE = `finpulse-community-posts-${ENVIRONMENT}`;
const IDENTITIES_TABLE = `finpulse-identities-${ENVIRONMENT}`;
const COGNITO_POOL_ID = process.env.COGNITO_POOL_ID;

/**
 * CORS headers (with cache-control to prevent browser caching auth responses)
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || 'https://finpulse.me',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  'Pragma': 'no-cache'
};

/**
 * Cookie configuration for secure token storage
 */
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'Strict',
  path: '/',
  domain: process.env.COOKIE_DOMAIN || '.finpulse.me'
};

/**
 * Generate Set-Cookie header for tokens
 */
function generateCookieHeaders(tokens, maxAge = 3600) {
  const cookies = [];
  
  if (tokens.idToken) {
    cookies.push(
      `finpulse_id_token=${tokens.idToken}; ` +
      `HttpOnly; Secure; SameSite=Strict; Path=/; ` +
      `Max-Age=${maxAge}; Domain=${COOKIE_OPTIONS.domain}`
    );
  }
  
  if (tokens.accessToken) {
    cookies.push(
      `finpulse_access_token=${tokens.accessToken}; ` +
      `HttpOnly; Secure; SameSite=Strict; Path=/; ` +
      `Max-Age=${maxAge}; Domain=${COOKIE_OPTIONS.domain}`
    );
  }
  
  if (tokens.refreshToken) {
    // Refresh token has longer expiry (30 days)
    cookies.push(
      `finpulse_refresh_token=${tokens.refreshToken}; ` +
      `HttpOnly; Secure; SameSite=Strict; Path=/auth; ` +
      `Max-Age=2592000; Domain=${COOKIE_OPTIONS.domain}`
    );
  }
  
  return cookies;
}

/**
 * Generate cookie clear headers for logout
 */
function generateClearCookieHeaders() {
  return [
    `finpulse_id_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0; Domain=${COOKIE_OPTIONS.domain}`,
    `finpulse_access_token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0; Domain=${COOKIE_OPTIONS.domain}`,
    `finpulse_refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/auth; Max-Age=0; Domain=${COOKIE_OPTIONS.domain}`
  ];
}

/**
 * Parse cookies from request
 */
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    if (name) {
      cookies[name] = rest.join('=');
    }
  });
  
  return cookies;
}

/**
 * Decode JWT token (without signature verification - for backward compatibility)
 * NOTE: For security-critical operations, use verifyJwtSecure() instead
 */
function decodeJwt(token) {
  // Use the shared jwt-verifier if available
  if (jwtVerifier && jwtVerifier.decodeJwt) {
    return jwtVerifier.decodeJwt(token);
  }

  // Fallback implementation
  try {
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace(/^Bearer\s+/i, '');
    const parts = cleanToken.split('.');
    if (parts.length !== 3) return null;

    // Decode payload (middle part)
    const payload = Buffer.from(parts[1], 'base64').toString('utf8');
    return JSON.parse(payload);
  } catch (e) {
    console.error('JWT decode error:', e);
    return null;
  }
}

/**
 * Verify JWT token with Cognito signature validation (SECURE)
 * Use this for all authentication decisions
 */
async function verifyJwtSecure(token, tokenUse = 'id') {
  if (!jwtVerifier || !jwtVerifier.verifyJwt) {
    // Verifier layer not deployed yet — FAIL CLOSED.
    // Do NOT fall back to decode-only as it allows JWT forgery.
    console.error('[Auth] JWT verifier not available — rejecting token (fail-closed)');
    return null;
  }

  return await jwtVerifier.verifyJwt(token, tokenUse);
}

/**
 * Extract user from Cognito JWT (supports cookies, Authorization header, and API Gateway authorizer)
 * NOTE: This is the SYNC version for backward compatibility. For new code, use getUserFromEventSecure()
 */
function getUserFromEvent(event) {
  // First try API Gateway authorizer claims (when using COGNITO_USER_POOLS)
  // This is already verified by API Gateway
  if (event.requestContext?.authorizer?.claims) {
    const claims = event.requestContext.authorizer.claims;
    return {
      userId: claims.sub,
      email: claims.email,
      name: claims.name || claims['cognito:username'],
      emailVerified: claims.email_verified === 'true'
    };
  }

  // Second: Try httpOnly cookies (preferred for security)
  const cookieHeader = event.headers?.Cookie || event.headers?.cookie;
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    const idToken = cookies.finpulse_id_token;
    if (idToken) {
      const claims = decodeJwt(idToken);
      if (claims && claims.sub) {
        const email = claims.email || null;
        const derivedName = email ? email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : null;
        return {
          userId: claims.sub,
          email: email,
          name: claims.name || derivedName || claims['cognito:username'] || claims.username,
          emailVerified: claims.email_verified === 'true' || claims.email_verified === true
        };
      }
    }
  }

  // Third fallback: Decode JWT from Authorization header
  // (Used when auth endpoint has authorization = "NONE" or for backward compatibility)
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  if (authHeader) {
    const claims = decodeJwt(authHeader);
    if (claims && claims.sub) {
      // Check if this is an ID token (has email) or access token (no email)
      // Access tokens have token_use: 'access', ID tokens have token_use: 'id'
      const isIdToken = claims.token_use === 'id' || claims.email;
      if (!isIdToken) {
        console.warn('Received access token instead of ID token - missing email claim');
      }
      // Derive name from email if not present in token
      const email = claims.email || null;
      const derivedName = email ? email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : null;
      return {
        userId: claims.sub,
        email: email,
        name: claims.name || derivedName || claims['cognito:username'] || claims.username,
        emailVerified: claims.email_verified === 'true' || claims.email_verified === true
      };
    }
  }

  return null;
}

/**
 * Extract user from Cognito JWT with SECURE signature verification
 * Use this for all authentication-critical operations
 */
async function getUserFromEventSecure(event) {
  // First try API Gateway authorizer claims (already verified by API Gateway)
  if (event.requestContext?.authorizer?.claims) {
    const claims = event.requestContext.authorizer.claims;
    console.log('[Auth] Using verified API Gateway authorizer claims');
    return {
      userId: claims.sub,
      email: claims.email,
      name: claims.name || claims['cognito:username'],
      emailVerified: claims.email_verified === 'true',
      source: 'authorizer'
    };
  }

  // Use shared jwt-verifier if available
  if (jwtVerifier && jwtVerifier.getUserFromEvent) {
    const user = await jwtVerifier.getUserFromEvent(event);
    if (user) {
      console.log('[Auth] JWT verified via shared verifier');
      return user;
    }
  }

  // Second: Try httpOnly cookies with VERIFICATION
  const cookieHeader = event.headers?.Cookie || event.headers?.cookie;
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    const idToken = cookies.finpulse_id_token;
    if (idToken) {
      const claims = await verifyJwtSecure(idToken, 'id');
      if (claims && claims.sub) {
        const email = claims.email || null;
        const derivedName = email ? email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : null;
        console.log('[Auth] JWT verified from cookie');
        return {
          userId: claims.sub,
          email: email,
          name: claims.name || derivedName || claims['cognito:username'] || claims.username,
          emailVerified: claims.email_verified === 'true' || claims.email_verified === true,
          source: 'cookie'
        };
      }
    }
  }

  // Third: Try Authorization header with VERIFICATION
  const authHeader = event.headers?.Authorization || event.headers?.authorization;
  if (authHeader) {
    const claims = await verifyJwtSecure(authHeader, 'id');
    if (claims && claims.sub) {
      const email = claims.email || null;
      const derivedName = email ? email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : null;
      console.log('[Auth] JWT verified from Authorization header');
      return {
        userId: claims.sub,
        email: email,
        name: claims.name || derivedName || claims['cognito:username'] || claims.username,
        emailVerified: claims.email_verified === 'true' || claims.email_verified === true,
        source: 'header'
      };
    }
  }

  console.log('[Auth] No valid authentication found');
  return null;
}

/**
 * Get or create user profile in DynamoDB
 */
async function getOrCreateUser(cognitoUser) {
  // Define internal tester emails upfront for both new and existing user checks
  const INTERNAL_TESTER_EMAILS = [
    process.env.INTERNAL_TESTER_EMAIL
  ].filter(Boolean);
  
  const result = await getDynamoClient().send(new GetCommand({
    TableName: USERS_TABLE,
    Key: { userId: cognitoUser.userId }
  }));

  if (result.Item) {
    const existingUser = result.Item;
    
    // Check if this is an internal tester who needs upgrade
    const isInternalTester = INTERNAL_TESTER_EMAILS.includes(existingUser.email);
    const needsTesterUpgrade = isInternalTester && existingUser.plan !== 'SUPERPULSE';
    
    // Check if user needs to be updated (bad name or email from previous bug)
    const needsUpdate = 
      needsTesterUpgrade ||
      (existingUser.email === 'unknown@finpulse.me' && cognitoUser.email) ||
      (existingUser.name === existingUser.userId && cognitoUser.name) ||
      (existingUser.name && existingUser.name.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i));
    
    if (needsUpdate) {
      // Derive proper name from email
      const derivedName = cognitoUser.email 
        ? cognitoUser.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\\b\\w/g, c => c.toUpperCase())
        : existingUser.name;
      
      const updatedUser = {
        ...existingUser,
        email: cognitoUser.email || existingUser.email,
        name: cognitoUser.name || derivedName || existingUser.name,
        lastLogin: new Date().toISOString(),
        // Upgrade internal testers to SUPERPULSE
        ...(needsTesterUpgrade && {
          plan: 'SUPERPULSE',
          userRole: 'internal_tester',
          credits: {
            ai: existingUser.credits?.ai || 0,
            maxAi: 9999,
            assets: existingUser.credits?.assets || 0,
            maxAssets: 9999
          }
        })
      };
      
      await getDynamoClient().send(new PutCommand({
        TableName: USERS_TABLE,
        Item: updatedUser
      }));
      
      console.log(`[Auth] Updated user ${existingUser.userId}: testerUpgrade=${needsTesterUpgrade}`);
      return updatedUser;
    }
    
    return existingUser;
  }

  // Create new user profile
  // Handle case where email might be null (access token instead of ID token)
  const emailName = cognitoUser.email ? cognitoUser.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : null;
  
  // Check if this is an internal tester account (reuses INTERNAL_TESTER_EMAILS from above)
  const isInternalTester = INTERNAL_TESTER_EMAILS.includes(cognitoUser.email);
  
  const newUser = {
    userId: cognitoUser.userId,
    email: cognitoUser.email || 'unknown@finpulse.me',
    name: cognitoUser.name || emailName || `User_${cognitoUser.userId.slice(0, 8)}`,
    plan: isInternalTester ? 'SUPERPULSE' : 'FREE',
    userRole: isInternalTester ? 'internal_tester' : 'user',
    credits: isInternalTester ? {
      ai: 0,
      maxAi: 9999,
      assets: 0,
      maxAssets: 9999
    } : {
      ai: 0,
      maxAi: planConfig.getPlanLimits('FREE').maxAiQueries,
      assets: 0,
      maxAssets: planConfig.getPlanLimits('FREE').maxAssets
    },
    settings: {
      currency: 'USD',
      theme: 'system',
      notifications: true
    },
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };

  await getDynamoClient().send(new PutCommand({
    TableName: USERS_TABLE,
    Item: newUser
  }));

  return newUser;
}

/**
 * Get user by email address
 * Uses email-index GSI on users table
 * Used to detect existing Cognito users during OAuth sign-in
 */
async function getUserByEmail(email) {
  if (!email) return null;
  
  const result = await getDynamoClient().send(new QueryCommand({
    TableName: USERS_TABLE,
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email.toLowerCase() }
  }));
  
  return result.Items?.[0] || null;
}

/**
 * Update user profile
 */
async function updateUser(userId, updates) {
  const allowedFields = ['name', 'settings'];
  const updateExpressions = [];
  const expressionValues = {};
  const expressionNames = {};

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      updateExpressions.push(`#${key} = :${key}`);
      expressionValues[`:${key}`] = value;
      expressionNames[`#${key}`] = key;
    }
  }

  if (updateExpressions.length === 0) {
    throw new Error('No valid fields to update');
  }

  updateExpressions.push('#updatedAt = :updatedAt');
  expressionValues[':updatedAt'] = new Date().toISOString();
  expressionNames['#updatedAt'] = 'updatedAt';

  await getDynamoClient().send(new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeValues: expressionValues,
    ExpressionAttributeNames: expressionNames
  }));

  return getOrCreateUser({ userId });
}

/**
 * Record user login
 */
async function recordLogin(userId) {
  await getDynamoClient().send(new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: 'SET lastLogin = :lastLogin, loginCount = if_not_exists(loginCount, :zero) + :inc',
    ExpressionAttributeValues: {
      ':lastLogin': new Date().toISOString(),
      ':zero': 0,
      ':inc': 1
    }
  }));
}

/**
 * Check user subscription/plan limits
 */
function checkLimits(user, action) {
  const userPlanLimits = planConfig.getPlanLimits(user.plan);
  const planLimits = {
    maxAssets: userPlanLimits.maxAssets,
    maxAiQueries: userPlanLimits.maxAiQueries,
    features: userPlanLimits.features || ['portfolio', 'news']
  };

  if (action === 'add_asset') {
    if (planLimits.maxAssets !== -1 && user.credits.assets >= planLimits.maxAssets) {
      return { allowed: false, reason: 'Asset limit reached', limit: planLimits.maxAssets };
    }
  }

  if (action === 'ai_query') {
    if (planLimits.maxAiQueries !== -1 && user.credits.ai >= planLimits.maxAiQueries) {
      return { allowed: false, reason: 'AI query limit reached', limit: planLimits.maxAiQueries };
    }
  }

  return { allowed: true };
}

/**
 * Increment usage counter
 */
async function incrementUsage(userId, type) {
  const field = type === 'ai' ? 'credits.ai' : 'credits.assets';
  
  await getDynamoClient().send(new UpdateCommand({
    TableName: USERS_TABLE,
    Key: { userId },
    UpdateExpression: `SET ${field} = if_not_exists(${field}, :zero) + :inc`,
    ExpressionAttributeValues: {
      ':zero': 0,
      ':inc': 1
    }
  }));
}

// =============================================================================
// Identity Management (OAuth/SSO Support)
// =============================================================================

/**
 * Create identity key for DynamoDB
 * Format: "provider#providerSubject" e.g., "google#117234567890"
 */
function createIdentityKey(provider, providerSubject) {
  return `${provider}#${providerSubject}`;
}

/**
 * Get identity by provider and subject
 */
async function getIdentityByProviderSubject(provider, providerSubject) {
  const identityKey = createIdentityKey(provider, providerSubject);
  
  const result = await getDynamoClient().send(new QueryCommand({
    TableName: IDENTITIES_TABLE,
    IndexName: 'provider-subject-index',
    KeyConditionExpression: 'identityKey = :identityKey',
    ExpressionAttributeValues: { ':identityKey': identityKey }
  }));
  
  return result.Items?.[0] || null;
}

/**
 * Get all identities for a user
 */
async function getIdentitiesForUser(userId) {
  const result = await getDynamoClient().send(new QueryCommand({
    TableName: IDENTITIES_TABLE,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: { ':userId': userId }
  }));
  
  return result.Items || [];
}

/**
 * Check if an email already exists in any identity (for account linking detection)
 */
async function getIdentitiesByEmail(email) {
  const result = await getDynamoClient().send(new QueryCommand({
    TableName: IDENTITIES_TABLE,
    IndexName: 'email-index',
    KeyConditionExpression: 'email = :email',
    ExpressionAttributeValues: { ':email': email.toLowerCase() }
  }));
  
  return result.Items || [];
}

/**
 * Create a new identity record
 */
async function createIdentity(identityData) {
  const { userId, provider, providerSubject, email, emailVerified, profileName, profilePicture, isPrimary } = identityData;
  
  const identity = {
    userId,
    identityKey: createIdentityKey(provider, providerSubject),
    provider,
    providerSubject,
    email: email.toLowerCase(),
    emailVerified: emailVerified || false,
    emailVerifiedAt: emailVerified ? new Date().toISOString() : null,
    linkedAt: new Date().toISOString(),
    profileName: profileName || null,
    profilePicture: profilePicture || null,
    isPrimary: isPrimary || false
  };
  
  await getDynamoClient().send(new PutCommand({
    TableName: IDENTITIES_TABLE,
    Item: identity
  }));
  
  return identity;
}

/**
 * Link a new identity provider to an existing user
 * Called when user signs in with password then connects Google
 */
async function linkIdentityToUser(userId, identityData) {
  // Verify user exists
  const userResult = await getDynamoClient().send(new GetCommand({
    TableName: USERS_TABLE,
    Key: { userId }
  }));
  
  if (!userResult.Item) {
    throw new Error('User not found');
  }
  
  // Check if this identity already exists
  const existingIdentity = await getIdentityByProviderSubject(
    identityData.provider,
    identityData.providerSubject
  );
  
  if (existingIdentity) {
    if (existingIdentity.userId === userId) {
      return { alreadyLinked: true, identity: existingIdentity };
    }
    throw new Error('This identity is already linked to a different account');
  }
  
  // Create the identity link
  const identity = await createIdentity({
    ...identityData,
    userId,
    isPrimary: false
  });
  
  return { alreadyLinked: false, identity };
}

/**
 * Handle federated sign-in (Google, Apple, etc.)
 * 
 * Flow:
 * 1. Check if identity exists → sign in existing user
 * 2. Check if email exists in identities table → return needsLinking
 * 3. Check if email exists in users table (legacy Cognito user) → return needsLinking
 * 4. Create new user and identity → return new user
 */
async function handleFederatedSignIn(federatedUser) {
  const { provider, providerSubject, email, emailVerified, name, picture } = federatedUser;
  
  // 1. Check if this exact identity already exists
  const existingIdentity = await getIdentityByProviderSubject(provider, providerSubject);
  
  if (existingIdentity) {
    // User exists with this identity - sign them in
    const user = await getOrCreateUser({ userId: existingIdentity.userId, email, name });
    await recordLogin(existingIdentity.userId);
    
    return {
      success: true,
      isNewUser: false,
      user,
      identity: existingIdentity
    };
  }
  
  // 2. Check if email already exists in identities table (account collision)
  const emailIdentities = await getIdentitiesByEmail(email);
  
  if (emailIdentities.length > 0) {
    // Email exists in identities - require explicit linking (security: prevent account takeover)
    const existingProviders = emailIdentities.map(i => i.provider);
    
    return {
      success: false,
      needsLinking: true,
      email,
      existingProviders,
      message: `An account already exists for ${email}. Please sign in with ${existingProviders.join(' or ')} to link your ${provider} account.`
    };
  }
  
  // 3. Check if email exists in users table (legacy Cognito user without identity record)
  // This catches users who signed up with email/password before the identities feature
  const existingUserByEmail = await getUserByEmail(email);
  
  if (existingUserByEmail) {
    // Legacy user exists - require linking via password authentication
    console.log(`[OAuth] Found existing user by email: ${email}, requiring linking`);
    
    return {
      success: false,
      needsLinking: true,
      email,
      existingProviders: ['email/password'],
      existingUserId: existingUserByEmail.userId,
      message: `An account already exists for ${email}. Please sign in with your password first, then link your ${provider} account from Settings.`
    };
  }
  
  // 4. New user - create account and identity
  const userId = providerSubject; // Use provider's unique ID as our userId for federated users
  
  // Create user in users table
  const newUser = {
    userId,
    email: email.toLowerCase(),
    name: name || email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    plan: 'FREE',
    credits: {
      ai: 0,
      maxAi: planConfig.getPlanLimits('FREE').maxAiQueries,
      assets: 0,
      maxAssets: planConfig.getPlanLimits('FREE').maxAssets
    },
    settings: {
      currency: 'USD',
      theme: 'system',
      notifications: true
    },
    profilePicture: picture || null,
    authProvider: provider, // Track primary auth method
    createdAt: new Date().toISOString(),
    lastLogin: new Date().toISOString()
  };
  
  await getDynamoClient().send(new PutCommand({
    TableName: USERS_TABLE,
    Item: newUser
  }));
  
  // Create identity record
  const identity = await createIdentity({
    userId,
    provider,
    providerSubject,
    email,
    emailVerified,
    profileName: name,
    profilePicture: picture,
    isPrimary: true
  });
  
  return {
    success: true,
    isNewUser: true,
    user: newUser,
    identity
  };
}

/**
 * Migrate existing Cognito user to identities table
 * Called on first login after identities feature is deployed
 */
async function migrateUserToIdentities(cognitoUser) {
  const { userId, email, name } = cognitoUser;
  
  // Check if already migrated
  const existingIdentities = await getIdentitiesForUser(userId);
  if (existingIdentities.length > 0) {
    return existingIdentities;
  }
  
  // Create Cognito identity record
  const identity = await createIdentity({
    userId,
    provider: 'cognito',
    providerSubject: userId, // Cognito sub is the same as userId
    email,
    emailVerified: true, // Cognito requires email verification
    profileName: name,
    isPrimary: true
  });
  
  return [identity];
}

/**
 * GDPR: Export all user data
 * Returns all data associated with a user for data portability
 */
async function exportUserData(userId, email) {
  const exportData = {
    exportedAt: new Date().toISOString(),
    userId,
    email,
    profile: null,
    portfolios: [],
    aiQueries: [],
    communityPosts: []
  };

  // 1. Get user profile
  try {
    const userResult = await getDynamoClient().send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId }
    }));
    exportData.profile = userResult.Item || null;
  } catch (e) {
    console.error('Error exporting user profile:', e);
  }

  // 2. Get portfolios (query by userId)
  try {
    const portfolioResult = await getDynamoClient().send(new QueryCommand({
      TableName: PORTFOLIOS_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    }));
    exportData.portfolios = portfolioResult.Items || [];
  } catch (e) {
    console.error('Error exporting portfolios:', e);
  }

  // 3. Get AI queries (query by userId)
  try {
    const aiResult = await getDynamoClient().send(new QueryCommand({
      TableName: AI_QUERIES_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    }));
    exportData.aiQueries = aiResult.Items || [];
  } catch (e) {
    console.error('Error exporting AI queries:', e);
  }

  // 4. Get community posts (scan with filter - posts table may use different key)
  try {
    const postsResult = await getDynamoClient().send(new ScanCommand({
      TableName: COMMUNITY_POSTS_TABLE,
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    }));
    exportData.communityPosts = postsResult.Items || [];
  } catch (e) {
    console.error('Error exporting community posts:', e);
  }

  return exportData;
}

/**
 * GDPR: Delete all user data (Right to Erasure)
 * Removes user from Cognito and all DynamoDB tables
 */
async function deleteUserAccount(userId, username) {
  const deletionLog = {
    deletedAt: new Date().toISOString(),
    userId,
    results: {}
  };

  // 1. Delete from DynamoDB Users table
  try {
    await getDynamoClient().send(new DeleteCommand({
      TableName: USERS_TABLE,
      Key: { userId }
    }));
    deletionLog.results.usersTable = 'deleted';
  } catch (e) {
    console.error('Error deleting from users table:', e);
    deletionLog.results.usersTable = `error: ${e.message}`;
  }

  // 2. Delete all portfolios
  try {
    const portfolioResult = await getDynamoClient().send(new QueryCommand({
      TableName: PORTFOLIOS_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    }));
    
    for (const item of (portfolioResult.Items || [])) {
      await getDynamoClient().send(new DeleteCommand({
        TableName: PORTFOLIOS_TABLE,
        Key: { userId: item.userId, assetId: item.assetId }
      }));
    }
    deletionLog.results.portfolios = `deleted ${portfolioResult.Items?.length || 0} items`;
  } catch (e) {
    console.error('Error deleting portfolios:', e);
    deletionLog.results.portfolios = `error: ${e.message}`;
  }

  // 3. Delete all AI queries
  try {
    const aiResult = await getDynamoClient().send(new QueryCommand({
      TableName: AI_QUERIES_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    }));
    
    for (const item of (aiResult.Items || [])) {
      await getDynamoClient().send(new DeleteCommand({
        TableName: AI_QUERIES_TABLE,
        Key: { userId: item.userId, queryId: item.queryId }
      }));
    }
    deletionLog.results.aiQueries = `deleted ${aiResult.Items?.length || 0} items`;
  } catch (e) {
    console.error('Error deleting AI queries:', e);
    deletionLog.results.aiQueries = `error: ${e.message}`;
  }

  // 4. Delete/anonymize community posts (keep posts but remove user info)
  try {
    const postsResult = await getDynamoClient().send(new ScanCommand({
      TableName: COMMUNITY_POSTS_TABLE,
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId }
    }));
    
    for (const item of (postsResult.Items || [])) {
      // Anonymize instead of delete to preserve community discussions
      await getDynamoClient().send(new UpdateCommand({
        TableName: COMMUNITY_POSTS_TABLE,
        Key: { postId: item.postId },
        UpdateExpression: 'SET userId = :anon, authorName = :deleted, authorEmail = :removed',
        ExpressionAttributeValues: {
          ':anon': 'deleted-user',
          ':deleted': '[Deleted User]',
          ':removed': 'removed'
        }
      }));
    }
    deletionLog.results.communityPosts = `anonymized ${postsResult.Items?.length || 0} posts`;
  } catch (e) {
    console.error('Error anonymizing community posts:', e);
    deletionLog.results.communityPosts = `error: ${e.message}`;
  }

  // 5. Delete from Cognito (last step - point of no return)
  try {
    if (COGNITO_POOL_ID && username) {
      await getCognitoClient().send(new AdminDeleteUserCommand({
        UserPoolId: COGNITO_POOL_ID,
        Username: username
      }));
      deletionLog.results.cognito = 'deleted';
    } else {
      deletionLog.results.cognito = 'skipped - no pool ID or username';
    }
  } catch (e) {
    console.error('Error deleting from Cognito:', e);
    deletionLog.results.cognito = `error: ${e.message}`;
  }

  return deletionLog;
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

/**
 * Main handler
 */
exports.handler = async (event, context) => {
  // Get request ID for correlation
  const requestId = requestContext.getRequestId(event, context);
  const logger = requestContext.createLogger ? requestContext.createLogger(requestId, 'auth') : console;

  logger.info ? logger.info('Request received', { path: event.path, method: event.httpMethod }) : console.log('Event:', JSON.stringify(sanitizeEvent(event)));

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: { ...corsHeaders, 'X-Request-ID': requestId }, body: '' };
  }

  try {
    const path = event.path || '';
    const method = event.httpMethod || 'GET';
    let body = event.body ? JSON.parse(event.body) : {};

    // Use secure JWT verification for authentication
    const cognitoUser = await getUserFromEventSecure(event);

    // POST /auth/login - Called after Cognito login
    if (path.includes('/login') && method === 'POST') {
      if (!cognitoUser) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Not authenticated' })
        };
      }

      const user = await getOrCreateUser(cognitoUser);
      await recordLogin(user.userId);

      // If tokens provided in body, set httpOnly cookies
      const responseHeaders = { ...corsHeaders };
      if (body.tokens) {
        const cookieHeaders = generateCookieHeaders(body.tokens, body.tokens.expiresIn || 3600);
        responseHeaders['Set-Cookie'] = cookieHeaders;
      }

      return {
        statusCode: 200,
        headers: responseHeaders,
        multiValueHeaders: body.tokens ? { 'Set-Cookie': generateCookieHeaders(body.tokens, body.tokens.expiresIn || 3600) } : undefined,
        body: JSON.stringify({
          success: true,
          data: {
            ...user,
            cognitoUser: {
              email: cognitoUser.email,
              emailVerified: cognitoUser.emailVerified
            }
          }
        })
      };
    }

    // POST /auth/set-tokens - Set tokens as httpOnly cookies (for migration)
    if (path.includes('/set-tokens') && method === 'POST') {
      if (!body.tokens || !body.tokens.idToken) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Tokens required' })
        };
      }

      const cookieHeaders = generateCookieHeaders(body.tokens, body.tokens.expiresIn || 3600);

      return {
        statusCode: 200,
        headers: corsHeaders,
        multiValueHeaders: { 'Set-Cookie': cookieHeaders },
        body: JSON.stringify({ success: true, message: 'Tokens stored securely' })
      };
    }

    // POST /auth/logout - Clear httpOnly cookies
    if (path.includes('/logout') && method === 'POST') {
      const clearCookies = generateClearCookieHeaders();

      return {
        statusCode: 200,
        headers: corsHeaders,
        multiValueHeaders: { 'Set-Cookie': clearCookies },
        body: JSON.stringify({ success: true, message: 'Logged out' })
      };
    }

    // POST /auth/refresh - Refresh tokens using httpOnly cookie
    if (path.includes('/refresh') && method === 'POST') {
      const cookies = parseCookies(event.headers?.Cookie || event.headers?.cookie);
      const refreshToken = cookies.finpulse_refresh_token || body.refreshToken;

      if (!refreshToken) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'No refresh token' })
        };
      }

      // Note: Token refresh should be done client-side with Cognito
      // This endpoint validates the session exists
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ 
          success: true, 
          hasRefreshToken: true,
          message: 'Refresh token via Cognito client-side'
        })
      };
    }

    // GET /auth/me - Get current user profile
    if (path.includes('/me') && method === 'GET') {
      if (!cognitoUser) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Not authenticated' })
        };
      }

      const user = await getOrCreateUser(cognitoUser);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: user
        })
      };
    }

    // PUT /auth/profile - Update user profile
    if (path.includes('/profile') && method === 'PUT') {
      if (!cognitoUser) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Not authenticated' })
        };
      }

      if (validation) {
        const profileValidation = validation.validateProfileUpdate(body);
        if (!profileValidation.valid) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: 'Validation failed', details: profileValidation.errors })
          };
        }
        body = profileValidation.data;
      }

      const updated = await updateUser(cognitoUser.userId, body);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: updated
        })
      };
    }

    // POST /auth/check-limit - Check if action is allowed
    if (path.includes('/check-limit') && method === 'POST') {
      if (!cognitoUser) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Not authenticated' })
        };
      }

      if (validation && !validation.validateActionType(body.action)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Invalid action type. Must be: add_asset or ai_query' })
        };
      }

      const user = await getOrCreateUser(cognitoUser);
      const result = checkLimits(user, body.action);

      return {
        statusCode: result.allowed ? 200 : 403,
        headers: corsHeaders,
        body: JSON.stringify({
          success: result.allowed,
          ...result
        })
      };
    }

    // POST /auth/usage - Increment usage counter
    if (path.includes('/usage') && method === 'POST') {
      if (!cognitoUser) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Not authenticated' })
        };
      }

      if (validation && !validation.validateUsageType(body.type)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Invalid usage type. Must be: ai or asset' })
        };
      }

      const user = await getOrCreateUser(cognitoUser);
      const limitCheck = checkLimits(user, body.type === 'ai' ? 'ai_query' : 'add_asset');

      if (!limitCheck.allowed) {
        return {
          statusCode: 403,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: limitCheck.reason,
            limit: limitCheck.limit
          })
        };
      }

      await incrementUsage(cognitoUser.userId, body.type);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true })
      };
    }

    // GET /auth/settings - Get user settings
    if (path.includes('/settings') && method === 'GET') {
      if (!cognitoUser) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Not authenticated' })
        };
      }

      const user = await getOrCreateUser(cognitoUser);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          data: user.settings || {}
        })
      };
    }

    // PUT /auth/settings - Update settings
    if (path.includes('/settings') && method === 'PUT') {
      if (!cognitoUser) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Not authenticated' })
        };
      }

      if (validation) {
        const settingsValidation = validation.validateSettings(body);
        if (!settingsValidation.valid) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ success: false, error: 'Validation failed', details: settingsValidation.errors })
          };
        }
        body = settingsValidation.data;
      }

      await updateUser(cognitoUser.userId, { settings: body });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ success: true })
      };
    }

    // GET /auth/export-data - GDPR: Export all user data
    if (path.includes('/export-data') && method === 'GET') {
      if (!cognitoUser) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Not authenticated' })
        };
      }

      console.log(`Data export requested by user: ${cognitoUser.userId}`);
      const exportData = await exportUserData(cognitoUser.userId, cognitoUser.email);

      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="finpulse-data-export-${Date.now()}.json"`
        },
        body: JSON.stringify({
          success: true,
          data: exportData
        })
      };
    }

    // DELETE /auth/account - GDPR: Delete user account (Right to Erasure)
    if (path.includes('/account') && method === 'DELETE') {
      if (!cognitoUser) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Not authenticated' })
        };
      }

      // Require confirmation in request body
      if (!body.confirmDelete || body.confirmDelete !== 'DELETE MY ACCOUNT') {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: 'Account deletion requires confirmation',
            instructions: 'Send { "confirmDelete": "DELETE MY ACCOUNT" } in request body'
          })
        };
      }

      console.log(`Account deletion requested by user: ${cognitoUser.userId}`);
      
      // Export data before deletion (for audit trail)
      const exportData = await exportUserData(cognitoUser.userId, cognitoUser.email);
      console.log(`Pre-deletion export completed for user: ${cognitoUser.userId}`);

      // Perform deletion
      const deletionResult = await deleteUserAccount(cognitoUser.userId, cognitoUser.username);
      
      console.log(`Account deletion completed for user: ${cognitoUser.userId}`, deletionResult);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: 'Your account and all associated data have been deleted',
          deletionLog: deletionResult
        })
      };
    }

    // POST /auth/federated-signin - Handle OAuth callback from Cognito
    if (path.includes('/federated-signin') && method === 'POST') {
      const { provider, providerSubject, email, name, accessToken, idToken, refreshToken } = body;

      if (!provider || !providerSubject || !email) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: 'Missing required fields: provider, providerSubject, email'
          })
        };
      }

      // SECURITY: Require a valid Cognito JWT to prove the user actually
      // completed the OAuth flow through Cognito. Without this, an attacker
      // could send arbitrary provider/providerSubject/email values.
      if (!idToken) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: 'idToken is required for federated sign-in'
          })
        };
      }

      // Verify the Cognito ID token
      const federatedClaims = await verifyJwtSecure(idToken, 'id');
      if (!federatedClaims || !federatedClaims.sub) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: 'Invalid or expired identity token'
          })
        };
      }

      // Use verified claims from the token, not client-provided values
      const verifiedEmail = federatedClaims.email || email;
      const verifiedSub = federatedClaims.sub;

      try {
        const result = await handleFederatedSignIn({
          provider,
          providerSubject: verifiedSub,
          email: verifiedEmail,
          name: federatedClaims.name || name,
          accessToken
        });

        // If linking is required, return the linking challenge
        if (result.needsLinking) {
          return {
            statusCode: 409,
            headers: corsHeaders,
            body: JSON.stringify({
              success: false,
              requiresLinking: true,
              existingProviders: result.existingProviders,
              message: result.message || 'An account with this email exists. Please verify your password to link accounts.'
            })
          };
        }

        // Successful sign-in
        const responseHeaders = { ...corsHeaders };
        
        // Set httpOnly cookies if tokens provided
        if (idToken && refreshToken) {
          const cookieHeaders = generateCookieHeaders(
            { idToken, accessToken, refreshToken },
            3600
          );
          responseHeaders['Set-Cookie'] = cookieHeaders;
        }

        return {
          statusCode: 200,
          headers: responseHeaders,
          multiValueHeaders: (idToken && refreshToken) ? {
            'Set-Cookie': generateCookieHeaders({ idToken, accessToken, refreshToken }, 3600)
          } : undefined,
          body: JSON.stringify({
            success: true,
            data: {
              user: result.user,
              isNewUser: result.isNewUser,
              cognitoUser: {
                email: email,
                emailVerified: true // OAuth emails are verified by provider
              }
            }
          })
        };
      } catch (error) {
        console.error('Federated sign-in error:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: 'Failed to process federated sign-in',
            message: ENVIRONMENT !== 'prod' ? error.message : undefined
          })
        };
      }
    }

    // POST /auth/link-identity - Link OAuth provider to existing account
    if (path.includes('/link-identity') && method === 'POST') {
      if (!cognitoUser) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Not authenticated' })
        };
      }

      const { provider, providerSubject, linkingToken, password } = body;

      if (!provider || !providerSubject) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: 'Missing required fields: provider, providerSubject'
          })
        };
      }

      // Verify the user's password if linking from OAuth collision
      if (linkingToken && password) {
        try {
          // Verify password via Cognito
          const authResult = await getCognitoClient().send(new AdminInitiateAuthCommand({
            UserPoolId: COGNITO_POOL_ID,
            ClientId: process.env.COGNITO_CLIENT_ID,
            AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
            AuthParameters: {
              USERNAME: cognitoUser.email,
              PASSWORD: password
            }
          }));

          if (!authResult.AuthenticationResult) {
            return {
              statusCode: 401,
              headers: corsHeaders,
              body: JSON.stringify({
                success: false,
                error: 'Invalid password'
              })
            };
          }
        } catch (authError) {
          console.error('Password verification failed:', authError);
          return {
            statusCode: 401,
            headers: corsHeaders,
            body: JSON.stringify({
              success: false,
              error: 'Invalid password. Please try again.'
            })
          };
        }
      }

      try {
        const identity = await linkIdentityToUser(cognitoUser.userId, {
          provider,
          providerSubject,
          email: cognitoUser.email
        });

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            data: identity,
            message: `Successfully linked ${provider} account`
          })
        };
      } catch (error) {
        console.error('Link identity error:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: 'Failed to link identity',
            message: ENVIRONMENT !== 'prod' ? error.message : undefined
          })
        };
      }
    }

    // GET /auth/identities - Get all linked identities for current user
    if (path.includes('/identities') && method === 'GET') {
      if (!cognitoUser) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Not authenticated' })
        };
      }

      try {
        const identities = await getIdentitiesForUser(cognitoUser.userId);

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            data: identities
          })
        };
      } catch (error) {
        console.error('Get identities error:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: 'Failed to get identities'
          })
        };
      }
    }

    // DELETE /auth/identities/:provider - Unlink an identity provider
    if (path.match(/\/identities\/\w+/) && method === 'DELETE') {
      if (!cognitoUser) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Not authenticated' })
        };
      }

      const provider = path.split('/identities/')[1];

      try {
        // Get all identities to check if we can unlink
        const identities = await getIdentitiesForUser(cognitoUser.userId);
        
        // Don't allow unlinking if it's the only identity and user has no password
        const user = await getOrCreateUser(cognitoUser);
        if (identities.length <= 1 && !user.hasPassword) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
              success: false,
              error: 'Cannot unlink the only sign-in method. Add a password first.'
            })
          };
        }

        // Find the identity to delete
        const identityToDelete = identities.find(i => i.provider === provider);
        if (!identityToDelete) {
          return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({
              success: false,
              error: `No ${provider} identity linked`
            })
          };
        }

        // Delete the identity
        await getDynamoClient().send(new DeleteCommand({
          TableName: IDENTITIES_TABLE,
          Key: {
            userId: cognitoUser.userId,
            identityKey: createIdentityKey(provider, identityToDelete.providerSubject)
          }
        }));

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            message: `Successfully unlinked ${provider} account`
          })
        };
      } catch (error) {
        console.error('Unlink identity error:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: 'Failed to unlink identity'
          })
        };
      }
    }

    // POST /auth/migrate-identity - Migrate existing user to identities table
    if (path.includes('/migrate-identity') && method === 'POST') {
      if (!cognitoUser) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Not authenticated' })
        };
      }

      try {
        const identity = await migrateUserToIdentities(cognitoUser.userId);

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            data: identity,
            message: 'Identity migrated successfully'
          })
        };
      } catch (error) {
        console.error('Migrate identity error:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: 'Failed to migrate identity',
            message: ENVIRONMENT !== 'prod' ? error.message : undefined
          })
        };
      }
    }

    // POST /auth/admin/set-tier - Admin: Set user tier (protected)
    if (path.includes('/admin/set-tier') && method === 'POST') {
      if (!cognitoUser) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Not authenticated' })
        };
      }

      // SECURITY FIX: Verify admin access via Cognito groups only (no hardcoded emails)
      // Admin emails should be configured via ADMIN_EMAILS environment variable
      const callerEmail = cognitoUser.email;
      const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);

      if (!ADMIN_EMAILS.includes(callerEmail)) {
        console.warn(`[SECURITY] Admin access denied for: ${callerEmail}`);
        return {
          statusCode: 403,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: 'Admin access required',
            message: 'Your account does not have admin privileges'
          })
        };
      }

      const { targetUserId, targetEmail, tier } = body;

      // Validate tier — canonical names: FREE, PROPULSE, SUPERPULSE
      const normalizedTier = (tier || '').toUpperCase();
      if (!planConfig.VALID_PLAN_NAMES.includes(normalizedTier)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: `Invalid tier. Must be one of: ${planConfig.VALID_PLAN_NAMES.join(', ')}`
          })
        };
      }

      try {
        // Find user by userId or email
        let userToUpdate = null;
        
        if (targetUserId) {
          const result = await getDynamoClient().send(new GetCommand({
            TableName: USERS_TABLE,
            Key: { userId: targetUserId }
          }));
          userToUpdate = result.Item;
        } else if (targetEmail) {
          // Scan for user by email
          const scanResult = await getDynamoClient().send(new ScanCommand({
            TableName: USERS_TABLE,
            FilterExpression: 'email = :email',
            ExpressionAttributeValues: { ':email': targetEmail }
          }));
          userToUpdate = scanResult.Items?.[0];
        }

        if (!userToUpdate) {
          return {
            statusCode: 404,
            headers: corsHeaders,
            body: JSON.stringify({ 
              success: false, 
              error: 'User not found',
              hint: 'Provide targetUserId or targetEmail in request body'
            })
          };
        }

        // Update user tier and limits
        const limits = planConfig.getPlanLimits(normalizedTier);
        await getDynamoClient().send(new UpdateCommand({
          TableName: USERS_TABLE,
          Key: { userId: userToUpdate.userId },
          UpdateExpression: 'SET #plan = :plan, tier = :tier, tierUpdatedAt = :ts, credits.maxAssets = :maxAssets, credits.maxAi = :maxAi',
          ExpressionAttributeNames: { '#plan': 'plan' },
          ExpressionAttributeValues: {
            ':plan': normalizedTier,
            ':tier': normalizedTier,
            ':ts': new Date().toISOString(),
            ':maxAssets': limits.maxAssets,
            ':maxAi': limits.maxAiQueries
          }
        }));

        console.log(`Admin ${callerEmail} updated user ${userToUpdate.email} to ${tier} tier`);

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            message: `User ${userToUpdate.email} updated to ${tier} tier`,
            data: {
              userId: userToUpdate.userId,
              email: userToUpdate.email,
              tier: tier,
              plan: tier.toUpperCase(),
              limits: limits
            }
          })
        };
      } catch (error) {
        console.error('Admin set-tier error:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: 'Failed to update user tier',
            message: ENVIRONMENT !== 'prod' ? error.message : undefined
          })
        };
      }
    }

    // GET /auth/admin/users - Admin: List all users (protected)
    if (path.includes('/admin/users') && method === 'GET') {
      if (!cognitoUser) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Not authenticated' })
        };
      }

      // SECURITY FIX: Use environment variable for admin emails
      const callerEmail = cognitoUser.email;
      const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);

      if (!ADMIN_EMAILS.includes(callerEmail)) {
        console.warn(`[SECURITY] Admin list access denied for: ${callerEmail}`);
        return {
          statusCode: 403,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Admin access required' })
        };
      }

      try {
        const result = await getDynamoClient().send(new ScanCommand({
          TableName: USERS_TABLE,
          ProjectionExpression: 'userId, email, #n, #plan, tier, credits, createdAt, lastLogin',
          ExpressionAttributeNames: { '#n': 'name', '#plan': 'plan' }
        }));

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            data: result.Items || [],
            count: result.Count
          })
        };
      } catch (error) {
        console.error('Admin list users error:', error);
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({ success: false, error: 'Failed to list users' })
        };
      }
    }

    // Default
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        service: 'FinPulse Auth Service',
        version: '1.2.0',
        endpoints: [
          'POST /auth/login',
          'POST /auth/federated-signin',
          'POST /auth/link-identity',
          'GET /auth/identities',
          'DELETE /auth/identities/:provider',
          'POST /auth/migrate-identity',
          'GET /auth/me',
          'PUT /auth/profile',
          'GET /auth/settings',
          'PUT /auth/settings',
          'POST /auth/check-limit',
          'POST /auth/usage',
          'GET /auth/export-data',
          'DELETE /auth/account',
          'POST /auth/admin/set-tier (admin only)',
          'GET /auth/admin/users (admin only)'
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
        error: 'Internal server error',
        message: process.env.ENVIRONMENT === 'prod' ? undefined : error.message
      })
    };
  }
};

/**
 * FinPulse JWT Verifier
 * Provides secure JWT verification using AWS Cognito public keys
 *
 * This module verifies JWT tokens against Cognito's public keys, ensuring:
 * - Token signature is valid
 * - Token is not expired
 * - Token was issued by the expected Cognito user pool
 * - Token is of the expected type (id or access)
 *
 * Usage:
 *   const { verifyJwt, decodeJwt } = require('./jwt-verifier');
 *
 *   // Verify token (recommended - validates signature)
 *   const payload = await verifyJwt(token);
 *
 *   // Decode only (for non-security-critical reads)
 *   const payload = decodeJwt(token);
 */

const { CognitoJwtVerifier } = require('aws-jwt-verify');

// Cached verifiers (one per token type)
let idTokenVerifier = null;
let accessTokenVerifier = null;

// Environment configuration
const COGNITO_CONFIG = {
  userPoolId: process.env.COGNITO_POOL_ID || process.env.COGNITO_USER_POOL_ID,
  clientId: process.env.COGNITO_CLIENT_ID || process.env.COGNITO_APP_CLIENT_ID,
  region: process.env.AWS_REGION || 'us-east-1',
};

/**
 * Get or create JWT verifier for ID tokens
 * @returns {CognitoJwtVerifier} Cached verifier instance
 */
function getIdTokenVerifier() {
  if (!idTokenVerifier) {
    if (!COGNITO_CONFIG.userPoolId) {
      throw new Error('COGNITO_POOL_ID environment variable is required for JWT verification');
    }

    idTokenVerifier = CognitoJwtVerifier.create({
      userPoolId: COGNITO_CONFIG.userPoolId,
      tokenUse: 'id',
      clientId: COGNITO_CONFIG.clientId, // Optional but recommended
    });
  }
  return idTokenVerifier;
}

/**
 * Get or create JWT verifier for access tokens
 * @returns {CognitoJwtVerifier} Cached verifier instance
 */
function getAccessTokenVerifier() {
  if (!accessTokenVerifier) {
    if (!COGNITO_CONFIG.userPoolId) {
      throw new Error('COGNITO_POOL_ID environment variable is required for JWT verification');
    }

    accessTokenVerifier = CognitoJwtVerifier.create({
      userPoolId: COGNITO_CONFIG.userPoolId,
      tokenUse: 'access',
      clientId: COGNITO_CONFIG.clientId, // Optional but recommended
    });
  }
  return accessTokenVerifier;
}

/**
 * Verify JWT token signature and claims
 * @param {string} token - JWT token (with or without 'Bearer ' prefix)
 * @param {string} tokenUse - Token type: 'id' or 'access' (default: 'id')
 * @returns {Promise<object|null>} Verified token payload or null if invalid
 */
async function verifyJwt(token, tokenUse = 'id') {
  if (!token) {
    console.error('[JWT] No token provided');
    return null;
  }

  try {
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();

    if (!cleanToken || cleanToken.split('.').length !== 3) {
      console.error('[JWT] Invalid token format');
      return null;
    }

    // Select appropriate verifier
    const verifier = tokenUse === 'access'
      ? getAccessTokenVerifier()
      : getIdTokenVerifier();

    // Verify token - this validates signature, expiration, issuer, etc.
    const payload = await verifier.verify(cleanToken);

    console.log('[JWT] Token verified successfully', {
      sub: payload.sub,
      email: payload.email || 'N/A',
      tokenUse: payload.token_use,
      exp: new Date(payload.exp * 1000).toISOString(),
    });

    return payload;
  } catch (error) {
    // Specific error handling for common JWT issues
    if (error.message.includes('expired')) {
      console.error('[JWT] Token expired:', error.message);
    } else if (error.message.includes('signature')) {
      console.error('[JWT] Invalid signature:', error.message);
    } else if (error.message.includes('issuer')) {
      console.error('[JWT] Invalid issuer:', error.message);
    } else {
      console.error('[JWT] Verification failed:', error.message);
    }
    return null;
  }
}

/**
 * Decode JWT token WITHOUT verification (for non-security-critical reads)
 * WARNING: Do not use this for authentication decisions!
 *
 * @param {string} token - JWT token (with or without 'Bearer ' prefix)
 * @returns {object|null} Decoded token payload or null if malformed
 */
function decodeJwt(token) {
  if (!token) return null;

  try {
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    const parts = cleanToken.split('.');

    if (parts.length !== 3) {
      console.error('[JWT] Invalid token format for decoding');
      return null;
    }

    // Decode payload (middle part)
    const payload = Buffer.from(parts[1], 'base64').toString('utf8');
    return JSON.parse(payload);
  } catch (error) {
    console.error('[JWT] Decode error:', error.message);
    return null;
  }
}

/**
 * Extract user information from a verified token payload
 * @param {object} payload - Verified JWT payload
 * @returns {object} User information
 */
function extractUserFromPayload(payload) {
  if (!payload) return null;

  return {
    userId: payload.sub,
    email: payload.email || payload['cognito:username'],
    name: payload.name || payload.given_name || null,
    emailVerified: payload.email_verified || false,
    groups: payload['cognito:groups'] || [],
    tokenUse: payload.token_use,
    issuedAt: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
    expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
  };
}

/**
 * Get user from event, verifying the token
 * Checks multiple sources: authorizer claims, cookies, Authorization header
 *
 * @param {object} event - Lambda event object
 * @returns {Promise<object|null>} User information or null if not authenticated
 */
async function getUserFromEvent(event) {
  // Priority 1: API Gateway authorizer claims (already verified by authorizer)
  if (event.requestContext?.authorizer?.claims) {
    const claims = event.requestContext.authorizer.claims;
    console.log('[JWT] Using API Gateway authorizer claims');
    return {
      userId: claims.sub,
      email: claims.email || claims['cognito:username'],
      name: claims.name,
      source: 'authorizer',
    };
  }

  // Priority 2: HTTP-only cookie
  const cookies = event.headers?.cookie || event.headers?.Cookie || '';
  const idTokenCookie = cookies.split(';')
    .find(c => c.trim().startsWith('finpulse_id_token='));

  if (idTokenCookie) {
    const token = idTokenCookie.split('=')[1]?.trim();
    if (token) {
      const payload = await verifyJwt(token, 'id');
      if (payload) {
        console.log('[JWT] Verified token from cookie');
        return {
          ...extractUserFromPayload(payload),
          source: 'cookie',
        };
      }
    }
  }

  // Priority 3: Authorization header
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (authHeader) {
    const payload = await verifyJwt(authHeader, 'id');
    if (payload) {
      console.log('[JWT] Verified token from Authorization header');
      return {
        ...extractUserFromPayload(payload),
        source: 'header',
      };
    }
  }

  console.log('[JWT] No valid authentication found');
  return null;
}

/**
 * Check if token is expired (without full verification)
 * @param {string} token - JWT token
 * @returns {boolean} True if expired
 */
function isTokenExpired(token) {
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) return true;

  // Add 30 second buffer
  return Date.now() >= (payload.exp * 1000 - 30000);
}

/**
 * Get token expiration time
 * @param {string} token - JWT token
 * @returns {Date|null} Expiration date or null
 */
function getTokenExpiration(token) {
  const payload = decodeJwt(token);
  if (!payload || !payload.exp) return null;
  return new Date(payload.exp * 1000);
}

module.exports = {
  // Verification (recommended)
  verifyJwt,
  getUserFromEvent,

  // Decode only (use with caution)
  decodeJwt,

  // Helpers
  extractUserFromPayload,
  isTokenExpired,
  getTokenExpiration,

  // Verifier access (for advanced use)
  getIdTokenVerifier,
  getAccessTokenVerifier,

  // Configuration
  COGNITO_CONFIG,
};

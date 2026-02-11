/**
 * FinPulse Shared Utils Lambda Layer
 *
 * This layer provides common utilities for all Lambda functions:
 * - validation: Input validation with Zod schemas
 * - redis-cache: Redis caching operations
 * - cache-manager: Multi-tier caching (Redis + DynamoDB)
 * - jwt-verifier: JWT verification with Cognito
 * - rate-limiter: Distributed rate limiting via Redis
 * - request-context: Request ID correlation and structured logging
 * - env-validator: Environment variable validation
 *
 * Usage in Lambda:
 *   const { validation, jwtVerifier, rateLimiter } = require('/opt/nodejs');
 */

module.exports = {
  validation: require('./validation'),
  redisCache: require('./redis-cache'),
  cacheManager: require('./cache-manager'),
  jwtVerifier: require('./jwt-verifier'),
  rateLimiter: require('./rate-limiter'),
  requestContext: require('./request-context'),
  envValidator: require('./env-validator'),
};

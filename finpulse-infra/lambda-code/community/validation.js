/**
 * FinPulse Input Validation Utility
 * Enhanced with Zod for runtime type validation
 * Provides sanitization and validation for Lambda inputs
 */

const { z } = require('zod');

// =============================================================================
// Zod Schemas for Strong Type Validation
// =============================================================================

const UserIdSchema = z.string().uuid('Invalid user ID format').or(
  z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/, 'Invalid user ID format')
);

const AssetTypeSchema = z.enum(['CRYPTO', 'STOCK', 'COMMODITY', 'crypto', 'stock', 'etf', 'forex', 'commodity']);

const HoldingSchema = z.object({
  symbol: z.string().min(1).max(20).regex(/^[A-Z0-9-]+$/i, 'Symbol must contain only letters, numbers, and hyphens'),
  type: AssetTypeSchema.optional().default('crypto'),
  quantity: z.number().positive('Quantity must be positive').max(1e15, 'Quantity exceeds maximum'),
  avgBuyPrice: z.number().nonnegative('Price cannot be negative').max(1e12, 'Price exceeds maximum'),
  currentPrice: z.number().optional().default(0),
  notes: z.string().max(500).optional().default('')
});

const PostSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty').max(5000, 'Content exceeds maximum length'),
  type: z.enum(['discussion', 'analysis', 'trade_idea', 'question']).optional().default('discussion')
});

const CommentSchema = z.object({
  content: z.string().min(1, 'Content cannot be empty').max(2000, 'Comment exceeds maximum length')
});

const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(20),
  offset: z.number().int().min(0).optional().default(0)
});

/**
 * Sanitize string input - prevent XSS and injection
 */
function sanitizeString(input, maxLength = 1000) {
  if (typeof input !== 'string') return '';

  return input
    .slice(0, maxLength)
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/\0/g, '') // Remove null bytes
    .trim();
}

/**
 * Validate and sanitize holding input using Zod
 */
function validateHolding(input) {
  try {
    const validatedData = HoldingSchema.parse(input);
    return {
      valid: true,
      data: {
        symbol: validatedData.symbol.toUpperCase().trim(),
        type: validatedData.type,
        quantity: validatedData.quantity,
        avgBuyPrice: validatedData.avgBuyPrice,
        currentPrice: validatedData.currentPrice,
        notes: sanitizeString(validatedData.notes, 500)
      }
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      };
    }
    return { valid: false, errors: ['Validation error occurred'] };
  }
}

/**
 * Validate and sanitize post input using Zod
 */
function validatePost(input) {
  try {
    const validatedData = PostSchema.parse(input);
    return {
      valid: true,
      data: {
        content: sanitizeString(validatedData.content, 5000),
        type: validatedData.type
      }
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      };
    }
    return { valid: false, errors: ['Validation error occurred'] };
  }
}

/**
 * Validate and sanitize comment input using Zod
 */
function validateComment(input) {
  try {
    const validatedData = CommentSchema.parse(input);
    return {
      valid: true,
      data: {
        content: sanitizeString(validatedData.content, 2000)
      }
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`)
      };
    }
    return { valid: false, errors: ['Validation error occurred'] };
  }
}

/**
 * Validate user ID format (Cognito sub) using Zod
 */
function validateUserId(userId) {
  try {
    UserIdSchema.parse(userId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate pagination parameters using Zod
 */
function validatePagination(limit, offset) {
  try {
    const validated = PaginationSchema.parse({
      limit: parseInt(limit) || undefined,
      offset: parseInt(offset) || undefined
    });
    return { valid: true, limit: validated.limit, offset: validated.offset };
  } catch (error) {
    // Return defaults on error
    return { valid: true, limit: 20, offset: 0 };
  }
}

/**
 * Rate limit check (in-memory for single Lambda instance)
 */
const rateLimitMap = new Map();

function checkRateLimit(userId, action, maxRequests = 60, windowMs = 60000) {
  const key = `${userId}:${action}`;
  const now = Date.now();
  
  let record = rateLimitMap.get(key);
  
  if (!record || now - record.windowStart > windowMs) {
    record = { windowStart: now, count: 1 };
    rateLimitMap.set(key, record);
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  if (record.count >= maxRequests) {
    return { 
      allowed: false, 
      remaining: 0, 
      retryAfter: Math.ceil((record.windowStart + windowMs - now) / 1000)
    };
  }
  
  record.count++;
  return { allowed: true, remaining: maxRequests - record.count };
}

/**
 * Clean old rate limit entries (call periodically)
 */
function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now - record.windowStart > 120000) { // 2 minutes old
      rateLimitMap.delete(key);
    }
  }
}

// Cleanup every 5 minutes
setInterval(cleanupRateLimits, 300000);

module.exports = {
  // Validation functions (enhanced with Zod)
  sanitizeString,
  validateHolding,
  validatePost,
  validateComment,
  validateUserId,
  validatePagination,
  checkRateLimit,

  // Zod schemas for custom validation
  schemas: {
    UserIdSchema,
    AssetTypeSchema,
    HoldingSchema,
    PostSchema,
    CommentSchema,
    PaginationSchema
  }
};

/**
 * FinPulse Input Validation Utility
 * Provides sanitization and validation for Lambda inputs
 */

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
    .trim();
}

/**
 * Validate and sanitize holding input
 */
function validateHolding(input) {
  const errors = [];
  
  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Invalid input object'] };
  }

  // Symbol validation
  if (!input.symbol || typeof input.symbol !== 'string') {
    errors.push('symbol is required and must be a string');
  } else if (!/^[A-Za-z0-9-]{1,10}$/.test(input.symbol)) {
    errors.push('symbol must be 1-10 alphanumeric characters');
  }

  // Quantity validation
  const quantity = parseFloat(input.quantity);
  if (isNaN(quantity) || quantity <= 0) {
    errors.push('quantity must be a positive number');
  } else if (quantity > 1e15) {
    errors.push('quantity exceeds maximum allowed value');
  }

  // Price validation
  const avgBuyPrice = parseFloat(input.avgBuyPrice);
  if (isNaN(avgBuyPrice) || avgBuyPrice < 0) {
    errors.push('avgBuyPrice must be a non-negative number');
  } else if (avgBuyPrice > 1e12) {
    errors.push('avgBuyPrice exceeds maximum allowed value');
  }

  // Type validation
  const validTypes = ['crypto', 'stock', 'etf', 'forex', 'commodity'];
  if (input.type && !validTypes.includes(input.type)) {
    errors.push(`type must be one of: ${validTypes.join(', ')}`);
  }

  // Notes sanitization
  const notes = input.notes ? sanitizeString(input.notes, 500) : '';

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      symbol: input.symbol.toUpperCase().trim(),
      type: input.type || 'crypto',
      quantity,
      avgBuyPrice,
      currentPrice: parseFloat(input.currentPrice) || 0,
      notes
    }
  };
}

/**
 * Validate and sanitize post input
 */
function validatePost(input) {
  const errors = [];

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Invalid input object'] };
  }

  // Content validation
  if (!input.content || typeof input.content !== 'string') {
    errors.push('content is required and must be a string');
  } else if (input.content.trim().length < 1) {
    errors.push('content cannot be empty');
  } else if (input.content.length > 5000) {
    errors.push('content exceeds maximum length of 5000 characters');
  }

  // Type validation
  const validTypes = ['discussion', 'analysis', 'trade_idea', 'question'];
  if (input.type && !validTypes.includes(input.type)) {
    errors.push(`type must be one of: ${validTypes.join(', ')}`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      content: sanitizeString(input.content, 5000),
      type: input.type || 'discussion'
    }
  };
}

/**
 * Validate and sanitize comment input
 */
function validateComment(input) {
  const errors = [];

  if (!input || typeof input !== 'object') {
    return { valid: false, errors: ['Invalid input object'] };
  }

  // Content validation
  if (!input.content || typeof input.content !== 'string') {
    errors.push('content is required and must be a string');
  } else if (input.content.trim().length < 1) {
    errors.push('content cannot be empty');
  } else if (input.content.length > 2000) {
    errors.push('content exceeds maximum length of 2000 characters');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      content: sanitizeString(input.content, 2000)
    }
  };
}

/**
 * Validate user ID format (Cognito sub)
 */
function validateUserId(userId) {
  if (!userId || typeof userId !== 'string') {
    return false;
  }
  // Cognito sub format: UUID v4
  return /^[a-f0-9-]{36}$/.test(userId) || /^[a-zA-Z0-9_-]{1,128}$/.test(userId);
}

/**
 * Validate pagination parameters
 */
function validatePagination(limit, offset) {
  const validLimit = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const validOffset = Math.max(parseInt(offset) || 0, 0);
  return { limit: validLimit, offset: validOffset };
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
  sanitizeString,
  validateHolding,
  validatePost,
  validateComment,
  validateUserId,
  validatePagination,
  checkRateLimit
};

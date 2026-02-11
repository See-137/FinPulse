/**
 * FinPulse Request Context and Structured Logging
 * Provides request ID correlation and structured JSON logging for observability
 *
 * Features:
 * - Request ID extraction/generation for distributed tracing
 * - Structured JSON logging with consistent format
 * - Request context propagation across service calls
 * - Performance timing utilities
 *
 * Usage:
 *   const { getRequestId, createLogger } = require('./request-context');
 *
 *   exports.handler = async (event) => {
 *     const requestId = getRequestId(event);
 *     const logger = createLogger(requestId, 'auth-service');
 *
 *     logger.info('Processing request', { action: 'login' });
 *   };
 */

const { v4: uuidv4 } = require('uuid');

/**
 * Extract or generate request ID from Lambda event
 *
 * Checks multiple sources in priority order:
 * 1. X-Request-ID header (propagated from upstream)
 * 2. X-Amzn-Trace-Id header (AWS X-Ray)
 * 3. API Gateway request ID
 * 4. Lambda context AWS request ID
 * 5. Generate new UUID
 *
 * @param {object} event - Lambda event
 * @param {object} context - Lambda context (optional)
 * @returns {string} Request ID
 */
function getRequestId(event, context = null) {
  // Check for propagated request ID
  const headers = event.headers || {};
  const requestId =
    headers['x-request-id'] ||
    headers['X-Request-ID'] ||
    headers['X-Request-Id'];

  if (requestId) return requestId;

  // Check for AWS X-Ray trace ID
  const traceId = headers['x-amzn-trace-id'] || headers['X-Amzn-Trace-Id'];
  if (traceId) {
    // Extract Root ID from trace header: Root=1-xxx;Parent=xxx;Sampled=1
    const match = traceId.match(/Root=([^;]+)/);
    if (match) return match[1];
  }

  // Check API Gateway request ID
  if (event.requestContext?.requestId) {
    return event.requestContext.requestId;
  }

  // Check Lambda context
  if (context?.awsRequestId) {
    return context.awsRequestId;
  }

  // Generate new UUID
  return uuidv4();
}

/**
 * Add request ID to response headers for tracing
 *
 * @param {object} headers - Existing headers object
 * @param {string} requestId - Request ID to add
 * @returns {object} Headers with request ID
 */
function addRequestIdHeaders(headers, requestId) {
  return {
    ...headers,
    'X-Request-ID': requestId,
  };
}

/**
 * Create structured logger with request context
 *
 * @param {string} requestId - Request ID for correlation
 * @param {string} service - Service name (e.g., 'auth', 'portfolio')
 * @param {object} baseContext - Additional context to include in all logs
 * @returns {object} Logger with info, warn, error, debug methods
 */
function createLogger(requestId, service, baseContext = {}) {
  const logBase = {
    service,
    requestId,
    environment: process.env.ENVIRONMENT || 'prod',
    region: process.env.AWS_REGION || 'us-east-1',
    ...baseContext,
  };

  const formatLog = (level, message, data = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...logBase,
      ...data,
    };

    // Remove undefined values
    Object.keys(logEntry).forEach(key => {
      if (logEntry[key] === undefined) delete logEntry[key];
    });

    return JSON.stringify(logEntry);
  };

  return {
    /**
     * Log info message
     * @param {string} message - Log message
     * @param {object} data - Additional data
     */
    info: (message, data = {}) => {
      console.log(formatLog('INFO', message, data));
    },

    /**
     * Log warning message
     * @param {string} message - Log message
     * @param {object} data - Additional data
     */
    warn: (message, data = {}) => {
      console.warn(formatLog('WARN', message, data));
    },

    /**
     * Log error message
     * @param {string} message - Log message
     * @param {Error|object} error - Error object or data
     * @param {object} data - Additional data
     */
    error: (message, error = null, data = {}) => {
      const errorData = error instanceof Error
        ? {
            errorMessage: error.message,
            errorName: error.name,
            errorStack: error.stack,
          }
        : { errorDetails: error };

      console.error(formatLog('ERROR', message, { ...errorData, ...data }));
    },

    /**
     * Log debug message (only in non-production)
     * @param {string} message - Log message
     * @param {object} data - Additional data
     */
    debug: (message, data = {}) => {
      if (process.env.ENVIRONMENT !== 'prod' || process.env.DEBUG === 'true') {
        console.log(formatLog('DEBUG', message, data));
      }
    },

    /**
     * Start a timer for performance measurement
     * @param {string} operation - Operation name
     * @returns {function} End function that logs duration
     */
    startTimer: (operation) => {
      const start = Date.now();
      return (extraData = {}) => {
        const duration = Date.now() - start;
        console.log(formatLog('INFO', `${operation} completed`, {
          operation,
          durationMs: duration,
          ...extraData,
        }));
        return duration;
      };
    },

    /**
     * Log API call with timing
     * @param {string} apiName - API name
     * @param {function} apiCall - Async function to time
     * @returns {Promise<any>} API result
     */
    async timeApi(apiName, apiCall) {
      const start = Date.now();
      try {
        const result = await apiCall();
        const duration = Date.now() - start;
        console.log(formatLog('INFO', `API call completed`, {
          api: apiName,
          durationMs: duration,
          success: true,
        }));
        return result;
      } catch (error) {
        const duration = Date.now() - start;
        console.error(formatLog('ERROR', `API call failed`, {
          api: apiName,
          durationMs: duration,
          success: false,
          errorMessage: error.message,
        }));
        throw error;
      }
    },

    /**
     * Create child logger with additional context
     * @param {object} childContext - Additional context
     * @returns {object} Child logger
     */
    child: (childContext) => {
      return createLogger(requestId, service, { ...baseContext, ...childContext });
    },
  };
}

/**
 * Create request context object from Lambda event
 *
 * @param {object} event - Lambda event
 * @param {object} context - Lambda context
 * @returns {object} Request context
 */
function createRequestContext(event, context = null) {
  const requestId = getRequestId(event, context);

  return {
    requestId,
    method: event.httpMethod || event.requestContext?.http?.method,
    path: event.path || event.rawPath,
    sourceIp: event.requestContext?.identity?.sourceIp ||
              event.headers?.['x-forwarded-for']?.split(',')[0]?.trim(),
    userAgent: event.headers?.['user-agent'] || event.headers?.['User-Agent'],
    userId: event.requestContext?.authorizer?.claims?.sub,
    startTime: Date.now(),
  };
}

/**
 * Middleware-style handler wrapper with automatic logging
 *
 * @param {string} serviceName - Service name
 * @param {function} handler - Lambda handler function
 * @returns {function} Wrapped handler
 */
function withRequestContext(serviceName, handler) {
  return async (event, context) => {
    const requestContext = createRequestContext(event, context);
    const logger = createLogger(requestContext.requestId, serviceName, {
      method: requestContext.method,
      path: requestContext.path,
    });

    logger.info('Request started', {
      sourceIp: requestContext.sourceIp,
      userAgent: requestContext.userAgent,
    });

    try {
      const result = await handler(event, context, { requestContext, logger });

      const duration = Date.now() - requestContext.startTime;
      logger.info('Request completed', {
        statusCode: result?.statusCode,
        durationMs: duration,
      });

      // Add request ID to response headers
      if (result && typeof result === 'object') {
        result.headers = addRequestIdHeaders(result.headers || {}, requestContext.requestId);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - requestContext.startTime;
      logger.error('Request failed', error, {
        durationMs: duration,
      });

      return {
        statusCode: 500,
        headers: addRequestIdHeaders({
          'Content-Type': 'application/json',
        }, requestContext.requestId),
        body: JSON.stringify({
          success: false,
          error: 'Internal server error',
          requestId: requestContext.requestId,
        }),
      };
    }
  };
}

module.exports = {
  // Request ID utilities
  getRequestId,
  addRequestIdHeaders,

  // Logging
  createLogger,

  // Context management
  createRequestContext,
  withRequestContext,
};

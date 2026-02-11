/**
 * FinPulse Environment Variable Validator
 * Validates required environment variables at Lambda cold start
 *
 * Fail-fast approach: If required environment variables are missing,
 * the Lambda will fail immediately with a clear error message rather
 * than failing later with cryptic errors.
 *
 * Usage:
 *   const { validateEnv, ensureEnvValidated } = require('./env-validator');
 *
 *   // At handler start
 *   ensureEnvValidated('auth');
 */

// Required environment variables per service
const SERVICE_ENV_REQUIREMENTS = {
  auth: {
    required: [
      'COGNITO_POOL_ID',
      'COGNITO_CLIENT_ID',
      'ALLOWED_ORIGIN',
    ],
    optional: [
      'COOKIE_DOMAIN',
      'ENVIRONMENT',
      'REDIS_ENDPOINT',
    ],
  },

  'market-data': {
    required: [
      'ALPACA_SECRET_ARN',
    ],
    optional: [
      'REDIS_ENDPOINT',
      'ENVIRONMENT',
      'COINGECKO_API_KEY',
    ],
  },

  portfolio: {
    required: [
      'COGNITO_POOL_ID',
    ],
    optional: [
      'REDIS_ENDPOINT',
      'ENVIRONMENT',
      'USERS_TABLE',
    ],
  },

  ai: {
    required: [
      'OPENAI_SECRET_ARN',
    ],
    optional: [
      'REDIS_ENDPOINT',
      'ENVIRONMENT',
    ],
  },

  community: {
    required: [
      'COGNITO_POOL_ID',
    ],
    optional: [
      'REDIS_ENDPOINT',
      'ENVIRONMENT',
      'POSTS_TABLE',
    ],
  },

  news: {
    required: [],
    optional: [
      'GNEWS_API_KEY',
      'REDIS_ENDPOINT',
      'ENVIRONMENT',
    ],
  },

  payments: {
    required: [
      'LEMONSQUEEZY_SECRET_ARN',
      'LEMONSQUEEZY_WEBHOOK_SECRET_ARN',
    ],
    optional: [
      'ENVIRONMENT',
      'USERS_TABLE',
    ],
  },

  admin: {
    required: [
      'COGNITO_POOL_ID',
    ],
    optional: [
      'ENVIRONMENT',
      'ADMIN_EMAIL',
    ],
  },

  fx: {
    required: [],
    optional: [
      'REDIS_ENDPOINT',
      'ENVIRONMENT',
    ],
  },

  // Common requirements for all services
  common: {
    required: [],
    optional: [
      'AWS_REGION',
      'ENVIRONMENT',
      'LOG_LEVEL',
    ],
  },
};

// Validation state tracking
const validatedServices = new Set();
let validationErrors = [];

/**
 * Validate environment variables for a specific service
 *
 * @param {string} service - Service name (auth, portfolio, etc.)
 * @throws {Error} If required environment variables are missing
 * @returns {object} Validation result
 */
function validateEnv(service) {
  const requirements = SERVICE_ENV_REQUIREMENTS[service];

  if (!requirements) {
    console.warn(`[EnvValidator] No requirements defined for service: ${service}`);
    return { valid: true, service, missing: [], warnings: [] };
  }

  const missing = [];
  const warnings = [];
  const present = [];

  // Check required variables
  for (const varName of requirements.required) {
    if (!process.env[varName]) {
      missing.push(varName);
    } else {
      present.push(varName);
    }
  }

  // Check optional variables (warn if missing)
  for (const varName of requirements.optional) {
    if (!process.env[varName]) {
      warnings.push(varName);
    } else {
      present.push(varName);
    }
  }

  // Check common requirements
  const common = SERVICE_ENV_REQUIREMENTS.common;
  for (const varName of common.required) {
    if (!process.env[varName] && !missing.includes(varName)) {
      missing.push(varName);
    }
  }

  const result = {
    valid: missing.length === 0,
    service,
    missing,
    warnings,
    present,
  };

  if (!result.valid) {
    const errorMsg = `[EnvValidator] Missing required environment variables for ${service}: ${missing.join(', ')}`;
    console.error(errorMsg);
    validationErrors.push(errorMsg);
    throw new Error(errorMsg);
  }

  if (warnings.length > 0) {
    console.warn(`[EnvValidator] Optional variables not set for ${service}: ${warnings.join(', ')}`);
  }

  console.log(`[EnvValidator] Environment validation passed for ${service}`, {
    required: requirements.required.length,
    optional: requirements.optional.length,
    present: present.length,
  });

  return result;
}

/**
 * Ensure environment is validated (only validates once per cold start)
 *
 * @param {string} service - Service name
 * @returns {boolean} True if valid
 */
function ensureEnvValidated(service) {
  if (validatedServices.has(service)) {
    return true;
  }

  const result = validateEnv(service);
  if (result.valid) {
    validatedServices.add(service);
  }

  return result.valid;
}

/**
 * Get a required environment variable (throws if missing)
 *
 * @param {string} varName - Variable name
 * @param {string} description - Variable description for error message
 * @returns {string} Variable value
 */
function getRequiredEnv(varName, description = null) {
  const value = process.env[varName];

  if (!value) {
    const desc = description ? ` (${description})` : '';
    throw new Error(`Required environment variable ${varName}${desc} is not set`);
  }

  return value;
}

/**
 * Get an optional environment variable with default
 *
 * @param {string} varName - Variable name
 * @param {string} defaultValue - Default value if not set
 * @returns {string} Variable value or default
 */
function getOptionalEnv(varName, defaultValue = '') {
  return process.env[varName] || defaultValue;
}

/**
 * Get environment variable as boolean
 *
 * @param {string} varName - Variable name
 * @param {boolean} defaultValue - Default value if not set
 * @returns {boolean} Boolean value
 */
function getBoolEnv(varName, defaultValue = false) {
  const value = process.env[varName];

  if (!value) return defaultValue;

  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Get environment variable as number
 *
 * @param {string} varName - Variable name
 * @param {number} defaultValue - Default value if not set or invalid
 * @returns {number} Numeric value
 */
function getNumericEnv(varName, defaultValue = 0) {
  const value = process.env[varName];

  if (!value) return defaultValue;

  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Check if running in production environment
 *
 * @returns {boolean} True if production
 */
function isProduction() {
  const env = process.env.ENVIRONMENT || process.env.NODE_ENV || '';
  return env.toLowerCase() === 'prod' || env.toLowerCase() === 'production';
}

/**
 * Check if running in development environment
 *
 * @returns {boolean} True if development
 */
function isDevelopment() {
  const env = process.env.ENVIRONMENT || process.env.NODE_ENV || '';
  return env.toLowerCase() === 'dev' || env.toLowerCase() === 'development';
}

/**
 * Get current environment name
 *
 * @returns {string} Environment name
 */
function getEnvironment() {
  return process.env.ENVIRONMENT || process.env.NODE_ENV || 'prod';
}

/**
 * Get all validation errors (for debugging)
 *
 * @returns {string[]} Array of error messages
 */
function getValidationErrors() {
  return [...validationErrors];
}

/**
 * Clear validation state (for testing)
 */
function clearValidationState() {
  validatedServices.clear();
  validationErrors = [];
}

module.exports = {
  // Validation
  validateEnv,
  ensureEnvValidated,

  // Getters
  getRequiredEnv,
  getOptionalEnv,
  getBoolEnv,
  getNumericEnv,

  // Environment checks
  isProduction,
  isDevelopment,
  getEnvironment,

  // Debug
  getValidationErrors,
  clearValidationState,

  // Configuration
  SERVICE_ENV_REQUIREMENTS,
};

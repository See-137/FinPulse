/**
 * Circuit Breaker Service
 *
 * Implements the circuit breaker pattern to prevent cascading failures
 * when external APIs are unavailable. Protects against:
 * - Repeated calls to failing services
 * - Resource exhaustion from timeout-heavy requests
 * - Cascading failures across dependent services
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Service is failing, requests immediately return fallback
 * - HALF_OPEN: Testing if service has recovered
 */

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitConfig {
  failureThreshold: number;  // Number of failures before opening circuit
  recoveryTimeout: number;   // Time in ms before trying half-open
  successThreshold: number;  // Successes needed in half-open to close
}

interface CircuitStatus {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailure: number;
  lastStateChange: number;
}

const DEFAULT_CONFIG: CircuitConfig = {
  failureThreshold: 5,      // Open after 5 consecutive failures
  recoveryTimeout: 60000,   // Try again after 1 minute
  successThreshold: 2,      // Need 2 successes to close circuit
};

// Per-service circuit states
const circuits = new Map<string, CircuitStatus>();
const configs = new Map<string, CircuitConfig>();

/**
 * Get or initialize circuit for a service
 */
function getCircuit(service: string): CircuitStatus {
  if (!circuits.has(service)) {
    circuits.set(service, {
      state: 'closed',
      failures: 0,
      successes: 0,
      lastFailure: 0,
      lastStateChange: Date.now(),
    });
  }
  return circuits.get(service)!;
}

/**
 * Get config for a service (with defaults)
 */
function getConfig(service: string): CircuitConfig {
  return configs.get(service) || DEFAULT_CONFIG;
}

/**
 * Configure circuit breaker for a specific service
 */
export function configureCircuit(service: string, config: Partial<CircuitConfig>): void {
  configs.set(service, { ...DEFAULT_CONFIG, ...config });
}

/**
 * Check if request should be allowed through
 */
function shouldAllowRequest(service: string): boolean {
  const circuit = getCircuit(service);
  const config = getConfig(service);

  switch (circuit.state) {
    case 'closed':
      return true;

    case 'open':
      // Check if recovery timeout has passed
      if (Date.now() - circuit.lastFailure >= config.recoveryTimeout) {
        // Transition to half-open
        circuit.state = 'half-open';
        circuit.successes = 0;
        circuit.lastStateChange = Date.now();
        console.log(`[CircuitBreaker] ${service}: OPEN -> HALF-OPEN`);
        return true;
      }
      return false;

    case 'half-open':
      // Allow limited requests to test recovery
      return true;

    default:
      return true;
  }
}

/**
 * Record a successful request
 */
function recordSuccess(service: string): void {
  const circuit = getCircuit(service);
  const config = getConfig(service);

  circuit.failures = 0; // Reset failure count

  if (circuit.state === 'half-open') {
    circuit.successes++;
    if (circuit.successes >= config.successThreshold) {
      circuit.state = 'closed';
      circuit.lastStateChange = Date.now();
      console.log(`[CircuitBreaker] ${service}: HALF-OPEN -> CLOSED (recovered)`);
    }
  }
}

/**
 * Record a failed request
 */
function recordFailure(service: string): void {
  const circuit = getCircuit(service);
  const config = getConfig(service);

  circuit.failures++;
  circuit.lastFailure = Date.now();

  if (circuit.state === 'half-open') {
    // Immediate transition back to open
    circuit.state = 'open';
    circuit.lastStateChange = Date.now();
    console.log(`[CircuitBreaker] ${service}: HALF-OPEN -> OPEN (failed recovery test)`);
  } else if (circuit.state === 'closed' && circuit.failures >= config.failureThreshold) {
    circuit.state = 'open';
    circuit.lastStateChange = Date.now();
    console.error(`[CircuitBreaker] ${service}: CLOSED -> OPEN (${circuit.failures} failures)`);
  }
}

/**
 * Execute function with circuit breaker protection
 *
 * @param service - Service identifier (e.g., 'binance', 'whaleAlert')
 * @param fn - Async function to execute
 * @param fallback - Value to return when circuit is open
 * @returns Result of fn() or fallback value
 */
export async function withCircuitBreaker<T>(
  service: string,
  fn: () => Promise<T>,
  fallback: T
): Promise<T> {
  // Check if request is allowed
  if (!shouldAllowRequest(service)) {
    const circuit = getCircuit(service);
    const config = getConfig(service);
    const timeUntilRetry = Math.max(0, config.recoveryTimeout - (Date.now() - circuit.lastFailure));
    console.warn(`[CircuitBreaker] ${service}: Circuit OPEN - returning fallback. Retry in ${Math.round(timeUntilRetry / 1000)}s`);
    return fallback;
  }

  try {
    const result = await fn();
    recordSuccess(service);
    return result;
  } catch (error) {
    recordFailure(service);
    console.warn(`[CircuitBreaker] ${service}: Request failed - ${error instanceof Error ? error.message : 'Unknown error'}`);
    return fallback;
  }
}

/**
 * Get current status of all circuits
 */
export function getCircuitStatus(): Record<string, CircuitStatus & { config: CircuitConfig }> {
  const status: Record<string, CircuitStatus & { config: CircuitConfig }> = {};

  for (const [service, circuit] of circuits.entries()) {
    status[service] = {
      ...circuit,
      config: getConfig(service),
    };
  }

  return status;
}

/**
 * Get status of a specific circuit
 */
export function getServiceCircuitStatus(service: string): CircuitStatus & { config: CircuitConfig } | null {
  if (!circuits.has(service)) {
    return null;
  }

  return {
    ...getCircuit(service),
    config: getConfig(service),
  };
}

/**
 * Reset circuit for a service (for testing or manual recovery)
 */
export function resetCircuit(service: string): void {
  const circuit = getCircuit(service);
  circuit.state = 'closed';
  circuit.failures = 0;
  circuit.successes = 0;
  circuit.lastStateChange = Date.now();
  console.log(`[CircuitBreaker] ${service}: Circuit manually reset to CLOSED`);
}

/**
 * Reset all circuits
 */
export function resetAllCircuits(): void {
  for (const service of circuits.keys()) {
    resetCircuit(service);
  }
}

// Pre-configure circuits for known services
configureCircuit('binance', {
  failureThreshold: 5,
  recoveryTimeout: 60000,   // 1 minute
  successThreshold: 2,
});

configureCircuit('whaleAlert', {
  failureThreshold: 3,      // More sensitive (rate limits)
  recoveryTimeout: 120000,  // 2 minutes
  successThreshold: 2,
});

configureCircuit('twitter', {
  failureThreshold: 3,
  recoveryTimeout: 120000,  // 2 minutes
  successThreshold: 2,
});

configureCircuit('coingecko', {
  failureThreshold: 5,
  recoveryTimeout: 60000,
  successThreshold: 2,
});

configureCircuit('openai', {
  failureThreshold: 3,
  recoveryTimeout: 180000,  // 3 minutes (expensive service)
  successThreshold: 2,
});

export default {
  withCircuitBreaker,
  configureCircuit,
  getCircuitStatus,
  getServiceCircuitStatus,
  resetCircuit,
  resetAllCircuits,
};

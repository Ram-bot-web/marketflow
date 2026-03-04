/**
 * Retry mechanism utilities
 * Provides exponential backoff and retry logic
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: ['network-error', 'timeout', 'unavailable'],
};

/**
 * Check if error is retryable
 */
function isRetryableError(error: any, retryableErrors: string[]): boolean {
  if (!error) return false;
  
  const errorCode = error.code || error.message || '';
  const errorString = String(errorCode).toLowerCase();
  
  return retryableErrors.some(retryable => 
    errorString.includes(retryable.toLowerCase())
  );
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number {
  const delay = initialDelay * Math.pow(multiplier, attempt - 1);
  return Math.min(delay, maxDelay);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: any;
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry if it's the last attempt
      if (attempt === opts.maxAttempts) {
        throw error;
      }
      
      // Don't retry if error is not retryable
      if (!isRetryableError(error, opts.retryableErrors)) {
        throw error;
      }
      
      // Calculate delay and wait
      const delay = calculateDelay(
        attempt,
        opts.initialDelay,
        opts.maxDelay,
        opts.backoffMultiplier
      );
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}

/**
 * Retry with custom condition
 */
export async function retryWithCondition<T>(
  fn: () => Promise<T>,
  shouldRetry: (error: any, attempt: number) => boolean,
  options: Omit<RetryOptions, 'retryableErrors'> = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: any;
  
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      if (attempt === opts.maxAttempts || !shouldRetry(error, attempt)) {
        throw error;
      }
      
      const delay = calculateDelay(
        attempt,
        opts.initialDelay,
        opts.maxDelay,
        opts.backoffMultiplier
      );
      
      await sleep(delay);
    }
  }
  
  throw lastError;
}




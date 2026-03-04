/**
 * Rate limiting utilities
 * Prevents abuse by limiting request frequency
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store (for client-side rate limiting)
// In production, use a proper backend rate limiter
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configurations
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  // Authentication attempts
  LOGIN: { maxRequests: 5, windowMs: 15 * 60 * 1000 }, // 5 attempts per 15 minutes
  REGISTER: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
  PASSWORD_RESET: { maxRequests: 3, windowMs: 60 * 60 * 1000 }, // 3 attempts per hour
  
  // API calls
  API_GENERAL: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 requests per minute
  API_WRITE: { maxRequests: 20, windowMs: 60 * 1000 }, // 20 writes per minute
  
  // Form submissions
  FORM_SUBMIT: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 submissions per minute
} as const;

/**
 * Check if action is rate limited
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  // Clean up expired entries
  if (entry && entry.resetTime < now) {
    rateLimitStore.delete(key);
  }
  
  const currentEntry = rateLimitStore.get(key);
  
  if (!currentEntry) {
    // First request - create entry
    const resetTime = now + config.windowMs;
    rateLimitStore.set(key, {
      count: 1,
      resetTime,
    });
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime,
    };
  }
  
  // Check if limit exceeded
  if (currentEntry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: currentEntry.resetTime,
    };
  }
  
  // Increment count
  currentEntry.count += 1;
  rateLimitStore.set(key, currentEntry);
  
  return {
    allowed: true,
    remaining: config.maxRequests - currentEntry.count,
    resetTime: currentEntry.resetTime,
  };
}

/**
 * Get rate limit key for user action
 */
export function getRateLimitKey(
  userId: string | null,
  action: string,
  identifier?: string
): string {
  const baseKey = identifier || userId || 'anonymous';
  return `rate_limit:${action}:${baseKey}`;
}

/**
 * Clear rate limit for a key (useful for testing or admin override)
 */
export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Get remaining attempts for a rate limit
 */
export function getRemainingAttempts(
  key: string,
  config: RateLimitConfig
): number {
  const result = checkRateLimit(key, config);
  return result.remaining;
}

/**
 * Format time until rate limit resets
 */
export function formatResetTime(resetTime: number): string {
  const now = Date.now();
  const diff = resetTime - now;
  
  if (diff <= 0) return 'now';
  
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}




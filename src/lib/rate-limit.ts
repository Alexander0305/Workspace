/**
 * Rate Limiting Utility
 * Simple in-memory rate limiter for API endpoints
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 60,
  windowMs: 60000, // 1 minute
}

/**
 * Check if a request should be rate limited
 */
export function checkRateLimit(
  key: string,
  config: Partial<RateLimitConfig> = {}
): { allowed: boolean; remaining: number; resetTime: number } {
  const { maxRequests, windowMs } = { ...DEFAULT_CONFIG, ...config }
  const now = Date.now()
  
  let entry = rateLimitStore.get(key)
  
  // Clean up expired entry
  if (entry && now > entry.resetTime) {
    rateLimitStore.delete(key)
    entry = undefined
  }
  
  if (!entry) {
    // Create new entry
    entry = {
      count: 1,
      resetTime: now + windowMs,
    }
    rateLimitStore.set(key, entry)
    return { allowed: true, remaining: maxRequests - 1, resetTime: entry.resetTime }
  }
  
  // Increment count
  entry.count++
  
  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime }
  }
  
  return { allowed: true, remaining: maxRequests - entry.count, resetTime: entry.resetTime }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(
  key: string,
  config: Partial<RateLimitConfig> = {}
): Record<string, string> {
  const { maxRequests } = { ...DEFAULT_CONFIG, ...config }
  const entry = rateLimitStore.get(key)
  const remaining = entry ? Math.max(0, maxRequests - entry.count) : maxRequests
  const resetTime = entry ? entry.resetTime : Date.now() + (config.windowMs || DEFAULT_CONFIG.windowMs)
  
  return {
    'X-RateLimit-Limit': maxRequests.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
  }
}

/**
 * Clean up expired entries periodically
 */
export function cleanupRateLimits(): void {
  const now = Date.now()
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

// Run cleanup every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimits, 5 * 60 * 1000)
}

// Tier-specific rate limits
export const TIER_RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: { maxRequests: 20, windowMs: 60000 },
  basic: { maxRequests: 60, windowMs: 60000 },
  pro: { maxRequests: 200, windowMs: 60000 },
  enterprise: { maxRequests: 1000, windowMs: 60000 },
  unlimited: { maxRequests: 10000, windowMs: 60000 },
}

/**
 * Check rate limit for a user based on their tier
 */
export function checkUserRateLimit(
  userId: string,
  tier: string,
  endpoint: string
): { allowed: boolean; remaining: number; resetTime: number } {
  const key = `${userId}:${endpoint}`
  const config = TIER_RATE_LIMITS[tier] || TIER_RATE_LIMITS.free
  return checkRateLimit(key, config)
}

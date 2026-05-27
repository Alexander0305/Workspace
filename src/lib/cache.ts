/**
 * Simple in-memory cache for API responses
 * Reduces database queries and external API calls
 */

interface CacheEntry<T> {
  data: T
  expiresAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

/**
 * Get a value from the cache
 */
export function getCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  
  if (!entry) return null
  
  if (Date.now() > entry.expiresAt) {
    cache.delete(key)
    return null
  }
  
  return entry.data
}

/**
 * Set a value in the cache
 */
export function setCache<T>(key: string, data: T, ttlMs: number = 60000): void {
  cache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  })
}

/**
 * Delete a specific key from the cache
 */
export function deleteCache(key: string): boolean {
  return cache.delete(key)
}

/**
 * Delete all keys matching a pattern
 */
export function deleteCachePattern(pattern: string): number {
  let deleted = 0
  const regex = new RegExp(pattern)
  
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key)
      deleted++
    }
  }
  
  return deleted
}

/**
 * Clear the entire cache
 */
export function clearCache(): void {
  cache.clear()
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  }
}

/**
 * Clean up expired entries
 */
export function cleanupCache(): number {
  const now = Date.now()
  let cleaned = 0
  
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key)
      cleaned++
    }
  }
  
  return cleaned
}

// Run cleanup every minute
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupCache, 60000)
}

/**
 * Cache decorator for async functions
 */
export function withCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = 60000
): Promise<T> {
  const cached = getCache<T>(key)
  
  if (cached !== null) {
    return Promise.resolve(cached)
  }
  
  return fn().then((result) => {
    setCache(key, result, ttlMs)
    return result
  })
}

// Common cache TTLs
export const CACHE_TTL = {
  SHORT: 30000,      // 30 seconds
  MEDIUM: 300000,    // 5 minutes
  LONG: 900000,      // 15 minutes
  HOUR: 3600000,     // 1 hour
  DAY: 86400000,     // 24 hours
} as const

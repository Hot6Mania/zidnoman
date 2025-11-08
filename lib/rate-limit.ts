import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL || '')

export interface RateLimitConfig {
  maxRequests: number  // Maximum number of requests
  windowMs: number     // Time window in milliseconds
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number  // Timestamp when the limit resets
}

/**
 * Sliding window rate limiter using Redis sorted sets
 * @param key - Unique identifier for this rate limit (e.g., "song_add:userId")
 * @param config - Rate limit configuration
 */
export async function checkRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = now - config.windowMs
  const redisKey = `ratelimit:${key}`

  // Remove old entries outside the window
  await redis.zremrangebyscore(redisKey, 0, windowStart)

  // Count requests in current window
  const count = await redis.zcard(redisKey)

  if (count >= config.maxRequests) {
    // Get the oldest request timestamp to calculate reset time
    const oldestRequests = await redis.zrange(redisKey, 0, 0, 'WITHSCORES')
    const oldestTimestamp = oldestRequests[1] ? parseInt(oldestRequests[1]) : now
    const resetAt = oldestTimestamp + config.windowMs

    return {
      allowed: false,
      remaining: 0,
      resetAt
    }
  }

  // Add current request
  await redis.zadd(redisKey, now, `${now}-${Math.random()}`)

  // Set expiration to clean up old keys
  await redis.expire(redisKey, Math.ceil(config.windowMs / 1000) + 60)

  return {
    allowed: true,
    remaining: config.maxRequests - count - 1,
    resetAt: now + config.windowMs
  }
}

/**
 * Reset rate limit for a specific key
 */
export async function resetRateLimit(key: string): Promise<void> {
  await redis.del(`ratelimit:${key}`)
}

/**
 * Get current rate limit status without incrementing
 */
export async function getRateLimitStatus(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = now - config.windowMs
  const redisKey = `ratelimit:${key}`

  // Remove old entries
  await redis.zremrangebyscore(redisKey, 0, windowStart)

  // Count requests
  const count = await redis.zcard(redisKey)

  if (count >= config.maxRequests) {
    const oldestRequests = await redis.zrange(redisKey, 0, 0, 'WITHSCORES')
    const oldestTimestamp = oldestRequests[1] ? parseInt(oldestRequests[1]) : now
    const resetAt = oldestTimestamp + config.windowMs

    return {
      allowed: false,
      remaining: 0,
      resetAt
    }
  }

  return {
    allowed: true,
    remaining: config.maxRequests - count,
    resetAt: now + config.windowMs
  }
}

export const RATE_LIMITS = {
  SONG_ADD_FREE: {
    maxRequests: 1000,
    windowMs: 60 * 1000
  },
  SONG_ADD_RELAXED: {
    maxRequests: 10,
    windowMs: 5 * 60 * 1000
  },
  SONG_ADD_NORMAL: {
    maxRequests: 5,
    windowMs: 5 * 60 * 1000
  },
  SONG_ADD_STRICT: {
    maxRequests: 3,
    windowMs: 5 * 60 * 1000
  },
  CHAT_MESSAGE: {
    maxRequests: 20,
    windowMs: 60 * 1000
  }
}

export function getRateLimitConfig(mode: string): RateLimitConfig {
  switch (mode) {
    case 'free':
      return RATE_LIMITS.SONG_ADD_FREE
    case 'relaxed':
      return RATE_LIMITS.SONG_ADD_RELAXED
    case 'normal':
      return RATE_LIMITS.SONG_ADD_NORMAL
    case 'strict':
      return RATE_LIMITS.SONG_ADD_STRICT
    default:
      return RATE_LIMITS.SONG_ADD_FREE
  }
}

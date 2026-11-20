export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtMs: number;
  retryAfterSeconds: number;
}

export interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

export interface RateLimitStore {
  consume(key: string, config: RateLimitConfig, nowMs?: number): RateLimitResult;
  reset(): void;
}

const DEFAULT_MAX_BUCKETS = 10_000;

/**
 * Bounded in-memory sliding-window rate limiter suitable for single-instance
 * deployments and local development. Implements RateLimitStore so a Redis
 * store can be substituted seamlessly for multi-instance production clusters.
 */
export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, number[]>();
  private readonly maxBuckets: number;

  constructor(maxBuckets = DEFAULT_MAX_BUCKETS) {
    this.maxBuckets = maxBuckets;
  }

  consume(key: string, config: RateLimitConfig, nowMs = Date.now()): RateLimitResult {
    const windowStart = nowMs - config.windowMs;
    const existing = this.buckets.get(key) ?? [];
    const activeTimestamps = existing.filter((ts) => ts > windowStart);

    if (activeTimestamps.length >= config.limit) {
      const oldestActive = activeTimestamps[0] ?? nowMs;
      const resetAtMs = oldestActive + config.windowMs;
      const retryAfterSeconds = Math.max(1, Math.ceil((resetAtMs - nowMs) / 1000));

      this.buckets.set(key, activeTimestamps);

      return {
        allowed: false,
        limit: config.limit,
        remaining: 0,
        resetAtMs,
        retryAfterSeconds,
      };
    }

    if (!this.buckets.has(key) && this.buckets.size >= this.maxBuckets) {
      this.evictExpiredOrOldest(windowStart);
    }

    activeTimestamps.push(nowMs);
    this.buckets.set(key, activeTimestamps);

    const oldestActive = activeTimestamps[0] ?? nowMs;
    const resetAtMs = oldestActive + config.windowMs;

    return {
      allowed: true,
      limit: config.limit,
      remaining: Math.max(0, config.limit - activeTimestamps.length),
      resetAtMs,
      retryAfterSeconds: 0,
    };
  }

  reset(): void {
    this.buckets.clear();
  }

  private evictExpiredOrOldest(windowStart: number): void {
    for (const [bucketKey, timestamps] of this.buckets.entries()) {
      const latest = timestamps[timestamps.length - 1] ?? 0;
      if (latest <= windowStart) {
        this.buckets.delete(bucketKey);
      }
    }

    if (this.buckets.size >= this.maxBuckets) {
      const firstKey = this.buckets.keys().next().value;
      if (firstKey !== undefined) {
        this.buckets.delete(firstKey);
      }
    }
  }
}

export const defaultRateLimitStore = new InMemoryRateLimitStore();

export function getClientIdentifier(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = headers.get('x-real-ip')?.trim();
  if (realIp) {
    return realIp;
  }

  return 'unknown-client';
}

export function buildRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAtMs / 1000)),
  };

  if (!result.allowed) {
    headers['Retry-After'] = String(result.retryAfterSeconds);
  }

  return headers;
}

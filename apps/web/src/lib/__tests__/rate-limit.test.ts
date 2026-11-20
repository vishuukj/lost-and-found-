import { describe, it, expect } from 'vitest';
import {
  buildRateLimitHeaders,
  getClientIdentifier,
  InMemoryRateLimitStore,
} from '../rate-limit';

describe('Rate Limiter Utility', () => {
  it('enforces sliding-window limits and resets after window elapses', () => {
    const store = new InMemoryRateLimitStore(100);
    const config = { limit: 2, windowMs: 60_000 };

    const r1 = store.consume('ip-1', config, 1_000);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(1);

    const r2 = store.consume('ip-1', config, 2_000);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(0);

    const r3 = store.consume('ip-1', config, 3_000);
    expect(r3.allowed).toBe(false);
    expect(r3.retryAfterSeconds).toBeGreaterThan(0);

    const headers = buildRateLimitHeaders(r3);
    expect(headers['X-RateLimit-Limit']).toBe('2');
    expect(headers['X-RateLimit-Remaining']).toBe('0');
    expect(Number(headers['Retry-After'])).toBeGreaterThan(0);

    // After window passes from oldest timestamp (1_000 + 60_000)
    const r4 = store.consume('ip-1', config, 62_000);
    expect(r4.allowed).toBe(true);
    expect(r4.remaining).toBe(1);
  });

  it('evicts old buckets when maxBuckets capacity is reached', () => {
    const store = new InMemoryRateLimitStore(2);
    const config = { limit: 5, windowMs: 10_000 };

    store.consume('k1', config, 1_000);
    store.consume('k2', config, 2_000);
    store.consume('k3', config, 3_000);

    // Should not throw or grow unbounded
    const res = store.consume('k3', config, 4_000);
    expect(res.allowed).toBe(true);
  });

  it('extracts client IP safely from forwarding headers', () => {
    const forwarded = new Headers({ 'x-forwarded-for': '203.0.113.10, 10.0.0.1' });
    expect(getClientIdentifier(forwarded)).toBe('203.0.113.10');

    const realIp = new Headers({ 'x-real-ip': '198.51.100.5' });
    expect(getClientIdentifier(realIp)).toBe('198.51.100.5');

    expect(getClientIdentifier(new Headers())).toBe('unknown-client');
  });
});

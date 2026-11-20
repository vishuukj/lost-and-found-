import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { defaultRateLimitStore } from '@/lib/rate-limit';
import { GET } from '../route';

describe('OAuth Providers Status Route Handler', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    defaultRateLimitStore.reset();
    delete process.env.AUTH_GOOGLE_ID;
    delete process.env.AUTH_GOOGLE_SECRET;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.AUTH_FACEBOOK_ID;
    delete process.env.AUTH_FACEBOOK_SECRET;
    delete process.env.FACEBOOK_CLIENT_ID;
    delete process.env.FACEBOOK_CLIENT_SECRET;
    delete process.env.RATE_LIMIT_MAX_REQUESTS_PER_MINUTE;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    defaultRateLimitStore.reset();
  });

  it('returns google and facebook status without leaking secrets', async () => {
    process.env.AUTH_GOOGLE_ID = 'google-client-123';
    process.env.AUTH_GOOGLE_SECRET = 'super-secret-google';
    process.env.AUTH_FACEBOOK_ID = 'fb-client-456';
    process.env.AUTH_FACEBOOK_SECRET = 'super-secret-facebook';

    const request = new Request('http://localhost:3000/api/auth/providers/status', {
      headers: { 'x-forwarded-for': '203.0.113.20' },
    });

    const response = await GET(request);
    expect(response.status).toBe(200);
    expect(response.headers.get('X-RateLimit-Limit')).toBe('60');

    const body = await response.json();
    expect(body).toEqual({
      providers: [
        { id: 'google', name: 'Google', configured: true },
        { id: 'facebook', name: 'Facebook', configured: true },
      ],
    });

    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain('super-secret-google');
    expect(serialized).not.toContain('super-secret-facebook');
    expect(serialized).not.toContain('google-client-123');
    expect(serialized).not.toContain('fb-client-456');
  });

  it('returns 429 RATE_LIMITED when client exceeds per-minute quota', async () => {
    process.env.RATE_LIMIT_MAX_REQUESTS_PER_MINUTE = '2';

    const makeReq = () =>
      new Request('http://localhost:3000/api/auth/providers/status', {
        headers: { 'x-forwarded-for': '198.51.100.77' },
      });

    expect((await GET(makeReq())).status).toBe(200);
    expect((await GET(makeReq())).status).toBe(200);

    const blocked = await GET(makeReq());
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get('Retry-After')).toBeTruthy();

    const errorBody = await blocked.json();
    expect(errorBody.error.code).toBe('RATE_LIMITED');
  });
});

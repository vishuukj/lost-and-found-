import { describe, it, expect } from 'vitest';
import { EnvValidationError, isPlaceholderSecret, validateServerEnv } from '../env';

describe('Server Environment Validation', () => {
  it('detects placeholder secrets', () => {
    expect(isPlaceholderSecret(undefined)).toBe(true);
    expect(isPlaceholderSecret('')).toBe(true);
    expect(isPlaceholderSecret('your-random-32-character-secret-key')).toBe(true);
    expect(isPlaceholderSecret('changeme')).toBe(true);
    expect(isPlaceholderSecret('a9f3e2b1c4d5e6f7a8b9c0d1e2f3a4b5')).toBe(false);
  });

  it('allows relaxed configuration in development and applies defaults', () => {
    const result = validateServerEnv({
      NODE_ENV: 'development',
    } as unknown as NodeJS.ProcessEnv);

    expect(result.nodeEnv).toBe('development');
    expect(result.rateLimitMaxPerMinute).toBe(60);
    expect(result.authSecret).toBeUndefined();
  });

  it('throws EnvValidationError in production when DATABASE_URL or strong AUTH_SECRET is missing', () => {
    expect(() =>
      validateServerEnv({
        NODE_ENV: 'production',
        AUTH_SECRET: 'your-random-32-character-secret-key-change-in-production',
      } as unknown as NodeJS.ProcessEnv)
    ).toThrow(EnvValidationError);

    expect(() =>
      validateServerEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'mongodb://localhost:27017/lost_found_india',
        AUTH_SECRET: 'too-short-secret',
      } as unknown as NodeJS.ProcessEnv)
    ).toThrow(EnvValidationError);

    expect(() =>
      validateServerEnv({
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://postgres:pass@db:5432/app',
      } as unknown as NodeJS.ProcessEnv)
    ).toThrow(EnvValidationError);
  });

  it('accepts valid production MongoDB environment variables', () => {
    const result = validateServerEnv({
      NODE_ENV: 'production',
      DATABASE_URL: 'mongodb+srv://admin:strongpass@cluster0.mongodb.net/lost_found_india',
      AUTH_SECRET: 'c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0',
      NEXT_PUBLIC_APP_URL: 'https://lostfoundindia.org',
      RATE_LIMIT_MAX_REQUESTS_PER_MINUTE: '120',
    } as unknown as NodeJS.ProcessEnv);

    expect(result.nodeEnv).toBe('production');
    expect(result.rateLimitMaxPerMinute).toBe(120);
    expect(result.authSecret).toBe('c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0');
  });
});

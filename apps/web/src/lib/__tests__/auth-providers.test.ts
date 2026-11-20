import { describe, it, expect } from 'vitest';
import {
  getAuthSecret,
  getOAuthProvidersConfig,
  getOAuthProviderStatuses,
  isOAuthProviderConfigured,
} from '../auth-providers';

describe('OAuth Provider Configuration Helpers', () => {
  it('marks Google and Facebook as unconfigured when env vars are missing or placeholders', () => {
    const env = {
      AUTH_GOOGLE_ID: 'your-google-client-id',
      AUTH_GOOGLE_SECRET: '',
      AUTH_FACEBOOK_ID: 'changeme',
      AUTH_FACEBOOK_SECRET: 'replace-me',
    } as unknown as NodeJS.ProcessEnv;

    const config = getOAuthProvidersConfig(env);
    expect(config.google.configured).toBe(false);
    expect(config.facebook.configured).toBe(false);
    expect(isOAuthProviderConfigured('google', env)).toBe(false);
    expect(isOAuthProviderConfigured('facebook', env)).toBe(false);
  });

  it('detects valid AUTH_* credentials for both Google and Facebook', () => {
    const env = {
      AUTH_GOOGLE_ID: '1234567890.apps.googleusercontent.com',
      AUTH_GOOGLE_SECRET: 'GOCSPX-real-secret-value',
      AUTH_FACEBOOK_ID: '987654321098765',
      AUTH_FACEBOOK_SECRET: 'fb-app-secret-value',
    } as unknown as NodeJS.ProcessEnv;

    const statuses = getOAuthProviderStatuses(env);
    expect(statuses).toEqual([
      { id: 'google', name: 'Google', configured: true },
      { id: 'facebook', name: 'Facebook', configured: true },
    ]);
  });

  it('falls back to GOOGLE_CLIENT_* and FACEBOOK_CLIENT_* environment variables', () => {
    const env = {
      GOOGLE_CLIENT_ID: 'google-client-id-fallback',
      GOOGLE_CLIENT_SECRET: 'google-secret-fallback',
      FACEBOOK_CLIENT_ID: 'facebook-client-id-fallback',
      FACEBOOK_CLIENT_SECRET: 'facebook-secret-fallback',
      NEXTAUTH_SECRET: 'fallback-secret-32-chars-minimum-value',
    } as unknown as NodeJS.ProcessEnv;

    expect(isOAuthProviderConfigured('google', env)).toBe(true);
    expect(isOAuthProviderConfigured('facebook', env)).toBe(true);
    expect(getAuthSecret(env)).toBe('fallback-secret-32-chars-minimum-value');
  });
});

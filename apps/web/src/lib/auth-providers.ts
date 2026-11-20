import type { OAuthProviderId, OAuthProviderStatus } from '@lost-found/shared';

export interface ProviderCredentials {
  clientId: string;
  clientSecret: string;
  configured: boolean;
}

export interface OAuthProvidersConfig {
  google: ProviderCredentials;
  facebook: ProviderCredentials;
}

function normalizeCredential(value: string | undefined): string {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return '';
  }

  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('your-') ||
    lower.startsWith('your_') ||
    lower === 'changeme' ||
    lower === 'replace-me'
  ) {
    return '';
  }

  return trimmed;
}

export function getOAuthProvidersConfig(
  env: NodeJS.ProcessEnv = process.env
): OAuthProvidersConfig {
  const googleClientId = normalizeCredential(env.AUTH_GOOGLE_ID ?? env.GOOGLE_CLIENT_ID);
  const googleClientSecret = normalizeCredential(
    env.AUTH_GOOGLE_SECRET ?? env.GOOGLE_CLIENT_SECRET
  );

  const facebookClientId = normalizeCredential(
    env.AUTH_FACEBOOK_ID ?? env.FACEBOOK_CLIENT_ID
  );
  const facebookClientSecret = normalizeCredential(
    env.AUTH_FACEBOOK_SECRET ?? env.FACEBOOK_CLIENT_SECRET
  );

  return {
    google: {
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      configured: Boolean(googleClientId && googleClientSecret),
    },
    facebook: {
      clientId: facebookClientId,
      clientSecret: facebookClientSecret,
      configured: Boolean(facebookClientId && facebookClientSecret),
    },
  };
}

export function getOAuthProviderStatuses(
  env: NodeJS.ProcessEnv = process.env
): OAuthProviderStatus[] {
  const config = getOAuthProvidersConfig(env);

  return [
    {
      id: 'google',
      name: 'Google',
      configured: config.google.configured,
    },
    {
      id: 'facebook',
      name: 'Facebook',
      configured: config.facebook.configured,
    },
  ];
}

export function isOAuthProviderConfigured(
  provider: OAuthProviderId,
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const config = getOAuthProvidersConfig(env);
  return config[provider].configured;
}

export function getAuthSecret(env: NodeJS.ProcessEnv = process.env): string | undefined {
  return normalizeCredential(env.AUTH_SECRET ?? env.NEXTAUTH_SECRET) || undefined;
}

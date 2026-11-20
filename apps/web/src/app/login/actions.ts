'use server';

import { redirect } from 'next/navigation';
import { OAuthProviderIdSchema, type OAuthProviderId } from '@lost-found/shared';
import { signIn, signOut } from '@/auth';
import { isOAuthProviderConfigured } from '@/lib/auth-providers';

function sanitizeRedirectPath(redirectTo?: string): string {
  if (!redirectTo || !redirectTo.startsWith('/') || redirectTo.startsWith('//')) {
    return '/';
  }
  return redirectTo;
}

export async function signInWithProvider(
  provider: OAuthProviderId,
  redirectTo?: string
): Promise<void> {
  const parsedProvider = OAuthProviderIdSchema.parse(provider);
  const safeRedirect = sanitizeRedirectPath(redirectTo);

  if (!isOAuthProviderConfigured(parsedProvider)) {
    redirect(`/login?error=ProviderNotConfigured&provider=${parsedProvider}`);
  }

  await signIn(parsedProvider, { redirectTo: safeRedirect });
}

export async function signOutUser(): Promise<void> {
  await signOut({ redirectTo: '/' });
}

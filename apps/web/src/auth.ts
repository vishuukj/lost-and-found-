import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Facebook from 'next-auth/providers/facebook';
import { OAuthProviderIdSchema, type OAuthProviderId, type UserRole } from '@lost-found/shared';
import { getAuthSecret, getOAuthProvidersConfig } from '@/lib/auth-providers';
import {
  AuthAccountDisabledError,
  AuthAccountLinkingRequiredError,
  getActiveUserSessionState,
  recordUserLogout,
  syncOAuthUser,
} from '@/lib/auth-service';

const oauthConfig = getOAuthProvidersConfig();
const SESSION_REVALIDATION_INTERVAL_MS = 5 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: getAuthSecret(),
  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Google({
      clientId: oauthConfig.google.clientId,
      clientSecret: oauthConfig.google.clientSecret,
      authorization: {
        params: {
          prompt: 'select_account',
          response_type: 'code',
        },
      },
    }),
    Facebook({
      clientId: oauthConfig.facebook.clientId,
      clientSecret: oauthConfig.facebook.clientSecret,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account) {
        return '/login?error=OAuthSignin';
      }

      const providerResult = OAuthProviderIdSchema.safeParse(account.provider);
      if (!providerResult.success) {
        return '/login?error=UnsupportedProvider';
      }

      if (!user.email) {
        return '/login?error=EmailRequired';
      }

      const provider: OAuthProviderId = providerResult.data;
      const fallbackName = user.email.split('@')[0] || 'User';
      // Require explicit email verification from the identity provider
      const emailVerified = profile?.email_verified === true;

      try {
        const syncedUser = await syncOAuthUser({
          provider,
          providerAccountId: account.providerAccountId,
          email: user.email,
          fullName: user.name?.trim() || fallbackName,
          avatarUrl: user.image ?? null,
          emailVerified,
          accessToken: null,
          refreshToken: null,
          expiresAt: account.expires_at ?? null,
          tokenType: account.token_type ?? null,
          scope: account.scope ?? null,
        });

        user.id = syncedUser.id;
        user.name = syncedUser.fullName;
        user.email = syncedUser.email;
        user.image = syncedUser.avatarUrl ?? null;
        user.role = syncedUser.role;
        user.provider = provider;

        return true;
      } catch (error: unknown) {
        if (error instanceof AuthAccountDisabledError) {
          return '/login?error=AccountDisabled';
        }

        if (error instanceof AuthAccountLinkingRequiredError) {
          return '/login?error=OAuthAccountNotLinked';
        }

        return '/login?error=DatabaseUnavailable';
      }
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id ?? token.sub;
        token.role = (user.role ?? 'USER') as UserRole;
        token.lastCheckedAt = Date.now();
        if (user.provider) {
          token.provider = user.provider;
        }
      }

      if (account) {
        const parsedProvider = OAuthProviderIdSchema.safeParse(account.provider);
        if (parsedProvider.success) {
          token.provider = parsedProvider.data;
        }
      }

      const userId = token.id ?? token.sub;
      const now = Date.now();
      const shouldRevalidate =
        !user &&
        typeof userId === 'string' &&
        userId.length > 0 &&
        (typeof token.lastCheckedAt !== 'number' ||
          now - token.lastCheckedAt >= SESSION_REVALIDATION_INTERVAL_MS);

      if (shouldRevalidate) {
        const state = await getActiveUserSessionState(userId);
        if (state) {
          if (!state.active) {
            return null;
          }
          if (state.role) {
            token.role = state.role;
          }
          token.lastCheckedAt = now;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? token.sub ?? '';
        session.user.role = (token.role ?? 'USER') as UserRole;
        if (token.provider) {
          session.user.provider = token.provider;
        }
      }
      return session;
    },
  },
  events: {
    async signOut(message) {
      if ('token' in message && message.token?.id) {
        await recordUserLogout(message.token.id);
      }
    },
  },
});

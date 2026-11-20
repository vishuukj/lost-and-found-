import { prisma } from '@lost-found/database';
import {
  OAuthProfileInputSchema,
  type AuthenticatedUser,
  type OAuthProviderId,
  type UserRole,
} from '@lost-found/shared';
import { logger } from '@/lib/logger';

type PrismaOAuthProvider = 'GOOGLE' | 'FACEBOOK';

const PROVIDER_MAP: Record<OAuthProviderId, PrismaOAuthProvider> = {
  google: 'GOOGLE',
  facebook: 'FACEBOOK',
};

export class AuthAccountDisabledError extends Error {
  constructor() {
    super('This account has been deactivated.');
    this.name = 'AuthAccountDisabledError';
  }
}

export class AuthAccountLinkingRequiredError extends Error {
  constructor() {
    super('Automatic account linking requires verified email ownership on both accounts.');
    this.name = 'AuthAccountLinkingRequiredError';
  }
}

export class AuthPersistenceError extends Error {
  constructor() {
    super('Unable to complete authentication due to a service error.');
    this.name = 'AuthPersistenceError';
  }
}

export interface ActiveUserSessionState {
  active: boolean;
  role?: UserRole;
}

async function writeAuditLogSafe(data: {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, string | boolean>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({ data });
  } catch (auditError: unknown) {
    logger.warn(`Failed to write ${data.action} audit log`, {
      userId: data.userId,
      error: auditError,
    });
  }
}

export async function syncOAuthUser(rawInput: unknown): Promise<AuthenticatedUser> {
  const parsed = OAuthProfileInputSchema.parse(rawInput);
  const prismaProvider = PROVIDER_MAP[parsed.provider];
  const normalizedEmail = parsed.email.toLowerCase();

  try {
    const existingOAuthAccount = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: prismaProvider,
          providerAccountId: parsed.providerAccountId,
        },
      },
      include: {
        user: true,
      },
    });

    if (existingOAuthAccount) {
      if (existingOAuthAccount.user.deletedAt) {
        throw new AuthAccountDisabledError();
      }

      // DPDP & security data minimization: do not persist plaintext OAuth tokens.
      // Sequential writes ensure compatibility with both standalone MongoDB and Replica Sets/Atlas.
      await prisma.oAuthAccount.update({
        where: { id: existingOAuthAccount.id },
        data: {
          accessToken: null,
          refreshToken: null,
          expiresAt: parsed.expiresAt ?? existingOAuthAccount.expiresAt,
          tokenType: parsed.tokenType ?? existingOAuthAccount.tokenType,
          scope: parsed.scope ?? existingOAuthAccount.scope,
        },
      });

      const updatedUser = await prisma.user.update({
        where: { id: existingOAuthAccount.userId },
        data: {
          avatarUrl: parsed.avatarUrl ?? existingOAuthAccount.user.avatarUrl,
          ...(parsed.emailVerified && !existingOAuthAccount.user.isEmailVerified
            ? { isEmailVerified: true, emailVerifiedAt: new Date() }
            : {}),
        },
      });

      await writeAuditLogSafe({
        userId: updatedUser.id,
        action: 'USER_OAUTH_LOGIN',
        entityType: 'User',
        entityId: updatedUser.id,
        details: { provider: parsed.provider },
      });

      return {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        role: updatedUser.role as UserRole,
        avatarUrl: updatedUser.avatarUrl,
        provider: parsed.provider,
      };
    }

    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUserByEmail) {
      if (existingUserByEmail.deletedAt) {
        throw new AuthAccountDisabledError();
      }

      // Prevent OAuth account takeover: only auto-link when BOTH the OAuth provider
      // and the existing user account have explicitly verified email ownership.
      if (!parsed.emailVerified || !existingUserByEmail.isEmailVerified) {
        await writeAuditLogSafe({
          userId: existingUserByEmail.id,
          action: 'USER_OAUTH_LINK_BLOCKED',
          entityType: 'User',
          entityId: existingUserByEmail.id,
          details: {
            provider: parsed.provider,
            providerEmailVerified: parsed.emailVerified,
            existingEmailVerified: existingUserByEmail.isEmailVerified,
          },
        });

        throw new AuthAccountLinkingRequiredError();
      }

      await prisma.oAuthAccount.create({
        data: {
          userId: existingUserByEmail.id,
          provider: prismaProvider,
          providerAccountId: parsed.providerAccountId,
          accessToken: null,
          refreshToken: null,
          expiresAt: parsed.expiresAt ?? null,
          tokenType: parsed.tokenType ?? null,
          scope: parsed.scope ?? null,
        },
      });

      const linkedUser = await prisma.user.update({
        where: { id: existingUserByEmail.id },
        data: {
          avatarUrl: existingUserByEmail.avatarUrl ?? parsed.avatarUrl ?? null,
        },
      });

      await writeAuditLogSafe({
        userId: linkedUser.id,
        action: 'USER_OAUTH_ACCOUNT_LINKED',
        entityType: 'OAuthAccount',
        entityId: linkedUser.id,
        details: { provider: parsed.provider },
      });

      await writeAuditLogSafe({
        userId: linkedUser.id,
        action: 'USER_OAUTH_LOGIN',
        entityType: 'User',
        entityId: linkedUser.id,
        details: { provider: parsed.provider },
      });

      return {
        id: linkedUser.id,
        email: linkedUser.email,
        fullName: linkedUser.fullName,
        role: linkedUser.role as UserRole,
        avatarUrl: linkedUser.avatarUrl,
        provider: parsed.provider,
      };
    }

    const createdUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: null,
        fullName: parsed.fullName,
        avatarUrl: parsed.avatarUrl ?? null,
        role: 'USER',
        isEmailVerified: parsed.emailVerified,
        emailVerifiedAt: parsed.emailVerified ? new Date() : null,
      },
    });

    await prisma.oAuthAccount.create({
      data: {
        userId: createdUser.id,
        provider: prismaProvider,
        providerAccountId: parsed.providerAccountId,
        accessToken: null,
        refreshToken: null,
        expiresAt: parsed.expiresAt ?? null,
        tokenType: parsed.tokenType ?? null,
        scope: parsed.scope ?? null,
      },
    });

    await writeAuditLogSafe({
      userId: createdUser.id,
      action: 'USER_OAUTH_REGISTERED',
      entityType: 'User',
      entityId: createdUser.id,
      details: { provider: parsed.provider },
    });

    await writeAuditLogSafe({
      userId: createdUser.id,
      action: 'USER_OAUTH_LOGIN',
      entityType: 'User',
      entityId: createdUser.id,
      details: { provider: parsed.provider },
    });

    return {
      id: createdUser.id,
      email: createdUser.email,
      fullName: createdUser.fullName,
      role: createdUser.role as UserRole,
      avatarUrl: createdUser.avatarUrl,
      provider: parsed.provider,
    };
  } catch (error: unknown) {
    if (
      error instanceof AuthAccountDisabledError ||
      error instanceof AuthAccountLinkingRequiredError
    ) {
      throw error;
    }

    logger.error('Failed to persist OAuth user session', {
      provider: parsed.provider,
      error,
    });
    throw new AuthPersistenceError();
  }
}

export async function getActiveUserSessionState(
  userId: string
): Promise<ActiveUserSessionState | null> {
  if (!userId) {
    return { active: false };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt) {
      return { active: false };
    }

    return {
      active: true,
      role: user.role as UserRole,
    };
  } catch (error: unknown) {
    logger.warn('Skipping periodic session validation due to database error', {
      userId,
      error,
    });
    return null;
  }
}

export async function recordUserLogout(userId: string): Promise<void> {
  if (!userId) {
    return;
  }

  await writeAuditLogSafe({
    userId,
    action: 'USER_LOGOUT',
    entityType: 'User',
    entityId: userId,
  });
}

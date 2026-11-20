import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AuthAccountDisabledError,
  AuthAccountLinkingRequiredError,
  AuthPersistenceError,
  getActiveUserSessionState,
  recordUserLogout,
  syncOAuthUser,
} from '../auth-service';

const mockPrisma = {
  oAuthAccount: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
};

vi.mock('@lost-found/database', () => ({
  prisma: {
    get oAuthAccount() {
      return mockPrisma.oAuthAccount;
    },
    get user() {
      return mockPrisma.user;
    },
    get auditLog() {
      return mockPrisma.auditLog;
    },
  },
}));

const USER_ID_1 = '6740a1b2c3d4e5f607182901';
const USER_ID_2 = '6740a1b2c3d4e5f607182902';
const USER_ID_3 = '6740a1b2c3d4e5f607182903';

describe('syncOAuthUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a new User, OAuthAccount without plaintext tokens, and AuditLogs on first Google sign-in', async () => {
    mockPrisma.oAuthAccount.findUnique.mockResolvedValueOnce(null);
    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    mockPrisma.user.create.mockResolvedValueOnce({
      id: USER_ID_1,
      email: 'ananya@example.com',
      fullName: 'Ananya Iyer',
      role: 'USER',
      avatarUrl: 'https://lh3.googleusercontent.com/avatar.jpg',
    });
    mockPrisma.oAuthAccount.create.mockResolvedValueOnce({});
    mockPrisma.auditLog.create.mockResolvedValue({});

    const result = await syncOAuthUser({
      provider: 'google',
      providerAccountId: 'google-sub-001',
      email: 'Ananya@Example.com',
      fullName: 'Ananya Iyer',
      avatarUrl: 'https://lh3.googleusercontent.com/avatar.jpg',
      emailVerified: true,
      accessToken: 'raw-access-token',
      refreshToken: 'raw-refresh-token',
    });

    expect(result).toEqual({
      id: USER_ID_1,
      email: 'ananya@example.com',
      fullName: 'Ananya Iyer',
      role: 'USER',
      avatarUrl: 'https://lh3.googleusercontent.com/avatar.jpg',
      provider: 'google',
    });
    expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.oAuthAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID_1,
          accessToken: null,
          refreshToken: null,
        }),
      })
    );
    expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(2);
  });

  it('links Facebook OAuthAccount to an existing verified user when provider email is verified', async () => {
    mockPrisma.oAuthAccount.findUnique.mockResolvedValueOnce(null);
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: USER_ID_2,
      email: 'rohan@example.com',
      fullName: 'Rohan Kulkarni',
      role: 'INSTITUTION_STAFF',
      avatarUrl: null,
      isEmailVerified: true,
      deletedAt: null,
    });
    mockPrisma.oAuthAccount.create.mockResolvedValueOnce({});
    mockPrisma.user.update.mockResolvedValueOnce({
      id: USER_ID_2,
      email: 'rohan@example.com',
      fullName: 'Rohan Kulkarni',
      role: 'INSTITUTION_STAFF',
      avatarUrl: 'https://graph.facebook.com/avatar.jpg',
    });
    mockPrisma.auditLog.create.mockResolvedValue({});

    const result = await syncOAuthUser({
      provider: 'facebook',
      providerAccountId: 'fb-user-999',
      email: 'rohan@example.com',
      fullName: 'Rohan Kulkarni',
      avatarUrl: 'https://graph.facebook.com/avatar.jpg',
      emailVerified: true,
      accessToken: 'should-not-persist',
    });

    expect(result.id).toBe(USER_ID_2);
    expect(result.role).toBe('INSTITUTION_STAFF');
    expect(result.provider).toBe('facebook');
    expect(mockPrisma.oAuthAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accessToken: null,
          refreshToken: null,
        }),
      })
    );
    expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(2);
  });

  it('blocks automatic OAuth account linking when either email is unverified', async () => {
    mockPrisma.oAuthAccount.findUnique.mockResolvedValueOnce(null);
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: USER_ID_2,
      email: 'admin@university.edu.in',
      fullName: 'Admin User',
      role: 'INSTITUTION_ADMIN',
      avatarUrl: null,
      isEmailVerified: true,
      deletedAt: null,
    });
    mockPrisma.auditLog.create.mockResolvedValueOnce({});

    await expect(
      syncOAuthUser({
        provider: 'facebook',
        providerAccountId: 'fb-attacker-123',
        email: 'admin@university.edu.in',
        fullName: 'Attacker',
        emailVerified: false,
      })
    ).rejects.toBeInstanceOf(AuthAccountLinkingRequiredError);

    expect(mockPrisma.oAuthAccount.create).not.toHaveBeenCalled();
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'USER_OAUTH_LINK_BLOCKED',
          userId: USER_ID_2,
        }),
      })
    );
  });

  it('blocks automatic OAuth account linking when existing user email is unverified', async () => {
    mockPrisma.oAuthAccount.findUnique.mockResolvedValueOnce(null);
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      id: '6740a1b2c3d4e5f607182904',
      email: 'pending@example.com',
      fullName: 'Pending User',
      role: 'USER',
      avatarUrl: null,
      isEmailVerified: false,
      deletedAt: null,
    });
    mockPrisma.auditLog.create.mockResolvedValueOnce({});

    await expect(
      syncOAuthUser({
        provider: 'google',
        providerAccountId: 'google-sub-unverified',
        email: 'pending@example.com',
        fullName: 'Pending User',
        emailVerified: true,
      })
    ).rejects.toBeInstanceOf(AuthAccountLinkingRequiredError);

    expect(mockPrisma.oAuthAccount.create).not.toHaveBeenCalled();
  });

  it('scrubs legacy OAuth tokens and logs login for an already linked OAuth account', async () => {
    mockPrisma.oAuthAccount.findUnique.mockResolvedValueOnce({
      id: '6740a1b2c3d4e5f607182910',
      userId: USER_ID_3,
      accessToken: 'old-token',
      refreshToken: 'old-refresh',
      expiresAt: null,
      tokenType: 'bearer',
      scope: 'openid email',
      user: {
        id: USER_ID_3,
        email: 'meera@example.com',
        fullName: 'Meera Nair',
        role: 'USER',
        avatarUrl: null,
        isEmailVerified: true,
        deletedAt: null,
      },
    });
    mockPrisma.oAuthAccount.update.mockResolvedValueOnce({});
    mockPrisma.user.update.mockResolvedValueOnce({
      id: USER_ID_3,
      email: 'meera@example.com',
      fullName: 'Meera Nair',
      role: 'USER',
      avatarUrl: 'https://lh3.googleusercontent.com/new.jpg',
    });
    mockPrisma.auditLog.create.mockResolvedValueOnce({});

    const result = await syncOAuthUser({
      provider: 'google',
      providerAccountId: 'google-sub-003',
      email: 'meera@example.com',
      fullName: 'Meera Nair',
      avatarUrl: 'https://lh3.googleusercontent.com/new.jpg',
      accessToken: 'new-token',
    });

    expect(result.id).toBe(USER_ID_3);
    expect(mockPrisma.oAuthAccount.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accessToken: null,
          refreshToken: null,
        }),
      })
    );
    expect(mockPrisma.auditLog.create).toHaveBeenCalledTimes(1);
  });

  it('rejects sign-in when the user account is soft-deleted', async () => {
    mockPrisma.oAuthAccount.findUnique.mockResolvedValueOnce({
      id: '6740a1b2c3d4e5f607182911',
      userId: '6740a1b2c3d4e5f607182912',
      user: {
        id: '6740a1b2c3d4e5f607182912',
        email: 'deleted@example.com',
        fullName: 'Deleted User',
        role: 'USER',
        deletedAt: new Date(),
      },
    });

    await expect(
      syncOAuthUser({
        provider: 'google',
        providerAccountId: 'google-sub-del',
        email: 'deleted@example.com',
        fullName: 'Deleted User',
      })
    ).rejects.toBeInstanceOf(AuthAccountDisabledError);
  });

  it('throws ZodError for invalid OAuth payload before touching the database', async () => {
    await expect(
      syncOAuthUser({
        provider: 'unsupported',
        providerAccountId: '',
        email: 'bad-email',
        fullName: '',
      })
    ).rejects.toThrow();

    expect(mockPrisma.oAuthAccount.findUnique).not.toHaveBeenCalled();
  });

  it('wraps unexpected database failures in AuthPersistenceError without leaking credentials', async () => {
    mockPrisma.oAuthAccount.findUnique.mockRejectedValueOnce(
      new Error('mongodb+srv://admin:secret@cluster0.mongodb.net/lost_found_india connection refused')
    );

    await expect(
      syncOAuthUser({
        provider: 'google',
        providerAccountId: 'google-sub-err',
        email: 'test@example.com',
        fullName: 'Test User',
      })
    ).rejects.toBeInstanceOf(AuthPersistenceError);
  });
});

describe('getActiveUserSessionState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns active state and current role for an active user', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      role: 'INSTITUTION_ADMIN',
      deletedAt: null,
    });

    await expect(getActiveUserSessionState(USER_ID_1)).resolves.toEqual({
      active: true,
      role: 'INSTITUTION_ADMIN',
    });
  });

  it('returns inactive state when user is soft-deleted or missing', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      role: 'USER',
      deletedAt: new Date(),
    });
    await expect(getActiveUserSessionState(USER_ID_2)).resolves.toEqual({ active: false });

    mockPrisma.user.findUnique.mockResolvedValueOnce(null);
    await expect(getActiveUserSessionState(USER_ID_3)).resolves.toEqual({ active: false });
  });

  it('returns null gracefully when database is temporarily unreachable', async () => {
    mockPrisma.user.findUnique.mockRejectedValueOnce(new Error('ETIMEDOUT'));
    await expect(getActiveUserSessionState(USER_ID_1)).resolves.toBeNull();
  });
});

describe('recordUserLogout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes a USER_LOGOUT audit log and swallows DB errors safely', async () => {
    mockPrisma.auditLog.create.mockResolvedValueOnce({});
    await recordUserLogout(USER_ID_1);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: USER_ID_1,
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: USER_ID_1,
      },
    });

    mockPrisma.auditLog.create.mockRejectedValueOnce(new Error('DB offline'));
    await expect(recordUserLogout(USER_ID_1)).resolves.toBeUndefined();
  });
});

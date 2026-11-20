import type { DefaultSession } from 'next-auth';
import type { OAuthProviderId, UserRole } from '@lost-found/shared';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      provider?: OAuthProviderId;
    } & DefaultSession['user'];
  }

  interface User {
    role?: UserRole;
    provider?: OAuthProviderId;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string;
    role?: UserRole;
    provider?: OAuthProviderId;
    lastCheckedAt?: number;
  }
}

import { z } from 'zod';

const PLACEHOLDER_PREFIXES = ['your-', 'your_'];
const PLACEHOLDER_EXACT = new Set(['changeme', 'replace-me', 'example', 'secret']);

export function isPlaceholderSecret(value: string | undefined): boolean {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) {
    return true;
  }
  const lower = trimmed.toLowerCase();
  if (PLACEHOLDER_EXACT.has(lower)) {
    return true;
  }
  return PLACEHOLDER_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z
    .string()
    .trim()
    .refine(
      (url) => url.startsWith('mongodb://') || url.startsWith('mongodb+srv://'),
      'DATABASE_URL must be a valid MongoDB connection URI (mongodb:// or mongodb+srv://)'
    )
    .optional(),
  AUTH_SECRET: z.string().trim().optional(),
  NEXTAUTH_SECRET: z.string().trim().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  RATE_LIMIT_MAX_REQUESTS_PER_MINUTE: z.coerce.number().int().min(1).max(10000).default(60),
});

export interface ValidatedServerEnv {
  nodeEnv: 'development' | 'test' | 'production';
  databaseUrl?: string;
  authSecret?: string;
  appUrl?: string;
  rateLimitMaxPerMinute: number;
}

export class EnvValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvValidationError';
  }
}

export function validateServerEnv(
  env: NodeJS.ProcessEnv = process.env
): ValidatedServerEnv {
  const parsed = ServerEnvSchema.safeParse({
    NODE_ENV: env.NODE_ENV,
    DATABASE_URL: env.DATABASE_URL,
    AUTH_SECRET: env.AUTH_SECRET,
    NEXTAUTH_SECRET: env.NEXTAUTH_SECRET,
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL || undefined,
    RATE_LIMIT_MAX_REQUESTS_PER_MINUTE: env.RATE_LIMIT_MAX_REQUESTS_PER_MINUTE,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new EnvValidationError(`Invalid server environment configuration: ${issues}`);
  }

  const rawAuthSecret = parsed.data.AUTH_SECRET || parsed.data.NEXTAUTH_SECRET;
  const authSecret = isPlaceholderSecret(rawAuthSecret) ? undefined : rawAuthSecret?.trim();

  if (parsed.data.NODE_ENV === 'production') {
    const missing: string[] = [];

    if (!parsed.data.DATABASE_URL) {
      missing.push('DATABASE_URL is required in production');
    }

    if (!authSecret || authSecret.length < 32) {
      missing.push(
        'AUTH_SECRET (or NEXTAUTH_SECRET) must be a non-placeholder string of at least 32 characters in production'
      );
    }

    if (missing.length > 0) {
      throw new EnvValidationError(
        `Production environment validation failed: ${missing.join('; ')}`
      );
    }
  }

  return {
    nodeEnv: parsed.data.NODE_ENV,
    databaseUrl: parsed.data.DATABASE_URL,
    authSecret,
    appUrl: parsed.data.NEXT_PUBLIC_APP_URL,
    rateLimitMaxPerMinute: parsed.data.RATE_LIMIT_MAX_REQUESTS_PER_MINUTE,
  };
}

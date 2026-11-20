import { NextResponse } from 'next/server';
import type { ApiErrorResponse } from '@lost-found/shared';
import { getOAuthProviderStatuses } from '@/lib/auth-providers';
import {
  buildRateLimitHeaders,
  defaultRateLimitStore,
  getClientIdentifier,
} from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const RATE_LIMIT_WINDOW_MS = 60_000;

function getRateLimitMax(): number {
  const parsed = Number(process.env.RATE_LIMIT_MAX_REQUESTS_PER_MINUTE ?? 60);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 60;
}

export async function GET(request: Request) {
  const clientId = getClientIdentifier(request.headers);
  const rateLimit = defaultRateLimitStore.consume(`auth-providers-status:${clientId}`, {
    limit: getRateLimitMax(),
    windowMs: RATE_LIMIT_WINDOW_MS,
  });

  const rateHeaders = buildRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    const errorBody: ApiErrorResponse = {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests. Please try again shortly.',
      },
    };
    return NextResponse.json(errorBody, {
      status: 429,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        ...rateHeaders,
      },
    });
  }

  const providers = getOAuthProviderStatuses();

  return NextResponse.json(
    { providers },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        ...rateHeaders,
      },
    }
  );
}

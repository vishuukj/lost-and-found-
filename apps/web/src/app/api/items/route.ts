import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import type { ApiErrorResponse } from '@lost-found/shared';
import { auth } from '@/auth';
import {
  createItem,
  ItemForbiddenError,
  ItemServiceError,
  searchPublicItems,
} from '@/lib/item-service';
import {
  buildRateLimitHeaders,
  defaultRateLimitStore,
  getClientIdentifier,
} from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const RATE_LIMIT_WINDOW_MS = 60_000;

function getPublicSearchLimit(): number {
  const parsed = Number(process.env.RATE_LIMIT_MAX_REQUESTS_PER_MINUTE ?? 60);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 60;
}

function errorResponse(
  code: string,
  message: string,
  status: number,
  extraHeaders: Record<string, string> = {}
) {
  const body: ApiErrorResponse = { error: { code, message } };
  return NextResponse.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      ...extraHeaders,
    },
  });
}

function extractQueryParams(url: string): Record<string, string> {
  const searchParams = new URL(url).searchParams;
  const params: Record<string, string> = {};
  for (const [key, value] of searchParams.entries()) {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      params[key] = trimmed;
    }
  }
  return params;
}

export async function GET(request: Request) {
  const clientId = getClientIdentifier(request.headers);
  const rateLimit = defaultRateLimitStore.consume(`items-search:${clientId}`, {
    limit: getPublicSearchLimit(),
    windowMs: RATE_LIMIT_WINDOW_MS,
  });
  const rateHeaders = buildRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return errorResponse(
      'RATE_LIMITED',
      'Too many search requests. Please wait a moment and try again.',
      429,
      rateHeaders
    );
  }

  try {
    const query = extractQueryParams(request.url);
    const result = await searchPublicItems(query);

    return NextResponse.json(result, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        ...rateHeaders,
      },
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0]?.message ?? 'Invalid search parameters.';
      return errorResponse('VALIDATION_ERROR', firstIssue, 400, rateHeaders);
    }

    if (error instanceof ItemServiceError) {
      return errorResponse('SERVICE_UNAVAILABLE', error.message, 503, rateHeaders);
    }

    return errorResponse('INTERNAL_ERROR', 'Unable to load items right now.', 500, rateHeaders);
  }
}

export async function POST(request: Request) {
  const clientId = getClientIdentifier(request.headers);
  const rateLimit = defaultRateLimitStore.consume(`items-create:${clientId}`, {
    limit: 20,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });
  const rateHeaders = buildRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return errorResponse(
      'RATE_LIMITED',
      'Too many item submissions. Please wait a minute before submitting again.',
      429,
      rateHeaders
    );
  }

  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse(
      'UNAUTHORIZED',
      'Please sign in to report a lost or found item.',
      401,
      rateHeaders
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON.', 400, rateHeaders);
  }

  try {
    const item = await createItem(
      {
        id: session.user.id,
        role: session.user.role,
      },
      body
    );

    return NextResponse.json(
      { item },
      {
        status: 201,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          ...rateHeaders,
        },
      }
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0];
      const path = firstIssue?.path.length ? `${firstIssue.path.join('.')}: ` : '';
      return errorResponse(
        'VALIDATION_ERROR',
        `${path}${firstIssue?.message ?? 'Invalid item report payload.'}`,
        400,
        rateHeaders
      );
    }

    if (error instanceof ItemForbiddenError) {
      return errorResponse('FORBIDDEN', error.message, 403, rateHeaders);
    }

    if (error instanceof ItemServiceError) {
      return errorResponse('SERVICE_UNAVAILABLE', error.message, 503, rateHeaders);
    }

    return errorResponse(
      'INTERNAL_ERROR',
      'Unable to submit your report right now.',
      500,
      rateHeaders
    );
  }
}

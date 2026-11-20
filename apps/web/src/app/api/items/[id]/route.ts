import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import type { ApiErrorResponse } from '@lost-found/shared';
import { auth } from '@/auth';
import {
  getPublicItemById,
  ItemForbiddenError,
  ItemNotFoundError,
  ItemServiceError,
  softDeleteItem,
  updateItem,
} from '@/lib/item-service';
import {
  buildRateLimitHeaders,
  defaultRateLimitStore,
  getClientIdentifier,
} from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const RATE_LIMIT_WINDOW_MS = 60_000;

interface RouteContext {
  params: Promise<{ id: string }>;
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

export async function GET(request: Request, context: RouteContext) {
  const clientId = getClientIdentifier(request.headers);
  const rateLimit = defaultRateLimitStore.consume(`item-detail:${clientId}`, {
    limit: 90,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });
  const rateHeaders = buildRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return errorResponse('RATE_LIMITED', 'Too many requests. Please try again shortly.', 429, rateHeaders);
  }

  try {
    const { id } = await context.params;
    const session = await auth();
    const viewer = session?.user?.id
      ? { id: session.user.id, role: session.user.role }
      : null;

    const item = await getPublicItemById(id, viewer);
    return NextResponse.json(
      { item },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          ...rateHeaders,
        },
      }
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return errorResponse('VALIDATION_ERROR', 'Invalid item identifier.', 400, rateHeaders);
    }
    if (error instanceof ItemNotFoundError) {
      return errorResponse('NOT_FOUND', error.message, 404, rateHeaders);
    }
    if (error instanceof ItemServiceError) {
      return errorResponse('SERVICE_UNAVAILABLE', error.message, 503, rateHeaders);
    }
    return errorResponse('INTERNAL_ERROR', 'Unable to load item details right now.', 500, rateHeaders);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const clientId = getClientIdentifier(request.headers);
  const rateLimit = defaultRateLimitStore.consume(`item-mutate:${clientId}`, {
    limit: 30,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });
  const rateHeaders = buildRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return errorResponse('RATE_LIMITED', 'Too many update requests. Please try again shortly.', 429, rateHeaders);
  }

  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse('UNAUTHORIZED', 'Please sign in to update this item.', 401, rateHeaders);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON.', 400, rateHeaders);
  }

  try {
    const { id } = await context.params;
    const item = await updateItem(
      id,
      { id: session.user.id, role: session.user.role },
      body
    );

    return NextResponse.json(
      { item },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          ...rateHeaders,
        },
      }
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      const firstIssue = error.issues[0]?.message ?? 'Invalid update payload.';
      return errorResponse('VALIDATION_ERROR', firstIssue, 400, rateHeaders);
    }
    if (error instanceof ItemNotFoundError) {
      return errorResponse('NOT_FOUND', error.message, 404, rateHeaders);
    }
    if (error instanceof ItemForbiddenError) {
      return errorResponse('FORBIDDEN', error.message, 403, rateHeaders);
    }
    if (error instanceof ItemServiceError) {
      return errorResponse('SERVICE_UNAVAILABLE', error.message, 503, rateHeaders);
    }
    return errorResponse('INTERNAL_ERROR', 'Unable to update item right now.', 500, rateHeaders);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const clientId = getClientIdentifier(request.headers);
  const rateLimit = defaultRateLimitStore.consume(`item-mutate:${clientId}`, {
    limit: 30,
    windowMs: RATE_LIMIT_WINDOW_MS,
  });
  const rateHeaders = buildRateLimitHeaders(rateLimit);

  if (!rateLimit.allowed) {
    return errorResponse('RATE_LIMITED', 'Too many requests. Please try again shortly.', 429, rateHeaders);
  }

  const session = await auth();
  if (!session?.user?.id) {
    return errorResponse('UNAUTHORIZED', 'Please sign in to delete this item.', 401, rateHeaders);
  }

  try {
    const { id } = await context.params;
    await softDeleteItem(id, { id: session.user.id, role: session.user.role });

    return NextResponse.json(
      { deleted: true },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          ...rateHeaders,
        },
      }
    );
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return errorResponse('VALIDATION_ERROR', 'Invalid item identifier.', 400, rateHeaders);
    }
    if (error instanceof ItemNotFoundError) {
      return errorResponse('NOT_FOUND', error.message, 404, rateHeaders);
    }
    if (error instanceof ItemForbiddenError) {
      return errorResponse('FORBIDDEN', error.message, 403, rateHeaders);
    }
    if (error instanceof ItemServiceError) {
      return errorResponse('SERVICE_UNAVAILABLE', error.message, 503, rateHeaders);
    }
    return errorResponse('INTERNAL_ERROR', 'Unable to delete item right now.', 500, rateHeaders);
  }
}

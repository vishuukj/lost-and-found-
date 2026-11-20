import { NextResponse } from 'next/server';
import type { LivenessCheckResponse } from '@lost-found/shared';

const START_TIME = Date.now();

export const dynamic = 'force-dynamic';

export async function GET() {
  const responseBody: LivenessCheckResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - START_TIME) / 1000),
  };

  return NextResponse.json(responseBody, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

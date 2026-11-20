import { NextResponse } from 'next/server';
import { prisma } from '@lost-found/database';
import type { HealthCheckResponse } from '@lost-found/shared';
import { logger } from '@/lib/logger';

const START_TIME = Date.now();

export const dynamic = 'force-dynamic';

export async function GET() {
  const uptimeSeconds = Math.floor((Date.now() - START_TIME) / 1000);
  const memUsage = process.memoryUsage();

  let dbStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  let dbResponseTimeMs: number | undefined;
  let dbMessage: string | undefined;

  try {
    const start = performance.now();
    // Lightweight ping to MongoDB
    await prisma.$runCommandRaw({ ping: 1 });
    dbResponseTimeMs = Math.round(performance.now() - start);
    dbStatus = 'connected';
  } catch (error: unknown) {
    dbStatus = 'error';
    // Never forward raw DB driver errors or connection strings to public clients
    dbMessage = 'Database connectivity check failed';
    logger.error('Health check database ping failed', { error });
  }

  const isHealthy = dbStatus === 'connected';
  const overallStatus: HealthCheckResponse['status'] = isHealthy ? 'healthy' : 'unhealthy';

  const responseBody: HealthCheckResponse = {
    status: overallStatus,
    version: process.env.npm_package_version || '0.1.0',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: {
        status: dbStatus,
        ...(dbResponseTimeMs !== undefined && { responseTimeMs: dbResponseTimeMs }),
        ...(dbMessage && { message: dbMessage }),
      },
      memory: {
        rssMb: Math.round(memUsage.rss / 1024 / 1024),
        heapUsedMb: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotalMb: Math.round(memUsage.heapTotal / 1024 / 1024),
      },
    },
  };

  return NextResponse.json(responseBody, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}

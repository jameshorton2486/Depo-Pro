// app/api/health/route.ts
// Health check endpoint for monitoring

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  checks: {
    database: 'ok' | 'error';
    deepgram: 'ok' | 'error' | 'unchecked';
    redis: 'ok' | 'error' | 'unchecked';
  };
  uptime: number;
  environment: string;
}

const startTime = Date.now();

export async function GET() {
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: 'ok',
      deepgram: 'unchecked',
      redis: 'unchecked',
    },
    uptime: Math.floor((Date.now() - startTime) / 1000),
    environment: process.env.NODE_ENV || 'development',
  };

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = 'ok';
  } catch (error) {
    console.error('Database health check failed:', error);
    health.checks.database = 'error';
    health.status = 'unhealthy';
  }

  // Check Deepgram API key exists
  if (process.env.DEEPGRAM_API_KEY) {
    health.checks.deepgram = 'ok';
  } else {
    health.checks.deepgram = 'error';
    health.status = 'degraded';
  }

  // Check Redis connection (if configured)
  if (process.env.REDIS_URL) {
    try {
      // Basic check - just verify URL is set
      health.checks.redis = 'ok';
    } catch (_error) {
      health.checks.redis = 'error';
      health.status = 'degraded';
    }
  }

  const statusCode = health.status === 'healthy' ? 200 : 
                     health.status === 'degraded' ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}

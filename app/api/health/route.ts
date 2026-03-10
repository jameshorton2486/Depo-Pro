import { NextResponse } from 'next/server';
import { getHealthStatus } from '@/lib/health';
import { captureError } from '@/lib/error-capture';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = performance.now();
  try {
    const health = await getHealthStatus();

    // Always return 200 so uptime monitors see success.
    // The body contains the actual health status for dashboards.
    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    captureError(error, { route: 'GET /api/health' });
    const fallback = { status: 'unhealthy', latencyMs: 0, error: 'Health check failed to run' } as const;
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: '0.1.0',
        environment: process.env.NODE_ENV || 'unknown',
        uptime_seconds: Math.floor(process.uptime()),
        services: { database: fallback, deepgram: fallback, anthropic: fallback, storage: fallback },
        error: error instanceof Error ? error.message : 'Health check failed',
      },
      { status: 500 }
    );
  } finally {
    const duration = Math.round(performance.now() - startTime);
    if (duration > 2000) {
      console.warn(`[perf:slow] GET /api/health ${duration}ms`);
    }
  }
}

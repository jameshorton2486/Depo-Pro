import { NextResponse } from 'next/server';
import { getHealthStatus } from '@/lib/health';
import { captureError } from '@/lib/error-capture';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = performance.now();
  try {
    const health = await getHealthStatus();

    const statusCode = health.status === 'healthy' ? 200
      : health.status === 'degraded' ? 200
      : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    captureError(error, { route: 'GET /api/health' });
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'unhealthy',
          deepgram: 'unhealthy',
          anthropic: 'unhealthy',
        },
        version: '0.1.0',
        error: error instanceof Error ? error.message : 'Health check failed',
      },
      { status: 503 }
    );
  } finally {
    const duration = Math.round(performance.now() - startTime);
    if (duration > 2000) {
      console.warn(`[perf:slow] GET /api/health ${duration}ms`);
    }
  }
}

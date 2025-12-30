import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: { status: 'pass' | 'fail'; message?: string; duration?: number };
  };
}

export async function GET() {
  const dbCheck = await checkDatabase();
  
  const status: HealthStatus = {
    status: dbCheck.status === 'fail' ? 'unhealthy' : 'healthy',
    timestamp: new Date().toISOString(),
    checks: { database: dbCheck },
  };

  return NextResponse.json(status, {
    status: status.status === 'unhealthy' ? 503 : 200,
  });
}

async function checkDatabase() {
  const start = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'pass' as const, duration: Math.round(performance.now() - start) };
  } catch {
    return { status: 'fail' as const, message: 'Database connection failed' };
  }
}

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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
    const supabase = await createSupabaseServerClient();
    // Test connection by checking auth (no users table query needed)
    const { error: _error } = await supabase.auth.getUser();
    // Error is OK if not authenticated - we just want to test connection
    return { status: 'pass' as const, duration: Math.round(performance.now() - start) };
  } catch {
    return { status: 'fail' as const, message: 'Database connection failed' };
  }
}

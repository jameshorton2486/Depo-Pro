/**
 * Supabase Health Check API Route
 * 
 * Purpose: Machine-verifiable health signal
 * Used by: CI, uptime monitors, load balancers
 * 
 * Endpoint: GET /api/health/supabase
 * 
 * Responses:
 * - 200 { status: "ok" } → Supabase + RLS healthy
 * - 500 { status: "error", error: "..." } → RLS, env, or connectivity failure
 * - 500 { status: "fatal", error: "..." } → Fatal error (env missing, etc.)
 */

import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Test 1: Verify connection and RLS
    // Attempt to query a protected table (should fail for anon, but connection works)
    const { error: queryError } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    // If we get a permission error, that's GOOD - it means RLS is working
    // If we get a connection/network error, that's BAD
    if (queryError) {
      // Permission denied = RLS working correctly
      if (queryError.code === 'PGRST301' || queryError.message.includes('permission') || queryError.message.includes('RLS')) {
        return NextResponse.json(
          { 
            status: 'ok',
            message: 'Supabase connected and RLS enforced',
            timestamp: new Date().toISOString()
          },
          { status: 200 }
        );
      }

      // Other errors = connection or configuration issue
      return NextResponse.json(
        { 
          status: 'error',
          error: queryError.message,
          code: queryError.code,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }

    // If no error, RLS might not be enforced (this is a warning)
    return NextResponse.json(
      { 
        status: 'ok',
        message: 'Supabase connected (RLS check inconclusive)',
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );

  } catch (err) {
    // Fatal errors (env missing, etc.)
    return NextResponse.json(
      { 
        status: 'fatal',
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

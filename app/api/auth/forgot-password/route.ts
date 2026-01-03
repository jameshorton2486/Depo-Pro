// =============================================================================
// FORGOT PASSWORD API
// app/api/auth/forgot-password/route.ts
//
// Handle password reset requests
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/auth/forgot-password
 * Request password reset (stub for v1.0)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists (but don't reveal if they don't - security)
    const user = await db.user.findUnique({
      where: { email },
      select: { id: true },
    });

    // Always return success (don't reveal if email exists)
    // In production, this would:
    // 1. Generate reset token
    // 2. Store token in database with expiration
    // 3. Send email with reset link

    // Log the request for admin visibility
    await db.auditLog.create({
      data: {
        action: 'PASSWORD_RESET_REQUESTED',
        targetType: 'User',
        targetId: user?.id || 'unknown',
        actorUserId: user?.id || null,
        metadata: {
          email,
          timestamp: new Date().toISOString(),
        },
      },
    }).catch(() => {
      // Fire and forget
    });

    return NextResponse.json({
      success: true,
      message: 'If an account exists, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Error handling forgot password:', error);
    // Still return success to not reveal errors
    return NextResponse.json({
      success: true,
      message: 'If an account exists, a reset link has been sent.',
    });
  }
}

// =============================================================================
// CONTACT API
// app/api/contact/route.ts
//
// Handle contact form submissions
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/contact
 * Handle contact form submission
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // For v1.0, log to database (could also send email)
    // In production, you'd integrate with an email service
    await db.auditLog.create({
      data: {
        action: 'CONTACT_FORM_SUBMITTED',
        targetType: 'Contact',
        targetId: 'form',
        actorUserId: null,
        metadata: {
          name,
          email,
          message: message.substring(0, 500), // Limit length
          timestamp: new Date().toISOString(),
        },
      },
    }).catch(() => {
      // Fire and forget - don't block on logging
    });

    // In production, send email notification here
    // await sendEmail({
    //   to: 'support@depo-pro.com',
    //   subject: `Contact Form: ${name}`,
    //   body: `From: ${email}\n\n${message}`,
    // });

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
    });
  } catch (error) {
    console.error('Error handling contact form:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

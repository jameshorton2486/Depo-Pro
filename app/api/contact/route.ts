// =============================================================================
// CONTACT API
// app/api/contact/route.ts
//
// Handle contact form submissions with rate limiting
// =============================================================================

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { headers } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createAuditLog } from '@/lib/supabase/queries/audit';
import { logger } from '@/lib/logger';
import { contactFormSchema } from '@/lib/api/schemas';

// Simple in-memory rate limiting (5 requests per hour per IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, limit: number = 5, windowMs: number = 3600000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= limit) {
    return false;
  }
  
  record.count++;
  return true;
}

/**
 * POST /api/contact
 * Handle contact form submission
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const ip = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';
    
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    let data: z.infer<typeof contactFormSchema>;
    try {
      const body = await request.json();
      data = contactFormSchema.parse(body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 });
      }
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { name, email, message } = data;

    // For v1.0, log to database (could also send email)
    // In production, you'd integrate with an email service
    const supabase = await createSupabaseServerClient();
    await createAuditLog(supabase, {
      actor_user_id: 'system', // Contact form doesn't have a user
      firm_id: null,
      action: 'CONTACT_FORM_SUBMITTED',
      target_type: 'Contact',
      target_id: 'form',
      metadata: {
        name,
        email,
        message: message.substring(0, 500),
        timestamp: new Date().toISOString(),
      },
      ip_address: ip,
    }).catch((error: any) => {
      logger.warn('Failed to write contact audit log', {
        error: error instanceof Error ? error.message : String(error),
      });
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


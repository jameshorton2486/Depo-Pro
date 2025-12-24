import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { forgotPasswordSchema } from '@/lib/validations/user';
import { randomBytes } from 'crypto';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validatedFields = forgotPasswordSchema.safeParse(body);
    if (!validatedFields.success) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const { email } = validatedFields.data;
    const normalizedEmail = email.toLowerCase();

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, firstName: true },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      logger.info('Password reset requested for non-existent email', { email: normalizedEmail });
      return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' });
    }

    // Delete existing tokens for this email
    await db.passwordResetToken.deleteMany({ where: { email: normalizedEmail } });

    // Generate token (1 hour expiry)
    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await db.passwordResetToken.create({
      data: { email: normalizedEmail, token, expires },
    });

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    // Log reset link (replace with email service in production)
    console.log(`\n${'═'.repeat(60)}\nPASSWORD RESET LINK\nTo: ${user.email}\nURL: ${resetUrl}\nExpires: ${expires.toISOString()}\n${'═'.repeat(60)}\n`);

    logger.info('Password reset token generated', { email: normalizedEmail });

    return NextResponse.json({ message: 'If an account exists, a reset link has been sent.' });
  } catch (error) {
    logger.error('Password reset request failed', error as Error);
    return NextResponse.json({ error: 'Failed to process request.' }, { status: 500 });
  }
}


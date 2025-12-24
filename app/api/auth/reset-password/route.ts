import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resetPasswordSchema } from '@/lib/validations/user';
import { hash } from 'bcryptjs';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validatedFields = resetPasswordSchema.safeParse(body);
    if (!validatedFields.success) {
      return NextResponse.json(
        { error: validatedFields.error.issues[0]?.message || 'Invalid input' },
        { status: 400 },
      );
    }

    const { token, password } = validatedFields.data;

    const resetToken = await db.passwordResetToken.findUnique({ where: { token } });

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link. Please request a new one.' },
        { status: 400 },
      );
    }

    if (resetToken.expires < new Date()) {
      await db.passwordResetToken.delete({ where: { token } });
      return NextResponse.json(
        { error: 'Reset link has expired. Please request a new one.' },
        { status: 400 },
      );
    }

    const user = await db.user.findUnique({ where: { email: resetToken.email } });

    if (!user) {
      await db.passwordResetToken.delete({ where: { token } });
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const passwordHash = await hash(password, 12);

    await db.user.update({
      where: { email: resetToken.email },
      data: { passwordHash },
    });

    await db.passwordResetToken.delete({ where: { token } });

    logger.info('Password reset successful', { email: resetToken.email });

    return NextResponse.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    logger.error('Password reset failed', error as Error);
    return NextResponse.json({ error: 'Failed to reset password.' }, { status: 500 });
  }
}


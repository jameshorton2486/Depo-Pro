// ═══════════════════════════════════════════════════════════════
// USER REGISTRATION API ENDPOINT
// ═══════════════════════════════════════════════════════════════
// Handles new user registration and optional firm creation

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { Role } from '@/lib/constants';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, email, passwordHash, role, agencyName } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !passwordHash || !role) {
      logger.warn('Registration attempt with missing fields', {
        hasFirstName: !!firstName,
        hasLastName: !!lastName,
        hasEmail: !!email,
        hasPassword: !!passwordHash,
        hasRole: !!role,
      });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      logger.warn('Registration attempt with existing email', { email });
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 },
      );
    }

    // Create user
    try {
      const user = await db.user.create({
        data: {
          firstName,
          lastName,
          email: email.toLowerCase(),
          passwordHash,
          role: role as Role,
          agencyName: role === 'REPORTER' ? agencyName : undefined,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email,
        role: user.role,
      });

      return NextResponse.json(
        {
          message: 'User registered successfully',
          user,
        },
        { status: 201 },
      );
    } catch (error) {
      logger.error('User creation', error as Error);
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 },
      );
    }
  } catch (error) {
    logger.error('/api/auth/register', error as Error);
    return NextResponse.json(
      { error: 'Failed to register user. Please try again.' },
      { status: 500 },
    );
  }
}

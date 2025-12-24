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
    const { name, email, passwordHash, role, firmName } = body;

    // Validate required fields
    if (!name || !email || !passwordHash || !role) {
      logger.warn('Registration attempt with missing fields', 'Registration', {
        hasName: !!name,
        hasEmail: !!email,
        hasPassword: !!passwordHash,
        hasRole: !!role,
      });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      logger.warn('Registration attempt with existing email', 'Registration', { email });
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    // Create firm if firmName is provided
    let firmId: string | null = null;
    
    if (firmName && firmName.trim()) {
      try {
        const firm = await db.firm.create({
          data: {
            name: firmName.trim(),
            type: 'INDEPENDENT',
            contactEmail: email.toLowerCase(),
          },
        });
        firmId = firm.id;
        logger.info('Firm created during registration', 'Registration', {
          firmId,
          firmName: firmName.trim(),
        });
      } catch (error) {
        logger.dbError('Firm creation', error as Error, { firmName });
        return NextResponse.json(
          { error: 'Failed to create firm' },
          { status: 500 }
        );
      }
    }

    // Create user
    try {
      const user = await db.user.create({
        data: {
          name,
          email: email.toLowerCase(),
          passwordHash,
          role: role as Role,
          firmId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      logger.info('User registered successfully', 'Registration', {
        userId: user.id,
        email: user.email,
        role: user.role,
        firmId,
      });

      return NextResponse.json(
        { 
          message: 'User registered successfully',
          user,
        },
        { status: 201 }
      );
    } catch (error) {
      logger.dbError('User creation', error as Error, { email, role });
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.apiError('/api/auth/register', error as Error);
    return NextResponse.json(
      { error: 'Failed to register user. Please try again.' },
      { status: 500 }
    );
  }
}

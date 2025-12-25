// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3.2.1: ATTORNEY PROFILE API ROUTE
// ═══════════════════════════════════════════════════════════════════════════════
// File: app/api/attorney/profile/route.ts
// Manages attorney profile creation and updates (onboarding)
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

// Validation schema for attorney profile
const attorneyProfileSchema = z.object({
  barNumber: z.string().min(1, 'Bar number is required').optional(),
  barState: z.string().min(2, 'State is required').optional(),
  firmName: z.string().optional(),
  firmAddress: z.string().optional(),
  firmPhone: z.string().optional(),
  practiceAreas: z.array(z.string()).optional().default([]),
  defaultExportFormat: z.enum(['PDF', 'DOCX', 'TXT']).optional().default('PDF'),
  emailNotifications: z.boolean().optional().default(true),
  smsNotifications: z.boolean().optional().default(false),
  billingEmail: z.string().email().optional().nullable(),
  billingAddress: z.string().optional().nullable(),
});

// GET /api/attorney/profile
// Returns the attorney's profile
export async function GET(_request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: {
        attorneyProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'ATTORNEY') {
      return NextResponse.json({ error: 'Attorney access required' }, { status: 403 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
      profile: user.attorneyProfile,
      isProfileComplete: !!user.attorneyProfile?.barNumber,
    });
  } catch (error) {
    console.error('Get attorney profile error:', error);
    return NextResponse.json(
      { error: 'Failed to load profile' },
      { status: 500 }
    );
  }
}

// POST /api/attorney/profile
// Creates attorney profile (onboarding)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { attorneyProfile: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'ATTORNEY') {
      return NextResponse.json({ error: 'Attorney access required' }, { status: 403 });
    }

    // Check if profile already exists
    if (user.attorneyProfile) {
      return NextResponse.json(
        { error: 'Profile already exists. Use PATCH to update.' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validation = attorneyProfileSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Create the profile
    const profile = await db.attorneyProfile.create({
      data: {
        userId: user.id,
        barNumber: data.barNumber,
        barState: data.barState,
        firmName: data.firmName,
        firmAddress: data.firmAddress,
        firmPhone: data.firmPhone,
        practiceAreas: data.practiceAreas,
        defaultExportFormat: data.defaultExportFormat,
        emailNotifications: data.emailNotifications,
        smsNotifications: data.smsNotifications,
        billingEmail: data.billingEmail,
        billingAddress: data.billingAddress,
      },
    });

    return NextResponse.json({
      profile,
      message: 'Profile created successfully',
    }, { status: 201 });
  } catch (error) {
    console.error('Create attorney profile error:', error);
    return NextResponse.json(
      { error: 'Failed to create profile' },
      { status: 500 }
    );
  }
}

// PATCH /api/attorney/profile
// Updates attorney profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { attorneyProfile: true },
    });

    if (!user || user.role !== 'ATTORNEY') {
      return NextResponse.json({ error: 'Attorney access required' }, { status: 403 });
    }

    if (!user.attorneyProfile) {
      return NextResponse.json(
        { error: 'Profile not found. Use POST to create.' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = attorneyProfileSchema.partial().safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Update the profile
    const profile = await db.attorneyProfile.update({
      where: { userId: user.id },
      data: {
        ...(data.barNumber !== undefined && { barNumber: data.barNumber }),
        ...(data.barState !== undefined && { barState: data.barState }),
        ...(data.firmName !== undefined && { firmName: data.firmName }),
        ...(data.firmAddress !== undefined && { firmAddress: data.firmAddress }),
        ...(data.firmPhone !== undefined && { firmPhone: data.firmPhone }),
        ...(data.practiceAreas !== undefined && { practiceAreas: data.practiceAreas }),
        ...(data.defaultExportFormat !== undefined && { defaultExportFormat: data.defaultExportFormat }),
        ...(data.emailNotifications !== undefined && { emailNotifications: data.emailNotifications }),
        ...(data.smsNotifications !== undefined && { smsNotifications: data.smsNotifications }),
        ...(data.billingEmail !== undefined && { billingEmail: data.billingEmail }),
        ...(data.billingAddress !== undefined && { billingAddress: data.billingAddress }),
      },
    });

    return NextResponse.json({
      profile,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update attorney profile error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

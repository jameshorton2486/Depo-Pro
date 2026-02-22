// ═══════════════════════════════════════════════════════════════════════════════
// PHASE 3.2.1: ATTORNEY PROFILE API ROUTE
// ═══════════════════════════════════════════════════════════════════════════════
// File: app/api/attorney/profile/route.ts
// Manages attorney profile creation and updates (onboarding)
// ═══════════════════════════════════════════════════════════════════════════════

import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getUserById } from '@/lib/supabase/queries/users';
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
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    const userData = await getUserById(supabase, currentUser.id);

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRole = userData.user_metadata?.role as string;
    if (userRole !== 'ATTORNEY') {
      return NextResponse.json({ error: 'Attorney access required' }, { status: 403 });
    }

    // Get attorney profile
    const { data: attorneyProfile } = await supabase
      .from('attorney_profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    return NextResponse.json({
      user: {
        id: userData.id,
        firstName: userData.user_metadata?.firstName || '',
        lastName: userData.user_metadata?.lastName || '',
        email: userData.email || '',
        phone: userData.user_metadata?.phone || null,
        role: userRole,
      },
      profile: attorneyProfile,
      isProfileComplete: !!attorneyProfile?.bar_number,
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
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    const userData = await getUserById(supabase, currentUser.id);

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRole = userData.user_metadata?.role as string;
    if (userRole !== 'ATTORNEY') {
      return NextResponse.json({ error: 'Attorney access required' }, { status: 403 });
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('attorney_profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    if (existingProfile) {
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
    const { data: profile, error: profileError } = await supabase
      .from('attorney_profiles')
      .insert({
        user_id: currentUser.id,
        bar_number: data.barNumber || null,
        bar_state: data.barState || null,
        firm_name: data.firmName || null,
        firm_address: data.firmAddress || null,
        firm_phone: data.firmPhone || null,
        practice_areas: data.practiceAreas || [],
        default_export_format: data.defaultExportFormat || 'PDF',
        email_notifications: data.emailNotifications !== false,
        sms_notifications: data.smsNotifications || false,
        billing_email: data.billingEmail || null,
        billing_address: data.billingAddress || null,
      })
      .select()
      .single();

    if (profileError) {
      throw profileError;
    }

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
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseServerClient();
    const userData = await getUserById(supabase, currentUser.id);

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userRole = userData.user_metadata?.role as string;
    if (userRole !== 'ATTORNEY') {
      return NextResponse.json({ error: 'Attorney access required' }, { status: 403 });
    }

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('attorney_profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    if (!existingProfile) {
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

    // Build update object
    const updates: Record<string, any> = {};
    if (data.barNumber !== undefined) updates.bar_number = data.barNumber;
    if (data.barState !== undefined) updates.bar_state = data.barState;
    if (data.firmName !== undefined) updates.firm_name = data.firmName;
    if (data.firmAddress !== undefined) updates.firm_address = data.firmAddress;
    if (data.firmPhone !== undefined) updates.firm_phone = data.firmPhone;
    if (data.practiceAreas !== undefined) updates.practice_areas = data.practiceAreas;
    if (data.defaultExportFormat !== undefined) updates.default_export_format = data.defaultExportFormat;
    if (data.emailNotifications !== undefined) updates.email_notifications = data.emailNotifications;
    if (data.smsNotifications !== undefined) updates.sms_notifications = data.smsNotifications;
    if (data.billingEmail !== undefined) updates.billing_email = data.billingEmail;
    if (data.billingAddress !== undefined) updates.billing_address = data.billingAddress;

    // Update the profile
    const { data: profile, error: updateError } = await supabase
      .from('attorney_profiles')
      .update(updates)
      .eq('user_id', currentUser.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

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


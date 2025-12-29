// ============================================================
// SCHEDULING SUGGESTIONS API
// File: app/api/calendar/suggestions/route.ts
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { canViewSuggestions, canApplySuggestions, SuggestionStatus } from '@/lib/enums-phase5';
import { suggestionEngine } from '@/lib/suggestions/suggestion-engine';
import { z } from 'zod';

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const getSuggestionsSchema = z.object({
  eventType: z.string().optional(),
  requestedStart: z.string().datetime().optional(),
  requestedEnd: z.string().datetime().optional(),
  requestedReporterId: z.string().optional(),
  location: z.string().optional(),
  isRemote: z.boolean().optional(),
  estimatedDuration: z.number().optional(),
});

const applySuggestionSchema = z.object({
  suggestionId: z.string(),
  action: z.enum(['accept', 'reject']),
  reason: z.string().optional(),
});

// ============================================================
// POST - Generate suggestions
// ============================================================

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, firmId: true, role: true },
    });
    
    if (!user?.firmId) {
      return NextResponse.json({ error: 'No firm association' }, { status: 403 });
    }
    
    // Check permission
    if (!canViewSuggestions(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view suggestions' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const validation = getSuggestionsSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }
    
    const data = validation.data;
    const suggestions = [];
    
    // Build context
    const context = {
      firmId: user.firmId,
      eventType: data.eventType,
      requestedStart: data.requestedStart ? new Date(data.requestedStart) : undefined,
      requestedEnd: data.requestedEnd ? new Date(data.requestedEnd) : undefined,
      requestedReporterId: data.requestedReporterId,
      location: data.location,
      isRemote: data.isRemote,
      estimatedDuration: data.estimatedDuration,
    };
    
    // Generate time slot suggestion
    if (context.requestedStart) {
      const timeSuggestion = await suggestionEngine.suggestTimeSlots(context);
      if (timeSuggestion) {
        suggestions.push(timeSuggestion);
      }
    }
    
    // Generate reporter suggestion
    if (context.requestedStart && context.requestedEnd) {
      const reporterSuggestion = await suggestionEngine.suggestReporter(context);
      if (reporterSuggestion) {
        suggestions.push(reporterSuggestion);
      }
    }
    
    // Generate duration suggestion
    if (context.eventType) {
      const durationSuggestion = await suggestionEngine.suggestDuration(context);
      if (durationSuggestion) {
        suggestions.push(durationSuggestion);
      }
    }
    
    return NextResponse.json({
      suggestions,
      generated: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Generate suggestions error:', error);
    return NextResponse.json({ error: 'Failed to generate suggestions' }, { status: 500 });
  }
}

// ============================================================
// PATCH - Apply/reject suggestion
// ============================================================

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, firmId: true, role: true },
    });
    
    if (!user?.firmId) {
      return NextResponse.json({ error: 'No firm association' }, { status: 403 });
    }
    
    // Check permission
    if (!canApplySuggestions(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to apply suggestions' },
        { status: 403 }
      );
    }
    
    const body = await request.json();
    const validation = applySuggestionSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      );
    }
    
    const { suggestionId, action, reason } = validation.data;
    
    // Get suggestion
    const suggestion = await db.schedulingSuggestion.findFirst({
      where: {
        id: suggestionId,
        firmId: user.firmId,
      },
    });
    
    if (!suggestion) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
    }
    
    if (suggestion.status !== SuggestionStatus.PENDING) {
      return NextResponse.json(
        { error: 'Suggestion already processed' },
        { status: 400 }
      );
    }
    
    if (suggestion.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Suggestion expired' }, { status: 400 });
    }
    
    // Apply action
    if (action === 'accept') {
      await suggestionEngine.acceptSuggestion(suggestionId, user.id);
      
      return NextResponse.json({
        message: 'Suggestion accepted',
        suggestion: {
          id: suggestionId,
          status: SuggestionStatus.ACCEPTED,
        },
      });
    } else {
      await suggestionEngine.rejectSuggestion(suggestionId, user.id, reason);
      
      return NextResponse.json({
        message: 'Suggestion rejected',
        suggestion: {
          id: suggestionId,
          status: SuggestionStatus.REJECTED,
        },
      });
    }
    
  } catch (error) {
    console.error('Apply suggestion error:', error);
    return NextResponse.json({ error: 'Failed to apply suggestion' }, { status: 500 });
  }
}

// ============================================================
// GET - Get saved suggestions for an event
// ============================================================

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, firmId: true, role: true },
    });
    
    if (!user?.firmId) {
      return NextResponse.json({ error: 'No firm association' }, { status: 403 });
    }
    
    if (!canViewSuggestions(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view suggestions' },
        { status: 403 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const bookingRequestId = searchParams.get('bookingRequestId');
    const status = searchParams.get('status');
    
    const whereClause: any = {
      firmId: user.firmId,
      expiresAt: { gte: new Date() },
    };
    
    if (eventId) whereClause.eventId = eventId;
    if (bookingRequestId) whereClause.bookingRequestId = bookingRequestId;
    if (status) whereClause.status = status;
    
    const suggestions = await db.schedulingSuggestion.findMany({
      where: whereClause,
      include: {
        suggestedReporter: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    
    return NextResponse.json({ suggestions });
    
  } catch (error) {
    console.error('Get suggestions error:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}

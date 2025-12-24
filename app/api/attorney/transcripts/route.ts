// ═══════════════════════════════════════════════════════════════
// ATTORNEY TRANSCRIPTS API
// ═══════════════════════════════════════════════════════════════
// API routes for attorney transcript management

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Role } from '@/lib/constants';

/**
 * GET /api/attorney/transcripts
 * List all transcripts for the current attorney
 */
export async function GET() {
  try {
    const session = await getCurrentUser();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only attorneys and admins can access
    if (session.user.role !== Role.ATTORNEY && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const transcripts = await db.attorneyTranscript.findMany({
      where: {
        uploadedById: session.user.id,
      },
      orderBy: {
        uploadedAt: 'desc',
      },
      include: {
        annotations: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    return NextResponse.json({ transcripts });
  } catch (error) {
    console.error('Error fetching transcripts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcripts' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/attorney/transcripts
 * Create a new transcript (upload)
 */
export async function POST(request: Request) {
  try {
    const session = await getCurrentUser();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== Role.ATTORNEY && session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, deponent, caseName, depositionDate, transcriptData, totalPages, totalLines } = body;

    // Validate required fields
    if (!name || !deponent || !transcriptData || !totalPages || !totalLines) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 },
      );
    }

    const transcript = await db.attorneyTranscript.create({
      data: {
        name,
        deponent,
        caseName: caseName || null,
        depositionDate: depositionDate ? new Date(depositionDate) : null,
        transcriptData,
        totalPages,
        totalLines,
        uploadedById: session.user.id,
        status: 'NOT_REVIEWED',
      },
    });

    return NextResponse.json({ transcript }, { status: 201 });
  } catch (error) {
    console.error('Error creating transcript:', error);
    return NextResponse.json(
      { error: 'Failed to create transcript' },
      { status: 500 },
    );
  }
}


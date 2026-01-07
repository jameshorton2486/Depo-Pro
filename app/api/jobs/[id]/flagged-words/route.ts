import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

const CONFIDENCE_THRESHOLD = 0.85;

export interface FlaggedWord {
  id: string;
  word: string;
  confidence: number;
  start: number;
  end: number;
  speaker?: number;
  context: string;
  isReviewed: boolean;
  correctedTo?: string;
}

function checkAccess(user: { id: string; role: string }, job: any): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'REPORTER' && job.createdById === user.id) return true;
  if (user.role === 'SCOPIST') {
    return job.assignments.some((a: any) => a.scopistId === user.id && a.status !== 'DECLINED');
  }
  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: jobId } = await params;
    const user = session.user as { id: string; role: string };

    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        createdById: true,
        assignments: { 
          select: { 
            scopistId: true, 
            status: true 
          } 
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Permission: Reporter (own), Scopist (assigned), Admin
    const canAccess = checkAccess(user, job);
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const transcription = await db.transcription.findUnique({
      where: { jobId },
      select: {
        words: true,
        averageConfidence: true,
        edits: { 
          select: { 
            originalText: true, 
            editedText: true, 
            position: true 
          } 
        },
      },
    });

    if (!transcription) {
      return NextResponse.json({ error: 'No transcription' }, { status: 404 });
    }

    const words = (transcription.words as any[]) || [];
    const flaggedWords: FlaggedWord[] = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const confidence = word.confidence ?? 1;

      if (confidence < CONFIDENCE_THRESHOLD) {
        const contextStart = Math.max(0, i - 3);
        const contextEnd = Math.min(words.length, i + 4);
        const context = words.slice(contextStart, contextEnd)
          .map((w: any) => w.punctuated_word || w.word || w.punctuatedWord || '')
          .join(' ');

        const edit = transcription.edits.find(
          (e: any) => Math.abs((e.position || 0) - (word.start || 0)) < 0.1
        );

        flaggedWords.push({
          id: `${jobId}-${i}`,
          word: word.punctuated_word || word.word || word.punctuatedWord || '',
          confidence: Math.round(confidence * 100) / 100,
          start: word.start || 0,
          end: word.end || 0,
          speaker: word.speaker,
          context,
          isReviewed: !!edit,
          correctedTo: edit?.editedText || undefined,
        });
      }
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    const sortBy = searchParams.get('sort');

    let result = flaggedWords;
    if (filter === 'pending') {
      result = result.filter(w => !w.isReviewed);
    } else if (filter === 'reviewed') {
      result = result.filter(w => w.isReviewed);
    }

    if (sortBy === 'confidence') {
      result.sort((a, b) => a.confidence - b.confidence);
    } else if (sortBy === 'speaker') {
      result.sort((a, b) => (a.speaker || 0) - (b.speaker || 0));
    }
    // Default sort by time (start)

    return NextResponse.json({
      flaggedWords: result,
      stats: {
        total: flaggedWords.length,
        pending: flaggedWords.filter(w => !w.isReviewed).length,
        reviewed: flaggedWords.filter(w => w.isReviewed).length,
        averageConfidence: transcription.averageConfidence,
      },
      threshold: CONFIDENCE_THRESHOLD,
    });
  } catch (error) {
    console.error('Error fetching flagged words:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

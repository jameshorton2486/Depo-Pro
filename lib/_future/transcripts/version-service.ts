// =============================================================================
// TRANSCRIPT VERSION SERVICE
// lib/transcripts/version-service.ts
//
// Phase 4B-1: Versioned transcript history with immutable snapshots
// =============================================================================

import { db } from '@/lib/db';

export type VersionType = 'pre_ai' | 'post_ai' | 'edit' | 'final';

export interface VersionDiff {
  fromVersion: number;
  toVersion: number;
  changes: {
    wordIndex: number;
    oldValue: string;
    newValue: string;
  }[];
  added: number;
  removed: number;
  modified: number;
}

/**
 * Create a new transcript version snapshot
 * Phase 4B-1: Immutable snapshots at key lifecycle points
 */
export async function createVersion(
  transcriptionId: string,
  versionType: VersionType,
  userId: string,
  metadata?: Record<string, unknown>
): Promise<{ id: string; version: number }> {
  // Get current transcript
  const transcript = await db.transcription.findUnique({
    where: { id: transcriptionId },
    select: {
      id: true,
      fullTranscript: true,
      words: true,
      wordCount: true,
      flaggedSegments: true,
    },
  });

  if (!transcript) {
    throw new Error('Transcript not found');
  }

  // Get last version number
  // Note: TranscriptVersion model needs to be added to Prisma schema
  // For now, using a workaround with AuditLog to track versions
  // TODO: Add TranscriptVersion model to schema.prisma
  const lastVersion = await db.auditLog.findFirst({
    where: {
      targetType: 'Transcription',
      targetId: transcriptionId,
      action: 'VERSION_CREATED',
    },
    orderBy: { createdAt: 'desc' },
    select: { metadata: true },
  });
  
  let lastVersionNumber = -1;
  if (lastVersion?.metadata && typeof lastVersion.metadata === 'object') {
    const meta = lastVersion.metadata as { version?: number };
    lastVersionNumber = meta.version ?? -1;
  }

  const nextVersion = lastVersionNumber + 1;

  // Count flagged words
  let flaggedCount = 0;
  if (transcript.flaggedSegments) {
    try {
      const segments = Array.isArray(transcript.flaggedSegments)
        ? transcript.flaggedSegments
        : JSON.parse(transcript.flaggedSegments as string);
      flaggedCount = segments.length;
    } catch {
      flaggedCount = 0;
    }
  }

  // Create version snapshot using AuditLog (until TranscriptVersion model is added)
  // Store version data in metadata
  const versionRecord = await db.auditLog.create({
    data: {
      action: 'VERSION_CREATED',
      targetType: 'Transcription',
      targetId: transcriptionId,
      actorUserId: userId,
      metadata: {
        version: nextVersion,
        versionType,
        content: transcript.fullTranscript || '',
        contentJson: transcript.words || {},
        wordCount: transcript.wordCount || 0,
        flaggedCount,
        ...metadata,
      },
    },
  });

  return {
    id: versionRecord.id,
    version: nextVersion,
  };
}

/**
 * Get version diff between two versions
 * Phase 4B-1: Structured diff for version comparison
 */
export async function getVersionDiff(
  transcriptionId: string,
  fromVersion: number,
  toVersion: number
): Promise<VersionDiff> {
  // Get versions from AuditLog (until TranscriptVersion model is added)
  const [fromLog, toLog] = await Promise.all([
    db.auditLog.findFirst({
      where: {
        targetType: 'Transcription',
        targetId: transcriptionId,
        action: 'VERSION_CREATED',
        metadata: {
          path: ['version'],
          equals: fromVersion,
        },
      },
    }),
    db.auditLog.findFirst({
      where: {
        targetType: 'Transcription',
        targetId: transcriptionId,
        action: 'VERSION_CREATED',
        metadata: {
          path: ['version'],
          equals: toVersion,
        },
      },
    }),
  ]);

  if (!fromLog || !toLog) {
    throw new Error('Version not found');
  }

  // Parse content from metadata
  const fromMeta = fromLog.metadata as { content?: string } | null;
  const toMeta = toLog.metadata as { content?: string } | null;
  const fromContent = fromMeta?.content || '';
  const toContent = toMeta?.content || '';

  // Simple word-level diff (can be enhanced with proper diff algorithm)
  const fromWords = fromContent.split(/\s+/);
  const toWords = toContent.split(/\s+/);

  const changes: VersionDiff['changes'] = [];
  const maxLength = Math.max(fromWords.length, toWords.length);

  for (let i = 0; i < maxLength; i++) {
    const oldValue = fromWords[i] || '';
    const newValue = toWords[i] || '';

    if (oldValue !== newValue) {
      changes.push({
        wordIndex: i,
        oldValue,
        newValue,
      });
    }
  }

  return {
    fromVersion,
    toVersion,
    changes,
    added: toWords.length - fromWords.length > 0 ? toWords.length - fromWords.length : 0,
    removed: fromWords.length - toWords.length > 0 ? fromWords.length - toWords.length : 0,
    modified: changes.length,
  };
}

/**
 * Get all versions for a transcript
 */
export async function getVersions(transcriptionId: string) {
  // Get versions from AuditLog (until TranscriptVersion model is added)
  const versionLogs = await db.auditLog.findMany({
    where: {
      targetType: 'Transcription',
      targetId: transcriptionId,
      action: 'VERSION_CREATED',
    },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Transform to version format
  return versionLogs.map((log) => {
    const meta = log.metadata as {
      version?: number;
      versionType?: string;
      wordCount?: number;
      flaggedCount?: number;
      content?: string;
      contentJson?: unknown;
    } | null;

    return {
      id: log.id,
      version: meta?.version ?? 0,
      versionType: meta?.versionType || 'edit',
      content: meta?.content || '',
      contentJson: meta?.contentJson || {},
      wordCount: meta?.wordCount || 0,
      flaggedCount: meta?.flaggedCount || 0,
      createdBy: log.user?.id || log.actorUserId || 'unknown',
      createdAt: log.createdAt,
      metadata: log.metadata,
      creator: log.user || {
        id: log.actorUserId || 'unknown',
        firstName: 'Unknown',
        lastName: '',
        email: '',
      },
    };
  });
}

/**
 * Restore a version (creates new version, doesn't overwrite)
 * Phase 4B-1: Restore creates new version for audit trail
 */
export async function restoreVersion(
  transcriptionId: string,
  versionNumber: number,
  userId: string,
  reason: string
): Promise<{ id: string; version: number }> {
  // Find source version in AuditLog
  const sourceVersion = await db.auditLog.findFirst({
    where: {
      targetType: 'Transcription',
      targetId: transcriptionId,
      action: 'VERSION_CREATED',
      metadata: {
        path: ['version'],
        equals: versionNumber,
      },
    },
  });

  if (!sourceVersion) {
    throw new Error('Version not found');
  }

  // Restore creates a new version, not overwrite
  return createVersion(
    transcriptionId,
    'edit',
    userId,
    {
      restoredFrom: versionNumber,
      reason,
      restoredAt: new Date().toISOString(),
    }
  );
}

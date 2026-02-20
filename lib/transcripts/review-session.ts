type AnyRecord = Record<string, any>;

export function getTranscriptionWords(transcription: {
  words?: unknown;
  tokens?: unknown;
}): any[] {
  if (Array.isArray(transcription.words)) {
    return transcription.words as any[];
  }
  if (Array.isArray(transcription.tokens)) {
    return transcription.tokens as any[];
  }
  return [];
}

function parseObjectLike(value: unknown): AnyRecord {
  if (!value) {
    return {};
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as AnyRecord)
        : {};
    } catch {
      return {};
    }
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as AnyRecord;
  }

  return {};
}

export function getFlaggedSegments(flaggedSegments: unknown): AnyRecord {
  return parseObjectLike(flaggedSegments);
}

export function getReviewSession(flaggedSegments: unknown): AnyRecord | null {
  const parsed = getFlaggedSegments(flaggedSegments);
  const reviewSession = parsed.reviewSession;
  if (!reviewSession || typeof reviewSession !== 'object' || Array.isArray(reviewSession)) {
    return null;
  }
  return reviewSession as AnyRecord;
}

export function mergeReviewSession(
  flaggedSegments: unknown,
  reviewSession: AnyRecord,
): AnyRecord {
  return {
    ...getFlaggedSegments(flaggedSegments),
    reviewSession,
  };
}

export function hasTranscriptReviewAccess(
  transcription: any,
  userId: string,
  userRole: string | null | undefined,
  adminRole: string,
): boolean {
  const createdById = transcription?.job?.createdById || transcription?.job?.created_by_id;
  const isCreator = createdById === userId;
  const isAssignedScopist = Array.isArray(transcription?.job?.assignments)
    && transcription.job.assignments.length > 0;
  const isAdmin = userRole === adminRole;
  return isCreator || isAssignedScopist || isAdmin;
}

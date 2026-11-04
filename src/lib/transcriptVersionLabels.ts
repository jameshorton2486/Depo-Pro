type TranscriptVersionLike = {
  transcript_id: string;
  created_at: string;
};

export function sortTranscriptsByCreatedAt<T extends TranscriptVersionLike>(transcripts: readonly T[]): T[] {
  return [...transcripts].sort((left, right) => {
    const leftTime = Date.parse(left.created_at);
    const rightTime = Date.parse(right.created_at);

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.transcript_id.localeCompare(right.transcript_id);
  });
}

// A case has a single canonical "Deposition Transcript". When more than one
// transcript still exists (e.g. before superseded copies are pruned), the newest
// is the canonical Deposition Transcript and older copies are marked superseded so
// they remain distinguishable in the chooser until cleaned up.
export function buildTranscriptVersionLabels<T extends TranscriptVersionLike>(transcripts: readonly T[]): Map<string, string> {
  const labels = new Map<string, string>();
  const ordered = sortTranscriptsByCreatedAt(transcripts);

  ordered.forEach((transcript, index) => {
    const isCanonical = index === ordered.length - 1;
    labels.set(
      transcript.transcript_id,
      isCanonical ? "Deposition Transcript" : "Deposition Transcript (superseded)",
    );
  });

  return labels;
}

export function getTranscriptVersionLabel<T extends TranscriptVersionLike>(
  transcripts: readonly T[],
  transcriptId: string,
): string {
  return buildTranscriptVersionLabels(transcripts).get(transcriptId) ?? "Deposition Transcript";
}

export function formatTranscriptStatus(status: string): string {
  switch (status) {
    case "queued":
    case "processing":
    case "preprocessing":
    case "transcribing":
    case "assembling":
      return "Processing";
    case "finalizing":
      return "Finalizing";
    case "complete":
    case "completed":
      return "Complete";
    case "needs_manual_review":
      return "Needs Manual Review";
    case "failed":
      return "Failed";
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

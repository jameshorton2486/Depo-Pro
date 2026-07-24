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

export function buildTranscriptVersionLabels<T extends TranscriptVersionLike>(transcripts: readonly T[]): Map<string, string> {
  const labels = new Map<string, string>();

  sortTranscriptsByCreatedAt(transcripts).forEach((transcript, index) => {
    labels.set(
      transcript.transcript_id,
      index === 0 ? "Original" : `Retranscription ${index}`,
    );
  });

  return labels;
}

export function getTranscriptVersionLabel<T extends TranscriptVersionLike>(
  transcripts: readonly T[],
  transcriptId: string,
): string {
  return buildTranscriptVersionLabels(transcripts).get(transcriptId) ?? "Transcript";
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

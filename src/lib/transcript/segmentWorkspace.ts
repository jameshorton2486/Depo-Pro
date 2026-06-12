export interface SegmentWorkspaceRow {
  transcript_id: string;
  sequence_index: number;
  status: string;
}

export interface SegmentWorkspaceSelection<T extends SegmentWorkspaceRow> {
  ordered: T[];
  selected: T | null;
  currentIndex: number;
  previous: T | null;
  next: T | null;
}

export function resolveSegmentWorkspaceSelection<T extends SegmentWorkspaceRow>(
  rows: T[],
  selectedTranscriptId?: string | null,
): SegmentWorkspaceSelection<T> {
  const ordered = rows
    .filter((row) => row.status === "completed")
    .slice()
    .sort((left, right) => left.sequence_index - right.sequence_index);

  if (ordered.length === 0) {
    return {
      ordered,
      selected: null,
      currentIndex: -1,
      previous: null,
      next: null,
    };
  }

  const selected = selectedTranscriptId
    ? ordered.find((row) => row.transcript_id === selectedTranscriptId) ?? ordered[0]
    : ordered[0];
  const currentIndex = ordered.findIndex((row) => row.transcript_id === selected.transcript_id);

  return {
    ordered,
    selected,
    currentIndex,
    previous: currentIndex > 0 ? ordered[currentIndex - 1] : null,
    next: currentIndex >= 0 && currentIndex < ordered.length - 1 ? ordered[currentIndex + 1] : null,
  };
}

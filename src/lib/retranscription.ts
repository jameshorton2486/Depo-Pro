export interface RetranscriptionAuditArtifact {
  kind: "retranscription_requested";
  requested_at: string;
  case_id: string;
  source_audio_id: string | null;
  source_transcript_id: string | null;
  new_transcript_id: string;
}

export function buildRetranscriptionAuditArtifact(input: {
  caseId: string;
  sourceAudioId: string | null;
  sourceTranscriptId: string | null;
  newTranscriptId: string;
  requestedAt?: string;
}): RetranscriptionAuditArtifact {
  return {
    kind: "retranscription_requested",
    requested_at: input.requestedAt ?? new Date().toISOString(),
    case_id: input.caseId,
    source_audio_id: input.sourceAudioId,
    source_transcript_id: input.sourceTranscriptId,
    new_transcript_id: input.newTranscriptId,
  };
}

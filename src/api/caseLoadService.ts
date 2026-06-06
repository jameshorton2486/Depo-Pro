import { loadCase } from "./caseService";
import { listCaseAudio, listCaseFiles, type CaseAudioRecord, type CaseFileRecord } from "./fileService";
import { listFieldProvenance } from "./provenanceService";
import { listTranscriptJobs, type TranscriptJobRow } from "./transcriptRepository";
import type { FieldProvenanceRow } from "../components/conflict/types";
import { normalizeCaseRecord, type CaseRecord } from "../types/case";

// Intake uses this now; workspace, exhibits, and export should restore through
// the same bundle seam instead of re-implementing case/file/audio hydration.
export interface CaseBundle {
  record: CaseRecord;
  files: CaseFileRecord[];
  audio: CaseAudioRecord[];
  transcripts: TranscriptJobRow[];
  provenance: FieldProvenanceRow[];
}

export async function loadCaseBundle(caseId: string): Promise<CaseBundle | null> {
  const [record, files, audio, transcripts, provenance] = await Promise.all([
    loadCase(caseId),
    listCaseFiles(caseId),
    listCaseAudio(caseId),
    listTranscriptJobs(caseId),
    listFieldProvenance(caseId),
  ]);

  if (!record) {
    return null;
  }

  return {
    record: normalizeCaseRecord(record),
    files,
    audio,
    transcripts,
    provenance,
  };
}

import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseClient } from "../lib/supabase";
import { normalizeCaseRecord } from "../lib/normalizeCaseRecord";
import type { Database } from "../types/database";
import { emptyCaseRecord, type CaseRecord } from "../types/case";

type CaseRow = {
  case_id: string;
  proceeding_type: CaseRecord["proceeding_type"];
  stage: CaseRecord["stage"];
  notes: string;
  payload: CaseRecord;
};

type CaseCertificationRow = {
  case_id: string;
};

type CaseStorageRow = {
  storage_path: string | null;
};

type CaseTranscriptIdRow = {
  transcript_id: string;
};

type CaseServiceDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Database["public"]["Tables"] & {
      case_files: {
        Row: {
          case_id: string;
          storage_path: string | null;
        };
        Insert: {
          case_id: string;
          storage_path: string | null;
        };
        Update: {
          case_id?: string;
          storage_path?: string | null;
        };
        Relationships: [];
      };
      transcription_jobs: {
        Row: {
          case_id: string;
        };
        Insert: {
          case_id: string;
        };
        Update: {
          case_id?: string;
        };
        Relationships: [];
      };
      transcript_audit_log: {
        Row: {
          case_id: string;
          transcript_id: string;
        };
        Insert: {
          case_id: string;
          transcript_id: string;
        };
        Update: {
          case_id?: string;
          transcript_id?: string;
        };
        Relationships: [];
      };
    };
  };
};

type CaseIndicatorSummary = {
  hasAudio: boolean;
  hasTranscript: boolean;
  exhibitCount: number;
  certified: boolean;
  speakerMapConfirmed: boolean;
};

export interface CaseBrowserSummary {
  case_id: string;
  stage: CaseRecord["stage"];
  updated_at: string;
  caseName: string;
  caseStyle: string;
  caseNumber: string;
  witnessName: string;
  archived: boolean;
  hasAudio: boolean;
  hasTranscript: boolean;
  exhibitCount: number;
  certified: boolean;
  speakerMapConfirmed: boolean;
}

type MinimalExtractedField = {
  value?: unknown;
};

type MinimalWitness = {
  name?: MinimalExtractedField | null;
};

function getExtendedClient(client: SupabaseClient<Database>): SupabaseClient<CaseServiceDatabase> {
  return client as unknown as SupabaseClient<CaseServiceDatabase>;
}

function toCaseRow(record: CaseRecord): CaseRow {
  return {
    case_id: record.case_id,
    proceeding_type: record.proceeding_type,
    stage: record.stage,
    notes: record.notes,
    payload: record,
  };
}

function withSaveTimestamp(record: CaseRecord, now: string): CaseRecord {
  return {
    ...record,
    updated_at: now,
  };
}

function normalizeIdentityValue(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function getCaseIdentity(record: CaseRecord | unknown): { caseNumber: string; witnessName: string } | null {
  const summary = getSummaryText(record);
  const caseNumber = normalizeIdentityValue(summary.caseNumber);
  const witnessName = normalizeIdentityValue(summary.witnessName);

  if (!caseNumber || !witnessName) {
    return null;
  }

  return { caseNumber, witnessName };
}

async function findMatchingCaseId(
  client: SupabaseClient<Database>,
  record: CaseRecord,
): Promise<string | null> {
  const identity = getCaseIdentity(record);
  if (!identity) {
    return null;
  }

  const { data, error } = await client
    .from("cases")
    .select("case_id, payload")
    .order("updated_at", { ascending: false });

  if (error) {
    throw error;
  }

  for (const row of data ?? []) {
    if (row.case_id === record.case_id || parseArchivedFlag(row.payload)) {
      continue;
    }

    const candidate = getCaseIdentity(row.payload);
    if (!candidate) {
      continue;
    }

    if (candidate.caseNumber === identity.caseNumber && candidate.witnessName === identity.witnessName) {
      return row.case_id;
    }
  }

  return null;
}

async function removeStoragePaths(
  client: SupabaseClient<Database>,
  paths: string[],
): Promise<void> {
  if (paths.length === 0) {
    return;
  }

  const { error } = await client.storage.from("case-files").remove(paths);
  if (error) {
    throw error;
  }
}

async function deleteRowsByTranscriptIds(
  client: SupabaseClient<Database>,
  transcriptIds: string[],
): Promise<void> {
  if (transcriptIds.length === 0) {
    return;
  }

  const operations = await Promise.all([
    client.from("speaker_resolution_current").delete().in("transcript_id", transcriptIds),
    client.from("speaker_resolution_history").delete().in("transcript_id", transcriptIds),
    client.from("transcript_review_state").delete().in("transcript_id", transcriptIds),
    client.from("transcript_suggestions").delete().in("transcript_id", transcriptIds),
    client.from("transcript_words").delete().in("transcript_id", transcriptIds),
    client.from("transcript_utterances").delete().in("transcript_id", transcriptIds),
    client.from("transcript_speakers").delete().in("transcript_id", transcriptIds),
    client.from("transcript_audit_log").delete().in("transcript_id", transcriptIds),
  ]);

  for (const result of operations) {
    if (result.error) {
      throw result.error;
    }
  }
}

async function purgeCaseArtifacts(
  client: SupabaseClient<Database>,
  caseId: string,
  includeCaseRow: boolean,
): Promise<void> {
  const extendedClient = getExtendedClient(client);
  const [fileResult, audioResult, transcriptResult] = await Promise.all([
    extendedClient.from("case_files").select("storage_path").eq("case_id", caseId),
    client.from("case_audio").select("storage_path").eq("case_id", caseId),
    client.from("transcripts").select("transcript_id").eq("case_id", caseId),
  ]);

  if (fileResult.error) throw fileResult.error;
  if (audioResult.error) throw audioResult.error;
  if (transcriptResult.error) throw transcriptResult.error;

  const storagePaths = [
    ...(fileResult.data ?? []),
    ...(audioResult.data ?? []),
  ]
    .map((row) => (row as CaseStorageRow).storage_path)
    .filter((path): path is string => typeof path === "string" && path.length > 0);

  const transcriptIds = (transcriptResult.data ?? []).map((row) => (row as CaseTranscriptIdRow).transcript_id);

  await deleteRowsByTranscriptIds(client, transcriptIds);

  const rowDeletes = await Promise.all([
    client.from("exports").delete().eq("case_id", caseId),
    client.from("case_certifications").delete().eq("case_id", caseId),
    client.from("case_exhibits").delete().eq("case_id", caseId),
    client.from("field_provenance").delete().eq("case_id", caseId),
    extendedClient.from("transcription_jobs").delete().eq("case_id", caseId),
    client.from("transcripts").delete().eq("case_id", caseId),
    extendedClient.from("transcript_audit_log").delete().eq("case_id", caseId),
    extendedClient.from("case_files").delete().eq("case_id", caseId),
    client.from("case_audio").delete().eq("case_id", caseId),
  ]);

  for (const result of rowDeletes) {
    if (result.error) {
      throw result.error;
    }
  }

  await removeStoragePaths(client, storagePaths);

  if (includeCaseRow) {
    const { error } = await client.from("cases").delete().eq("case_id", caseId);
    if (error) {
      throw error;
    }
  }
}

async function reassignCaseArtifacts(
  client: SupabaseClient<Database>,
  sourceCaseId: string,
  targetCaseId: string,
): Promise<void> {
  if (sourceCaseId === targetCaseId) {
    return;
  }

  const extendedClient = getExtendedClient(client);

  const operations = await Promise.all([
    extendedClient.from("case_files").update({ case_id: targetCaseId }).eq("case_id", sourceCaseId),
    client.from("case_audio").update({ case_id: targetCaseId }).eq("case_id", sourceCaseId),
    client.from("field_provenance").update({ case_id: targetCaseId }).eq("case_id", sourceCaseId),
    client.from("case_exhibits").update({ case_id: targetCaseId }).eq("case_id", sourceCaseId),
    client.from("case_certifications").update({ case_id: targetCaseId }).eq("case_id", sourceCaseId),
    client.from("exports").update({ case_id: targetCaseId }).eq("case_id", sourceCaseId),
    extendedClient.from("transcription_jobs").update({ case_id: targetCaseId }).eq("case_id", sourceCaseId),
    client.from("transcripts").update({ case_id: targetCaseId }).eq("case_id", sourceCaseId),
    extendedClient.from("transcript_audit_log").update({ case_id: targetCaseId }).eq("case_id", sourceCaseId),
  ]);

  for (const result of operations) {
    if (result.error) {
      throw result.error;
    }
  }

  const { error } = await client.from("cases").delete().eq("case_id", sourceCaseId);
  if (error) {
    throw error;
  }
}

export function generateCaseId(now = new Date(), random = Math.random()): string {
  const date = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("");
  const suffix = Math.floor(random * 36 ** 6).toString(36).padStart(6, "0");
  return `case_${date}_${suffix}`;
}

export function deriveAccessibleCaseStage(
  stage: CaseRecord["stage"],
  hasAudio: boolean,
  hasTranscript: boolean,
): CaseRecord["stage"] {
  if (hasTranscript) {
    return stage;
  }

  if (stage === "intake" || stage === "creation") {
    return hasAudio ? "creation" : "intake";
  }

  return hasAudio ? "creation" : "intake";
}

export async function saveCase(record: CaseRecord): Promise<CaseRecord> {
  const client = await getSupabaseClient("saveCase");
  const now = new Date().toISOString();
  const existingCaseId = await findMatchingCaseId(client, record);

  if (existingCaseId && existingCaseId !== record.case_id) {
    await purgeCaseArtifacts(client, existingCaseId, false);
    await reassignCaseArtifacts(client, record.case_id, existingCaseId);
  }

  const nextRecord = withSaveTimestamp({
    ...record,
    case_id: existingCaseId ?? record.case_id,
  }, now);
  const { error } = await client
    .from("cases")
    .upsert(toCaseRow(nextRecord), { onConflict: "case_id" });

  if (error) throw error;
  return nextRecord;
}

export async function deleteCase(caseId: string): Promise<void> {
  const client = await getSupabaseClient("deleteCase");
  await purgeCaseArtifacts(client, caseId, true);
}

export async function loadCase(caseId: string): Promise<CaseRecord | null> {
  const client = await getSupabaseClient("loadCase");
  const { data, error } = await client
    .from("cases")
    .select("payload")
    .eq("case_id", caseId)
    .maybeSingle();

  if (error) throw error;
  return data?.payload ? normalizeCaseRecord(data.payload) : null;
}

export async function caseExists(caseId: string): Promise<boolean> {
  const client = await getSupabaseClient("caseExists");
  const { count, error } = await client
    .from("cases")
    .select("case_id", { count: "exact", head: true })
    .eq("case_id", caseId);

  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function createCase(caseId = generateCaseId()): Promise<CaseRecord> {
  const record = emptyCaseRecord(caseId, new Date().toISOString());
  return saveCase(record);
}

function parseArchivedFlag(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  return Boolean((payload as { archived?: unknown }).archived);
}

function readExtractedString(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "";
  }

  const extracted = value as MinimalExtractedField;
  return typeof extracted.value === "string" ? extracted.value : "";
}

function getSummaryText(record: unknown) {
  if (!record || typeof record !== "object") {
    return {
      caseName: "Untitled Case",
      caseStyle: "",
      caseNumber: "",
      witnessName: "",
    };
  }

  const payload = record as {
    caption?: {
      case_name?: MinimalExtractedField | null;
      case_style?: MinimalExtractedField | null;
      case_number?: MinimalExtractedField | null;
    } | null;
    witnesses?: MinimalWitness[] | null;
  };
  const firstWitness = Array.isArray(payload.witnesses) ? payload.witnesses[0] : null;

  return {
    caseName: readExtractedString(payload.caption?.case_name) || "Untitled Case",
    caseStyle: readExtractedString(payload.caption?.case_style),
    caseNumber: readExtractedString(payload.caption?.case_number),
    witnessName: readExtractedString(firstWitness?.name),
  };
}

function summarizeIndicators(
  audioRows: Array<{ case_id: string }>,
  transcriptRows: Array<{ case_id: string; speaker_map_confirmed: boolean }>,
  exhibitRows: Array<{ case_id: string }>,
  certificationRows: CaseCertificationRow[],
): Map<string, CaseIndicatorSummary> {
  const indicators = new Map<string, CaseIndicatorSummary>();

  function ensure(caseId: string): CaseIndicatorSummary {
    const existing = indicators.get(caseId);
    if (existing) {
      return existing;
    }

    const created: CaseIndicatorSummary = {
      hasAudio: false,
      hasTranscript: false,
      exhibitCount: 0,
      certified: false,
      speakerMapConfirmed: true,
    };
    indicators.set(caseId, created);
    return created;
  }

  for (const row of audioRows) {
    ensure(row.case_id).hasAudio = true;
  }

  for (const row of transcriptRows) {
    const summary = ensure(row.case_id);
    summary.hasTranscript = true;
    summary.speakerMapConfirmed = summary.speakerMapConfirmed && row.speaker_map_confirmed;
  }

  for (const row of exhibitRows) {
    ensure(row.case_id).exhibitCount += 1;
  }

  for (const row of certificationRows) {
    ensure(row.case_id).certified = true;
  }

  return indicators;
}

export async function listRecentCases(limit = 25): Promise<CaseBrowserSummary[]> {
  const client = await getSupabaseClient("listRecentCases");
  const { data, error } = await client
    .from("cases")
    .select("case_id, stage, updated_at, payload")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Array<{
    case_id: string;
    stage: CaseRecord["stage"];
    updated_at: string;
    payload: unknown;
  }>;
  const activeRows = rows.filter((row) => !parseArchivedFlag(row.payload));
  const caseIds = activeRows.map((row) => row.case_id);

  if (caseIds.length === 0) {
    return [];
  }

  const [audioResult, transcriptResult, exhibitResult, certificationResult] =
    await Promise.all([
      client.from("case_audio").select("case_id").in("case_id", caseIds),
      client.from("transcripts").select("case_id, speaker_map_confirmed").in("case_id", caseIds),
      client.from("case_exhibits").select("case_id").in("case_id", caseIds),
      client.from("case_certifications").select("case_id").in("case_id", caseIds),
    ]);

  if (audioResult.error) throw audioResult.error;
  if (transcriptResult.error) throw transcriptResult.error;
  if (exhibitResult.error) throw exhibitResult.error;
  if (certificationResult.error) throw certificationResult.error;

  const indicators = summarizeIndicators(
    audioResult.data ?? [],
    transcriptResult.data ?? [],
    exhibitResult.data ?? [],
    (certificationResult.data ?? []) as CaseCertificationRow[],
  );

  return activeRows.map((row) => {
    const summary = getSummaryText(row.payload);
    const indicator = indicators.get(row.case_id) ?? {
      hasAudio: false,
      hasTranscript: false,
      exhibitCount: 0,
      certified: false,
      speakerMapConfirmed: true,
    };

    return {
      case_id: row.case_id,
      stage: deriveAccessibleCaseStage(row.stage, indicator.hasAudio, indicator.hasTranscript),
      updated_at: row.updated_at,
      archived: false,
      caseName: summary.caseName,
      caseStyle: summary.caseStyle,
      caseNumber: summary.caseNumber,
      witnessName: summary.witnessName,
      hasAudio: indicator.hasAudio,
        hasTranscript: indicator.hasTranscript,
        exhibitCount: indicator.exhibitCount,
        certified: indicator.certified,
        speakerMapConfirmed: indicator.speakerMapConfirmed,
      };
  });
}

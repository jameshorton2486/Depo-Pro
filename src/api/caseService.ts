import { getSupabaseClient } from "../lib/supabase";
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

type CaseIndicatorSummary = {
  hasAudio: boolean;
  hasTranscript: boolean;
  exhibitCount: number;
  certified: boolean;
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
}

type MinimalExtractedField = {
  value?: unknown;
};

type MinimalWitness = {
  name?: MinimalExtractedField | null;
};

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

export function generateCaseId(now = new Date(), random = Math.random()): string {
  const date = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
  ].join("");
  const suffix = Math.floor(random * 36 ** 6).toString(36).padStart(6, "0");
  return `case_${date}_${suffix}`;
}

export async function saveCase(record: CaseRecord): Promise<CaseRecord> {
  const client = await getSupabaseClient("saveCase");
  const now = new Date().toISOString();
  const nextRecord = withSaveTimestamp(record, now);
  const { error } = await client
    .from("cases")
    .upsert(toCaseRow(nextRecord), { onConflict: "case_id" });

  if (error) throw error;
  return nextRecord;
}

export async function loadCase(caseId: string): Promise<CaseRecord | null> {
  const client = await getSupabaseClient("loadCase");
  const { data, error } = await client
    .from("cases")
    .select("payload")
    .eq("case_id", caseId)
    .maybeSingle();

  if (error) throw error;
  return (data?.payload as CaseRecord | undefined) ?? null;
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
  transcriptRows: Array<{ case_id: string }>,
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
    };
    indicators.set(caseId, created);
    return created;
  }

  for (const row of audioRows) {
    ensure(row.case_id).hasAudio = true;
  }

  for (const row of transcriptRows) {
    ensure(row.case_id).hasTranscript = true;
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
      client.from("transcripts").select("case_id").in("case_id", caseIds),
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
    };

    return {
      case_id: row.case_id,
      stage: row.stage,
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
    };
  });
}

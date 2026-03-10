import { createAdminClient } from '@/lib/supabase/admin';
import type { PaginatedParagraph, QGCheck, QualityGateResult } from './types';

type SupabaseLike = {
  from: (table: string) => any;
};

export async function runQualityGate(
  transcriptionId: string,
  options?: {
    firmId?: string;
    paragraphs?: PaginatedParagraph[];
    supabase?: SupabaseLike;
  }
): Promise<QualityGateResult> {
  const supabase = options?.supabase ?? createAdminClient();
  const firmId = options?.firmId ?? null;
  const paragraphs = options?.paragraphs ?? [];

  const settled = await Promise.allSettled([
    checkVerifyTags(supabase, transcriptionId, firmId),
    checkSpeakerMapping(supabase, transcriptionId, firmId),
    checkDateConflicts(supabase, transcriptionId, firmId),
    checkCertificationBlock(supabase, transcriptionId),
    checkDeletedWords(supabase, transcriptionId, firmId),
    Promise.resolve(checkScopistNotes(paragraphs)),
    checkExhibitPageNumbers(supabase, transcriptionId, firmId),
    Promise.resolve(checkFontCompliance()),
    Promise.resolve(checkLineLimits(paragraphs)),
    checkLowConfidenceWords(supabase, transcriptionId, firmId),
    Promise.resolve(checkEmDash(paragraphs)),
    Promise.resolve(checkCourtReporterLabel(paragraphs)),
  ]);

  const checks = settled.map((result, index) => {
    if (result.status === 'fulfilled') return result.value;
    return {
      code: `QG-${String(index + 1).padStart(3, '0')}`,
      severity: 'ERROR',
      passed: false,
      message: `Check errored: ${String(result.reason)}`,
    } satisfies QGCheck;
  });

  const errors = checks.filter((check) => !check.passed && String(check.severity).toUpperCase() === 'ERROR');
  const warnings = checks.filter((check) => !check.passed && String(check.severity).toUpperCase() === 'WARNING');

  return {
    passed: errors.length === 0,
    exportBlocked: errors.length > 0,
    checks,
    errors,
    warnings,
    errorCount: errors.length,
    warningCount: warnings.length,
    canExportWithAcknowledgment: errors.length === 0 && warnings.length > 0,
  };
}

async function checkVerifyTags(supabase: SupabaseLike, transcriptionId: string, firmId: string | null): Promise<QGCheck> {
  let query = supabase.from('transcript_flags').select('*', { count: 'exact', head: true }).eq('transcription_id', transcriptionId).eq('flag_type', 'VERIFY').eq('is_resolved', false);
  if (firmId) query = query.eq('firm_id', firmId);
  const { count } = await query;
  return {
    code: 'QG-001',
    severity: 'ERROR',
    passed: !count,
    message: count ? `${count} unresolved [VERIFY] tag(s)` : 'No unresolved VERIFY tags',
  };
}

async function checkSpeakerMapping(supabase: SupabaseLike, transcriptionId: string, firmId: string | null): Promise<QGCheck> {
  let wordQuery = supabase.from('transcript_words').select('speaker_index').eq('transcription_id', transcriptionId).eq('is_deleted', false);
  let assignmentQuery = supabase.from('speaker_assignments').select('speaker_index').eq('transcription_id', transcriptionId);
  if (firmId) {
    wordQuery = wordQuery.eq('firm_id', firmId);
    assignmentQuery = assignmentQuery.eq('firm_id', firmId);
  }

  const [{ data: words }, { data: assignments }] = await Promise.all([wordQuery, assignmentQuery]);
  const assigned = new Set((assignments ?? []).map((item: any) => item.speaker_index));
  const unassigned = [...new Set((words ?? []).map((item: any) => item.speaker_index))].filter((index) => index !== null && index !== undefined && !assigned.has(index));

  return {
    code: 'QG-002',
    severity: 'ERROR',
    passed: unassigned.length === 0,
    message: unassigned.length ? `Speaker(s) ${unassigned.join(', ')} not assigned` : 'All speakers assigned',
  };
}

async function checkDateConflicts(supabase: SupabaseLike, transcriptionId: string, firmId: string | null): Promise<QGCheck> {
  let query = supabase.from('transcript_flags').select('*', { count: 'exact', head: true }).eq('transcription_id', transcriptionId).eq('flag_type', 'DATE_CONFLICT').eq('is_resolved', false);
  if (firmId) query = query.eq('firm_id', firmId);
  const { count } = await query;
  return {
    code: 'QG-003',
    severity: 'ERROR',
    passed: !count,
    message: count ? `${count} date conflict(s) unresolved` : 'No date conflicts',
  };
}

async function checkCertificationBlock(supabase: SupabaseLike, transcriptionId: string): Promise<QGCheck> {
  const { data: transcription } = await supabase.from('transcriptions').select('job_id').eq('id', transcriptionId).single();
  const { data: job } = transcription?.job_id
    ? await supabase.from('jobs').select('reporter_id').eq('id', transcription.job_id).single()
    : { data: null };
  const { data: profile } = job?.reporter_id
    ? await supabase.from('profiles').select('license_number, license_state, certification_body').eq('id', job.reporter_id).single()
    : { data: null };

  const passed = Boolean(profile?.license_number && profile?.license_state);
  return {
    code: 'QG-004',
    severity: 'ERROR',
    passed,
    message: passed ? 'Certification block complete' : 'Reporter license data missing',
  };
}

async function checkDeletedWords(supabase: SupabaseLike, transcriptionId: string, firmId: string | null): Promise<QGCheck> {
  let query = supabase.from('transcript_words').select('*', { count: 'exact', head: true }).eq('transcription_id', transcriptionId).eq('is_deleted', true);
  if (firmId) query = query.eq('firm_id', firmId);
  const { count } = await query;
  return {
    code: 'QG-005',
    severity: 'ERROR',
    passed: !count,
    message: count ? `${count} word(s) marked deleted (verbatim violation)` : 'No deleted words',
  };
}

function checkScopistNotes(paragraphs: PaginatedParagraph[]): QGCheck {
  const found = paragraphs.filter((paragraph) => /\[SCOPIST:/i.test(paragraph.text));
  return {
    code: 'QG-006',
    severity: 'ERROR',
    passed: found.length === 0,
    message: found.length ? `${found.length} [SCOPIST: ...] note(s) in transcript body` : 'No scopist notes in body',
  };
}

async function checkExhibitPageNumbers(supabase: SupabaseLike, transcriptionId: string, firmId: string | null): Promise<QGCheck> {
  let query = supabase.from('exhibit_markers').select('transcript_page').eq('transcription_id', transcriptionId);
  if (firmId) query = query.eq('firm_id', firmId);
  const { data } = await query;
  const missing = (data ?? []).filter((row: any) => !row.transcript_page).length;
  return {
    code: 'QG-007',
    severity: 'ERROR',
    passed: missing === 0,
    message: missing ? `${missing} exhibit(s) missing page numbers` : 'All exhibits have page numbers',
  };
}

function checkFontCompliance(): QGCheck {
  return {
    code: 'QG-008',
    severity: 'WARNING',
    passed: true,
    message: 'Font compliance verified at DOCX assembly',
  };
}

function checkLineLimits(paragraphs: PaginatedParagraph[]): QGCheck {
  const overLimit = paragraphs.filter((paragraph) => paragraph.line_number_end > 25);
  return {
    code: 'QG-009',
    severity: 'WARNING',
    passed: overLimit.length === 0,
    message: overLimit.length ? `${overLimit.length} paragraph(s) exceed 25-line limit` : 'All pages within 25-line limit',
  };
}

async function checkLowConfidenceWords(supabase: SupabaseLike, transcriptionId: string, firmId: string | null): Promise<QGCheck> {
  let query = supabase.from('flagged_words').select('*', { count: 'exact', head: true }).eq('transcription_id', transcriptionId).eq('status', 'PENDING');
  if (firmId) query = query.eq('firm_id', firmId);
  const { count } = await query;
  return {
    code: 'QG-010',
    severity: 'WARNING',
    passed: !count,
    message: count ? `${count} flagged word(s) not yet reviewed` : 'All flagged words reviewed',
  };
}

function checkEmDash(paragraphs: PaginatedParagraph[]): QGCheck {
  const found = paragraphs.filter((paragraph) => /[\u2014\u2013—–]/.test(paragraph.text));
  return {
    code: 'QG-011',
    severity: 'WARNING',
    passed: found.length === 0,
    message: found.length ? `${found.length} em dash(es) in output` : 'No em dashes detected',
  };
}

function checkCourtReporterLabel(paragraphs: PaginatedParagraph[]): QGCheck {
  const found = paragraphs.filter((paragraph) =>
    /THE\s+COURT\s+REPORTER/i.test(paragraph.text) ||
    /THE\s+COURT\s+REPORTER/i.test(paragraph.speaker_label ?? '')
  );

  return {
    code: 'QG-012',
    severity: 'WARNING',
    passed: found.length === 0,
    message: found.length ? `${found.length} "THE COURT REPORTER" occurrence(s) — use "THE REPORTER"` : 'No incorrect reporter labels',
  };
}

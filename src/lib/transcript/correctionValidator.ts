import type { CorrectionAuthority, CorrectionLogEntry } from "./correctionEngines";

export interface ValidationBlock {
  utterance_index: number;
  utterance_id: string;
  block_type: "Q" | "A" | "SP" | "PN" | "HEADER";
  speaker_id: string;
  display_name: string;
  role?: "ATTORNEY" | "WITNESS" | "REPORTER" | "VIDEOGRAPHER" | "INTERPRETER" | "OTHER" | "UNKNOWN";
  text: string;
}

export interface ValidationIssue {
  type: string;
  severity: "ERROR" | "WARNING";
  word_id?: string;
  utterance_index?: number;
  original?: string;
  corrected?: string;
  message: string;
}

export interface ValidationReviewQueueItem {
  kind: "validation_error" | "validation_warning";
  severity: "high" | "medium";
  word_id?: string;
  utterance_index?: number;
  message: string;
}

export interface ValidationResult {
  validation_passed: boolean;
  verbatim_violations: ValidationIssue[];
  consistency_errors: ValidationIssue[];
  contradiction_errors: ValidationIssue[];
  unresolved_flags: ValidationIssue[];
  correction_summary: {
    total_corrections_validated: number;
    total_corrections_approved: number;
    by_authority: Record<string, number>;
  };
  review_queue: ValidationReviewQueueItem[];
  metrics: {
    engine: "correction_validation";
    validation_passed: boolean;
    checks_run: 4;
    errors_found: number;
    warnings_found: number;
    verbatim_violations: number;
    consistency_errors: number;
    evidence_incomplete: number;
    speaker_consistency_violations: number;
    total_corrections_validated: number;
    total_corrections_approved: number;
    flags_added_by_validation: number;
  };
}

const VERBATIM_PROTECTED = new Set([
  "uh", "um", "ah", "er", "uh-huh", "uh-uh", "mm-hmm", "mhmm",
  "yeah", "yep", "yup", "nope", "nah", "so", "well", "like",
  "gonna", "wanna", "kinda", "gotta", "lemme", "y'all",
  "i", "he", "she", "we", "no", "to", "do", "be", "go",
]);

const AUTHORITY_RANK: Record<CorrectionAuthority | "UNKNOWN", number> = {
  CONFIRMED_SPELLING: 3,
  DETERMINISTIC_REGISTRY: 2,
  MEDICAL_DICTIONARY: 2,
  AI_CONTEXTUAL: 1,
  UNKNOWN: 0,
};

function tokenize(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .split(/\s+/)
      .map((token) => token.replace(/^[^a-z0-9$'-]+|[^a-z0-9$'.-]+$/g, ""))
      .filter(Boolean),
  );
}

export function checkVerbatimViolations(correctionLog: CorrectionLogEntry[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const correction of correctionLog) {
    const originalWords = tokenize(correction.original);
    const correctedWords = tokenize(correction.corrected);
    const removed = [...originalWords].filter((word) => !correctedWords.has(word));
    const protectedRemoved = removed.filter((word) => VERBATIM_PROTECTED.has(word));

    if (protectedRemoved.length > 0) {
      issues.push({
        type: "VERBATIM_WORD_REMOVED",
        severity: "ERROR",
        word_id: correction.word_id,
        original: correction.original,
        corrected: correction.corrected,
        message: `Protected verbatim token removed: ${protectedRemoved.join(", ")}`,
      });
    }

    if (/\$[\d,]+(?:\.\d+)?/.test(correction.original) && correction.original !== correction.corrected) {
      issues.push({
        type: "MONEY_AMOUNT_UNCHECKED",
        severity: "WARNING",
        word_id: correction.word_id,
        original: correction.original,
        corrected: correction.corrected,
        message: "Money amount changed without explicit verification flag.",
      });
    }
  }

  return issues;
}

export function checkCorrectionConsistency(correctionLog: CorrectionLogEntry[]): {
  resolvedLog: CorrectionLogEntry[];
  issues: ValidationIssue[];
} {
  const byOriginal = new Map<string, CorrectionLogEntry[]>();
  for (const correction of correctionLog) {
    const key = correction.original.toLowerCase();
    const bucket = byOriginal.get(key) ?? [];
    bucket.push(correction);
    byOriginal.set(key, bucket);
  }

  const issues: ValidationIssue[] = [];
  const resolvedLog: CorrectionLogEntry[] = [];

  for (const entries of byOriginal.values()) {
    const suggestions = new Set(entries.map((entry) => entry.corrected));
    if (suggestions.size <= 1) {
      resolvedLog.push(...entries);
      continue;
    }

    const ranked = [...entries].sort((left, right) => {
      const leftRank = AUTHORITY_RANK[left.authority ?? "UNKNOWN"];
      const rightRank = AUTHORITY_RANK[right.authority ?? "UNKNOWN"];
      return rightRank - leftRank;
    });

    const winner = ranked[0];
    const second = ranked[1];
    const canAutoResolve = winner && second && AUTHORITY_RANK[winner.authority] > AUTHORITY_RANK[second.authority];

    if (!winner || !canAutoResolve) {
      issues.push({
        type: "INCONSISTENT_CORRECTION",
        severity: "ERROR",
        word_id: entries[0]?.word_id,
        original: entries[0]?.original,
        corrected: entries.map((entry) => entry.corrected).join(" | "),
        message: "Conflicting corrections could not be auto-resolved.",
      });
      continue;
    }

    resolvedLog.push(winner);
  }

  return { resolvedLog, issues };
}

export function checkEvidenceCompleteness(correctionLog: CorrectionLogEntry[]): ValidationIssue[] {
  return correctionLog.flatMap((correction) => {
    const missing: string[] = [];
    if (!correction.authority) missing.push("authority");
    if (correction.confidence == null) missing.push("confidence");
    if (!correction.reason) missing.push("reason");
    if (missing.length === 0) {
      return [];
    }
    return [{
      type: "EVIDENCE_INCOMPLETE",
      severity: "WARNING" as const,
      word_id: correction.word_id,
      message: `Missing evidence fields: ${missing.join(", ")}`,
    }];
  });
}

export function checkSpeakerConsistency(correctedBlocks: ValidationBlock[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  for (const block of correctedBlocks) {
    const role = block.role ?? "UNKNOWN";

    if ((block.block_type === "Q" || block.block_type === "A") && role === "REPORTER") {
      issues.push({
        type: "QA_BLOCK_REPORTER",
        severity: "ERROR",
        utterance_index: block.utterance_index,
        message: `Reporter block classified as ${block.block_type}.`,
      });
    }

    if (block.block_type === "Q" && role === "WITNESS") {
      issues.push({
        type: "Q_BLOCK_WITNESS",
        severity: "ERROR",
        utterance_index: block.utterance_index,
        message: "Witness block classified as question.",
      });
    }

    if (block.block_type === "Q" && role !== "ATTORNEY" && role !== "UNKNOWN" && role !== "WITNESS") {
      issues.push({
        type: "Q_BLOCK_NON_ATTORNEY",
        severity: "WARNING",
        utterance_index: block.utterance_index,
        message: `Question block speaker role is ${role}.`,
      });
    }

    if (block.block_type === "A" && role === "ATTORNEY") {
      issues.push({
        type: "A_BLOCK_ATTORNEY",
        severity: "WARNING",
        utterance_index: block.utterance_index,
        message: "Answer block speaker role is attorney.",
      });
    }
  }

  return issues;
}

export function buildResidualReviewQueue(issues: ValidationIssue[]): ValidationReviewQueueItem[] {
  return issues.map((issue) => ({
    kind: issue.severity === "ERROR" ? "validation_error" : "validation_warning",
    severity: issue.severity === "ERROR" ? "high" : "medium",
    word_id: issue.word_id,
    utterance_index: issue.utterance_index,
    message: issue.message,
  }));
}

export function validateCorrections(
  correctedBlocks: ValidationBlock[],
  correctionLog: CorrectionLogEntry[],
): ValidationResult {
  const verbatimIssues = checkVerbatimViolations(correctionLog);
  const consistency = checkCorrectionConsistency(correctionLog);
  const evidenceIssues = checkEvidenceCompleteness(consistency.resolvedLog);
  const speakerIssues = checkSpeakerConsistency(correctedBlocks);
  const allIssues = [...verbatimIssues, ...consistency.issues, ...evidenceIssues, ...speakerIssues];
  const errors = allIssues.filter((issue) => issue.severity === "ERROR");
  const warnings = allIssues.filter((issue) => issue.severity === "WARNING");

  const byAuthority = consistency.resolvedLog.reduce<Record<string, number>>((acc, correction) => {
    acc[correction.authority] = (acc[correction.authority] ?? 0) + 1;
    return acc;
  }, {});

  return {
    validation_passed: errors.length === 0,
    verbatim_violations: verbatimIssues,
    consistency_errors: consistency.issues,
    contradiction_errors: [],
    unresolved_flags: evidenceIssues,
    correction_summary: {
      total_corrections_validated: correctionLog.length,
      total_corrections_approved: consistency.resolvedLog.length,
      by_authority: byAuthority,
    },
    review_queue: buildResidualReviewQueue(allIssues),
    metrics: {
      engine: "correction_validation",
      validation_passed: errors.length === 0,
      checks_run: 4,
      errors_found: errors.length,
      warnings_found: warnings.length,
      verbatim_violations: verbatimIssues.length,
      consistency_errors: consistency.issues.length,
      evidence_incomplete: evidenceIssues.length,
      speaker_consistency_violations: speakerIssues.length,
      total_corrections_validated: correctionLog.length,
      total_corrections_approved: consistency.resolvedLog.length,
      flags_added_by_validation: warnings.length,
    },
  };
}

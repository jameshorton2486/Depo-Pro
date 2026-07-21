import type { EditorialMetrics } from "../transcript/editorialEngine";

/**
 * Stage S validation & repair-burden measurement types.
 *
 * Stage S OWNS transcript validation, quality measurement, repair-burden
 * metrics, final presentation validation, and deterministic Stage S
 * presentation repairs. It does NOT own — and never mutates — the Compiler,
 * Structured Transcript Package, Geometry, Unified Rendering, Editorial, Export
 * Contract, or Formatter Service. Owner attribution below is measurement only.
 */

export type RepairSeverity = "CRITICAL" | "MAJOR" | "MINOR" | "COSMETIC";

export const REPAIR_SEVERITIES: readonly RepairSeverity[] = [
  "CRITICAL",
  "MAJOR",
  "MINOR",
  "COSMETIC",
];

export type RepairCategory =
  | "PARAGRAPH_CONTINUITY"
  | "QA_CONTINUITY"
  | "EXAMINATION_BOUNDARY"
  | "COLLOQUY_TRANSITION"
  | "OBJECTION_PLACEMENT"
  | "PARENTHETICAL_PLACEMENT"
  | "SPEAKER_LABEL"
  | "SECTION_TRANSITION"
  | "HEADING"
  | "SPACING"
  | "INDENT"
  | "MARGIN"
  | "LINE_OVERFLOW"
  | "PAGE_BREAK"
  | "EDITORIAL"
  | "RENDER_PARITY"
  | "EXPORT_CONTRACT";

export const REPAIR_CATEGORIES: readonly RepairCategory[] = [
  "PARAGRAPH_CONTINUITY",
  "QA_CONTINUITY",
  "EXAMINATION_BOUNDARY",
  "COLLOQUY_TRANSITION",
  "OBJECTION_PLACEMENT",
  "PARENTHETICAL_PLACEMENT",
  "SPEAKER_LABEL",
  "SECTION_TRANSITION",
  "HEADING",
  "SPACING",
  "INDENT",
  "MARGIN",
  "LINE_OVERFLOW",
  "PAGE_BREAK",
  "EDITORIAL",
  "RENDER_PARITY",
  "EXPORT_CONTRACT",
];

/** Which pipeline owner a measured repair is attributable to (measurement only). */
export type RepairOwner =
  | "STAGE_S"
  | "COMPILER"
  | "GEOMETRY"
  | "RENDERING"
  | "EDITORIAL"
  | "EXPORT_CONTRACT";

export const REPAIR_OWNERS: readonly RepairOwner[] = [
  "STAGE_S",
  "COMPILER",
  "GEOMETRY",
  "RENDERING",
  "EDITORIAL",
  "EXPORT_CONTRACT",
];

export interface RepairFinding {
  /** Stable, deterministic id (no timestamps / randomness). */
  id: string;
  category: RepairCategory;
  severity: RepairSeverity;
  /** Owner responsible for the underlying issue (measurement, not mutation). */
  owner: RepairOwner;
  paragraphId: string | null;
  paragraphIndex: number | null;
  message: string;
  /**
   * Number of discrete repairs this finding represents. Structural findings are
   * 1; an aggregate finding (e.g. residual editorial corrections) carries the
   * true count so repair-burden totals are not under-reported.
   */
  count: number;
  /**
   * True only for deterministic, semantics-preserving repairs Stage S is
   * permitted to apply itself (presentation-layer only).
   */
  autoRepairable: boolean;
}

export interface RepairBurden {
  /** Total repairs (sum of finding counts), not the number of finding records. */
  total: number;
  /** Number of distinct finding records (issue instances). */
  findingCount: number;
  bySeverity: Record<RepairSeverity, number>;
  byCategory: Record<RepairCategory, number>;
  byOwner: Record<RepairOwner, number>;
  paragraphsAffected: number;
  paragraphsTotal: number;
  /** findings per paragraph. */
  repairDensity: number;
  /** percentage of paragraphs requiring at least one repair (0..100). */
  repairPercentage: number;
}

/** Cross-owner measurements captured without modifying any owner. */
export interface UpstreamMetrics {
  editorial: EditorialMetrics;
  renderParityErrors: string[];
  exportContractValid: boolean;
  exportContractError: string | null;
  pageCount: number;
}

/** A deterministic Stage-S presentation repair that was actually applied. */
export interface AppliedRepair {
  category: RepairCategory;
  description: string;
  count: number;
}

export interface StageSValidationResult {
  fixtureName: string;
  transcriptId: string;
  /** Injected for determinism; never sourced from Date.now() inside the engine. */
  generatedAt: string;
  findings: RepairFinding[];
  burden: RepairBurden;
  upstream: UpstreamMetrics;
  /** 0..1 — paragraphs free of CRITICAL/MAJOR findings ÷ total paragraphs. */
  completeness: number;
  /** True when there are zero CRITICAL findings and all owner contracts hold. */
  pass: boolean;
  appliedRepairs: AppliedRepair[];
  /**
   * The presentation output after Stage-S deterministic repairs were applied.
   * Faithfully exposes what the repair pass produced (not discarded).
   */
  repairedText: string;
}

export interface StageSSuiteResult {
  generatedAt: string;
  contractVersion: string;
  results: StageSValidationResult[];
  aggregate: {
    fixtures: number;
    passing: number;
    failing: number;
    totalRepairs: number;
    burden: RepairBurden;
    /** True only when every fixture passes (RC quality gate). */
    releaseCandidateReady: boolean;
  };
}

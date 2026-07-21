import { applyEditorialRules, applyEditorialRulesToRenderModel, type EditorialMetrics } from "../transcript/editorialEngine";
import { renderTxt, validateRenderParity, type UnifiedRenderModel } from "../transcript/unifiedRendering";
import {
  buildExportServiceRequest,
  EXPORT_SERVICE_CONTRACT_VERSION,
} from "../export/exportServiceContract";

import { applyStageSPresentationRepairs } from "./deterministicRepairs";
import { computeRepairBurden, mergeRepairBurdens } from "./repairBurden";
import { estimatePageCount, STRUCTURAL_VALIDATORS } from "./validators";
import type {
  RepairFinding,
  StageSSuiteResult,
  StageSValidationResult,
  UpstreamMetrics,
} from "./types";

export interface StageSFixture {
  name: string;
  description: string;
  model: UnifiedRenderModel;
}

export interface RunOptions {
  /** Injected generation timestamp for deterministic reports. */
  now?: string;
}

const DEFAULT_GENERATED_AT = "1970-01-01T00:00:00.000Z";

function editorialFindings(model: UnifiedRenderModel): RepairFinding[] {
  const findings: RepairFinding[] = [];
  const entries: [keyof EditorialMetrics, keyof ReturnType<typeof applyEditorialRules>, string][] = [
    ["punctuationCorrections", "punctuationCorrections", "punctuation"],
    ["capitalizationCorrections", "capitalizationCorrections", "capitalization"],
    ["objectionFormattingCorrections", "objectionFormattingCorrections", "objection formatting"],
    ["numberFormattingCorrections", "numberFormattingApplied", "number formatting"],
  ];
  model.lines.forEach((line, paragraphIndex) => {
    const result = applyEditorialRules(line.content);
    for (const [metricKey, resultKey, label] of entries) {
      const count = result[resultKey];
      if (typeof count !== "number" || count === 0) continue;
      findings.push({
        id: `stage-s:EDITORIAL:${metricKey}:${line.paragraphId}`,
        category: "EDITORIAL",
        severity: "MINOR",
        owner: "EDITORIAL",
        paragraphId: line.paragraphId,
        paragraphIndex,
        message: `${count} residual ${label} correction(s) in paragraph ${line.paragraphId}.`,
        count,
        autoRepairable: false,
      });
    }
  });
  return findings;
}

function measureUpstream(model: UnifiedRenderModel): {
  metrics: UpstreamMetrics;
  findings: RepairFinding[];
} {
  const findings: RepairFinding[] = [];

  // Editorial residual (owner #4) — measurement only; the returned model is discarded.
  const editorial = applyEditorialRulesToRenderModel(model);
  findings.push(...editorialFindings(model));

  // Render parity (owner #3).
  const renderParityErrors = validateRenderParity(model);
  renderParityErrors.forEach((message, offset) => {
    findings.push({
      id: `stage-s:RENDER_PARITY:${offset}`,
      category: "RENDER_PARITY",
      severity: "CRITICAL",
      owner: "RENDERING",
      paragraphId: null,
      paragraphIndex: null,
      message,
      count: 1,
      autoRepairable: false,
    });
  });

  // Export contract gate (owner #5) — build+validate; contract validator throws.
  let exportContractValid = true;
  let exportContractError: string | null = null;
  try {
    buildExportServiceRequest({
      renderModel: model,
      formats: ["DOCX", "PDF"],
      idempotencyKey: `${model.transcriptId || "transcript"}:stage-s`,
    });
  } catch (error) {
    exportContractValid = false;
    exportContractError = error instanceof Error ? error.message : String(error);
    findings.push({
      id: "stage-s:EXPORT_CONTRACT:0",
      category: "EXPORT_CONTRACT",
      severity: "CRITICAL",
      owner: "EXPORT_CONTRACT",
      paragraphId: null,
      paragraphIndex: null,
      message: `Export contract rejected the render model: ${exportContractError}`,
      count: 1,
      autoRepairable: false,
    });
  }

  return {
    metrics: {
      editorial: editorial.metrics,
      renderParityErrors,
      exportContractValid,
      exportContractError,
      pageCount: estimatePageCount(model),
    },
    findings,
  };
}

function computeCompleteness(model: UnifiedRenderModel, findings: readonly RepairFinding[]): number {
  const total = model.lines.length;
  if (total === 0) {
    return 1;
  }
  const impaired = new Set<string>();
  for (const finding of findings) {
    if ((finding.severity === "CRITICAL" || finding.severity === "MAJOR") && finding.paragraphId) {
      impaired.add(finding.paragraphId);
    }
  }
  return Math.round(((total - impaired.size) / total) * 10000) / 10000;
}

/** Validate and measure a single render model. Deterministic; mutates nothing. */
export function runStageSValidation(
  fixture: StageSFixture,
  options: RunOptions = {},
): StageSValidationResult {
  const { model } = fixture;
  const findings: RepairFinding[] = [];

  for (const validator of STRUCTURAL_VALIDATORS) {
    findings.push(...validator(model));
  }

  const upstream = measureUpstream(model);
  findings.push(...upstream.findings);

  const burden = computeRepairBurden(findings, model.lines.length);
  const completeness = computeCompleteness(model, findings);
  const hasCritical = burden.bySeverity.CRITICAL > 0;
  const pass = !hasCritical && upstream.metrics.renderParityErrors.length === 0 && upstream.metrics.exportContractValid;

  const presentation = applyStageSPresentationRepairs(renderTxt(model).content);

  return {
    fixtureName: fixture.name,
    transcriptId: model.transcriptId,
    generatedAt: options.now ?? DEFAULT_GENERATED_AT,
    findings,
    burden,
    upstream: upstream.metrics,
    completeness,
    pass,
    appliedRepairs: presentation.repairs,
    repairedText: presentation.text,
  };
}

/** Validate a whole RC fixture suite and produce the aggregate quality gate. */
export function runStageSValidationSuite(
  fixtures: readonly StageSFixture[],
  options: RunOptions = {},
): StageSSuiteResult {
  const now = options.now ?? DEFAULT_GENERATED_AT;
  const results = fixtures.map((fixture) => runStageSValidation(fixture, { now }));
  const burden = mergeRepairBurdens(results.map((result) => result.burden));
  const passing = results.filter((result) => result.pass).length;

  return {
    generatedAt: now,
    contractVersion: EXPORT_SERVICE_CONTRACT_VERSION,
    results,
    aggregate: {
      fixtures: results.length,
      passing,
      failing: results.length - passing,
      totalRepairs: burden.total,
      burden,
      releaseCandidateReady: results.length > 0 && passing === results.length && burden.bySeverity.CRITICAL === 0,
    },
  };
}

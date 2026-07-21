import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { STAGE_S_RC_FIXTURES } from "./fixtures";
import {
  generateMetricsJson,
  generateRepairBurdenReport,
  generateValidationReport,
} from "./reportGenerators";
import type { StageSSuiteResult } from "./types";
import { runStageSValidationSuite } from "./validationEngine";

/**
 * Report-artifact gate + regression baseline.
 *
 * The three committed artifacts under docs/audits/stage-s/ ARE the generated
 * Stage S deliverables. This test regenerates them from the RC fixture suite
 * and asserts the committed files are byte-current. It also treats the metrics
 * JSON as the regression baseline for the whole fixture set.
 *
 * Regenerate after intentional engine/fixture changes:
 *   STAGE_S_WRITE=1 npx vitest run src/lib/stageS/artifacts.test.ts
 * (PowerShell: $env:STAGE_S_WRITE=1; npx vitest run src/lib/stageS/artifacts.test.ts)
 */

const OUTPUT_DIR = join(process.cwd(), "docs", "audits", "stage-s");
const GENERATED_AT = "2026-07-21T00:00:00.000Z";

const ARTIFACTS: { file: string; generate: (suite: StageSSuiteResult) => string }[] = [
  { file: "STAGE_S_VALIDATION_REPORT.md", generate: generateValidationReport },
  { file: "REPAIR_BURDEN_REPORT.md", generate: generateRepairBurdenReport },
  { file: "stage-s-metrics.json", generate: generateMetricsJson },
];

describe("stage S report artifacts", () => {
  const suite = runStageSValidationSuite(STAGE_S_RC_FIXTURES, { now: GENERATED_AT });
  const write = process.env.STAGE_S_WRITE === "1";

  it("keeps the committed reports byte-current with the engine output", () => {
    if (write && !existsSync(OUTPUT_DIR)) {
      mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    for (const artifact of ARTIFACTS) {
      const content = artifact.generate(suite);
      const path = join(OUTPUT_DIR, artifact.file);
      if (write) {
        writeFileSync(path, content, "utf8");
      }
      const committed = readFileSync(path, "utf8");
      expect(committed, `${artifact.file} is stale — regenerate with STAGE_S_WRITE=1`).toBe(content);
    }
  });

  it("uses the committed metrics JSON as the RC regression baseline", () => {
    const committed = JSON.parse(readFileSync(join(OUTPUT_DIR, "stage-s-metrics.json"), "utf8"));
    expect(committed).toEqual(JSON.parse(generateMetricsJson(suite)));
  });
});

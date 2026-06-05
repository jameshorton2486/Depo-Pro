import {
  inferDefendantsFromCaseStyle,
  mapReportingMethod,
  normalizeSideField,
  ensureCountySuffix,
  toISODate,
  toISOTime,
} from "../supabase/functions/extract-nod/normalization.js";

const checks = [
  {
    label: `"April 30, 2026" -> "2026-04-30"`,
    actual: toISODate("April 30, 2026"),
    expected: "2026-04-30",
  },
  {
    label: `"1:30 p.m. Central Time" -> "13:30"`,
    actual: toISOTime("1:30 p.m. Central Time"),
    expected: "13:30",
  },
  {
    label: `stenographic reporting -> "machine_shorthand"`,
    actual: mapReportingMethod("stenographically; may also be recorded by audiovisual means", true, "Zoom"),
    expected: "machine_shorthand",
  },
  {
    label: `"Bexar" -> "Bexar County"`,
    actual: ensureCountySuffix("Bexar"),
    expected: "Bexar County",
  },
  {
    label: `case style fallback -> defendants array`,
    actual: inferDefendantsFromCaseStyle("Delia Garza v. Home Depot U.S.A., Inc. A/K/A The Home Depot and Shawn Herber"),
    expected: ["Home Depot U.S.A., Inc. A/K/A The Home Depot", "Shawn Herber"],
  },
  {
    label: `certificate-of-service firm heuristic -> defense with low-confidence inference`,
    actual: normalizeSideField(
      { value: "", confidence: 0, inferred: false },
      null,
      "Delia Garza",
      ["Home Depot U.S.A., Inc. A/K/A The Home Depot", "Shawn Herber"],
      "Littler Mendelson, P.C.",
      ["cukjati law firm, pllc"],
    ),
    expected: {
      value: "defense",
      confidence: 0.5,
      inferred: true,
    },
  },
];

let failed = false;

for (const check of checks) {
  const pass = JSON.stringify(check.actual) === JSON.stringify(check.expected);
  console.log(`${pass ? "PASS" : "FAIL"} ${check.label}`);
  if (!pass) {
    failed = true;
    console.log(`  expected: ${JSON.stringify(check.expected)}`);
    console.log(`  actual:   ${JSON.stringify(check.actual)}`);
  }
}

if (failed) {
  process.exitCode = 1;
}

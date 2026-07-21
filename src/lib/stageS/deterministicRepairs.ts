import type { AppliedRepair } from "./types";

/**
 * Deterministic Stage-S presentation repairs.
 *
 * SCOPE (per PR #19 brief): Stage S MAY automatically repair ONLY presentation
 * behaviors that are deterministic, belong exclusively to Stage S, do NOT alter
 * transcript semantics, and do NOT modify any upstream owner. These operate on
 * the flattened TXT presentation string produced by `renderTxt` — never on the
 * structured package, geometry, render model, editorial output, or export
 * contract. Word content, ordering, labels, and punctuation are preserved
 * verbatim; only surrounding whitespace/blank-line presentation is normalized.
 */

export interface PresentationRepairResult {
  text: string;
  repairs: AppliedRepair[];
}

/**
 * Normalize presentation whitespace without changing any transcript token:
 *  - strip trailing spaces/tabs at end of each physical line
 *  - collapse 3+ consecutive blank lines down to the canonical single blank
 *    line separating paragraphs
 *  - ensure exactly one trailing newline
 *
 * Idempotent: applying twice yields the same result and reports zero repairs on
 * already-clean input.
 */
export function applyStageSPresentationRepairs(input: string): PresentationRepairResult {
  const repairs: AppliedRepair[] = [];

  const rawLines = input.split("\n");

  let trailingSpaceRepairs = 0;
  const trimmed = rawLines.map((line) => {
    const next = line.replace(/[ \t]+$/, "");
    if (next !== line) {
      trailingSpaceRepairs += 1;
    }
    return next;
  });

  // Collapse runs of 3+ blank lines (paragraphs are separated by exactly one
  // blank line in the canonical TXT layer).
  let blankRunRepairs = 0;
  const collapsed: string[] = [];
  let blankRun = 0;
  for (const line of trimmed) {
    if (line.trim().length === 0) {
      blankRun += 1;
      if (blankRun <= 1) {
        collapsed.push("");
      } else {
        blankRunRepairs += 1;
      }
    } else {
      blankRun = 0;
      collapsed.push(line);
    }
  }

  let text = collapsed.join("\n");

  // Exactly one trailing newline.
  const withoutTrailingBlank = text.replace(/\n+$/, "");
  const normalizedTail = `${withoutTrailingBlank}\n`;
  const tailRepaired = normalizedTail !== text ? 1 : 0;
  text = normalizedTail;

  if (trailingSpaceRepairs > 0) {
    repairs.push({
      category: "SPACING",
      description: "Stripped trailing whitespace from presentation lines.",
      count: trailingSpaceRepairs,
    });
  }
  if (blankRunRepairs > 0) {
    repairs.push({
      category: "SPACING",
      description: "Collapsed redundant blank lines between paragraphs.",
      count: blankRunRepairs,
    });
  }
  if (tailRepaired > 0) {
    repairs.push({
      category: "SPACING",
      description: "Normalized the trailing newline.",
      count: tailRepaired,
    });
  }

  return { text, repairs };
}

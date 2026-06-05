import type { CaseRecord } from "../../types/case";

export type HydrationDecision =
  | { mode: "row"; record: CaseRecord }
  | { mode: "blank" };

export function resolveHydration(record: CaseRecord | null): HydrationDecision {
  if (record) {
    return { mode: "row", record };
  }
  return { mode: "blank" };
}

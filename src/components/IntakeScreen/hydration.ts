import type { CaseBundle } from "../../api/caseLoadService";

export type HydrationDecision =
  | { mode: "row"; bundle: CaseBundle }
  | { mode: "blank" };

export function resolveHydration(bundle: CaseBundle | null): HydrationDecision {
  if (bundle) {
    return { mode: "row", bundle };
  }
  return { mode: "blank" };
}

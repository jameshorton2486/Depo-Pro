import type { DeepgramKeyterm } from "../../types/case";
import { DEEPGRAM_KEYTERM_SOFT_TERM_CAP, DEEPGRAM_KEYTERM_SOFT_TOKEN_CAP, estimateSelectedStoredKeytermTokens } from "../keytermDerivation";
import { readStoredKeytermMeta } from "../keyterms/managedKeyterms";

export interface DeepgramBudgetFitResult {
  keyterms: DeepgramKeyterm[];
  estimatedTokens: number;
  droppedCount: number;
}

function estimateTermTokens(term: string): number {
  return term.trim().split(/\s+/).filter(Boolean).length + 1;
}

export function fitStoredKeytermsToRequestBudget(keyterms: DeepgramKeyterm[]): DeepgramBudgetFitResult {
  const included: DeepgramKeyterm[] = [];
  let estimatedTokens = 0;

  for (const keyterm of keyterms) {
    const meta = readStoredKeytermMeta(keyterm.notes ?? "");
    if (meta.selected === false) {
      continue;
    }

    const termTokens = estimateTermTokens(keyterm.term);
    if (
      included.length + 1 > DEEPGRAM_KEYTERM_SOFT_TERM_CAP
      || estimatedTokens + termTokens > DEEPGRAM_KEYTERM_SOFT_TOKEN_CAP
    ) {
      continue;
    }

    included.push(keyterm);
    estimatedTokens += termTokens;
  }

  return {
    keyterms: included,
    estimatedTokens: estimateSelectedStoredKeytermTokens(included),
    droppedCount: keyterms.length - included.length,
  };
}

import type { RetranscriptionCandidate } from "../../lib/transcript/correctionOrchestrator";

export function buildRetranscriptionClipboardText(
  candidates: RetranscriptionCandidate[],
): string {
  return candidates.map((candidate) => candidate.keyterm).join("\n");
}

export async function copyRetranscriptionKeyterms(
  candidates: RetranscriptionCandidate[],
): Promise<void> {
  await navigator.clipboard.writeText(
    buildRetranscriptionClipboardText(candidates),
  );
}

export function scrollToWord(wordId: string): void {
  const el = document.querySelector<HTMLElement>(`[data-word-id="${wordId}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  el.classList.add("word-conf-focus");
  window.setTimeout(() => el.classList.remove("word-conf-focus"), 1200);
}

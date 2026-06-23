type UtteranceNodeLike = {
  type: { name: string };
  attrs: Record<string, unknown>;
  textContent: string;
  text?: string | null;
  childCount?: number;
  child?: (index: number) => UtteranceNodeLike;
};

type DescendantDocLike = {
  descendants: (cb: (node: UtteranceNodeLike) => void) => void;
};

export type UtteranceFragment = {
  utteranceId: string;
  speakerId: string | null;
  textContent: string;
};

function normalizeUtteranceText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function readNodeText(node: UtteranceNodeLike): string {
  if (
    typeof node.childCount === "number" &&
    node.childCount > 0 &&
    typeof node.child === "function"
  ) {
    let text = "";
    for (let index = 0; index < node.childCount; index += 1) {
      text += readNodeText(node.child(index));
    }
    return text;
  }

  return node.text ?? node.textContent;
}

export function collectUtteranceFragments(doc: DescendantDocLike): UtteranceFragment[] {
  const fragments: UtteranceFragment[] = [];

  doc.descendants((node) => {
    if (node.type.name !== "utterance") {
      return;
    }

    fragments.push({
      utteranceId: String(node.attrs.utterance_id),
      speakerId: typeof node.attrs.speaker_id === "string" ? node.attrs.speaker_id : null,
      textContent: normalizeUtteranceText(readNodeText(node)),
    });
  });

  return fragments;
}

export function reassembleUtteranceTexts(
  fragments: Iterable<UtteranceFragment>
): Map<string, string> {
  const orderedTexts = new Map<string, string[]>();

  for (const fragment of fragments) {
    const parts = orderedTexts.get(fragment.utteranceId) ?? [];
    parts.push(fragment.textContent);
    orderedTexts.set(fragment.utteranceId, parts);
  }

  const texts = new Map<string, string>();
  orderedTexts.forEach((parts, utteranceId) => {
    texts.set(utteranceId, normalizeUtteranceText(parts.join(" ")));
  });

  return texts;
}

export function extractUtteranceTextsFromDoc(doc: DescendantDocLike): Map<string, string> {
  return reassembleUtteranceTexts(collectUtteranceFragments(doc));
}

export function getUtteranceTextFromDoc(doc: DescendantDocLike, utteranceId: string): string {
  return reassembleUtteranceTexts(collectUtteranceFragments(doc)).get(utteranceId) ?? "";
}

export function getActiveUtteranceInfoFromDoc(doc: DescendantDocLike, activeId: string | null) {
  if (!activeId) {
    return {
      activeSpeakerId: null as string | null,
      matchingNodeCount: 0,
      hasMultipleSegments: false,
    };
  }

  let activeSpeakerId: string | null = null;
  let matchingNodeCount = 0;

  collectUtteranceFragments(doc).forEach((fragment) => {
    if (fragment.utteranceId !== activeId) {
      return;
    }

    matchingNodeCount += 1;
    activeSpeakerId = fragment.speakerId;
  });

  return {
    activeSpeakerId,
    matchingNodeCount,
    hasMultipleSegments: matchingNodeCount > 1,
  };
}

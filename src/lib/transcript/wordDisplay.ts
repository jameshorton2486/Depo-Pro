export type WordDisplayLayer = "ai_suggestion" | "working_text" | "raw_text";

export interface WordDisplayResolvable {
  raw_text: string;
  working_text?: string | null;
  ai_suggestion?: string | null;
  ai_suggestion_status?: string | null;
}

export interface ResolvedWordDisplay {
  displayText: string;
  layer: WordDisplayLayer;
  isPending: boolean;
}

export function resolveWordDisplay(word: WordDisplayResolvable): ResolvedWordDisplay {
  if (word.ai_suggestion && word.ai_suggestion_status === "pending") {
    return {
      displayText: word.ai_suggestion,
      layer: "ai_suggestion",
      isPending: true,
    };
  }

  if (word.working_text) {
    return {
      displayText: word.working_text,
      layer: "working_text",
      isPending: false,
    };
  }

  return {
    displayText: word.raw_text,
    layer: "raw_text",
    isPending: false,
  };
}

export function stripInlineFlagSpans(text: string): string {
  return text.replace(/\s*\[SCOPIST:\s*FLAG\s*\d+:[^\]]+\]/g, "");
}

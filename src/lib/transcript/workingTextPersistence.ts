export interface CanonicalUtteranceWord {
  word_id: string;
  raw_text: string;
  working_text?: string | null;
}

export interface WorkingTextWordUpdate {
  wordId: string;
  beforeText: string;
  nextText: string;
  workingText: string | null;
}

export interface WorkingTextPlan {
  utteranceText: string;
  updates: WorkingTextWordUpdate[];
}

export class WorkingTextOverflowError extends Error {
  utteranceId: string;

  constructor(utteranceId: string) {
    super(
      `Edited paragraph exceeds canonical word boundaries for ${utteranceId}. Split the edit across adjacent transcript lines before saving.`,
    );
    this.name = "WorkingTextOverflowError";
    this.utteranceId = utteranceId;
  }
}

function tokenizeWorkingText(workingText: string): string[] {
  return workingText.trim().length > 0
    ? workingText.trim().split(/\s+/)
    : [""];
}

export function planWorkingTextPersistence(
  utteranceId: string,
  words: CanonicalUtteranceWord[],
  workingText: string,
): WorkingTextPlan {
  const tokens = tokenizeWorkingText(workingText);
  if (tokens.length > words.length) {
    throw new WorkingTextOverflowError(utteranceId);
  }

  const updates = words.map((word, index) => {
    const nextText = index < words.length - 1
      ? (tokens[index] ?? "")
      : tokens.slice(index).join(" ");

    return {
      wordId: word.word_id,
      beforeText: word.working_text ?? word.raw_text,
      nextText,
      workingText: nextText === word.raw_text ? null : nextText,
    };
  });

  return {
    utteranceText: updates
      .map((update) => update.nextText)
      .filter((text) => text.length > 0)
      .join(" "),
    updates,
  };
}

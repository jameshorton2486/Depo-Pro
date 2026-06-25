export const COLON_GAP = "  ";

export function normalizeHonorificSpacing(text: string): string {
  return text.replace(/\b(MR|MS|MRS|DR)\.\s+/gi, (_match, honorific: string) => `${honorific.toUpperCase()}. `);
}

export function colloquyLabel(speakerLabel: string): string {
  const base = normalizeHonorificSpacing(speakerLabel).trim().toUpperCase().replace(/:+$/, "");
  return base ? `${base}:` : ":";
}

export function colloquyInlineText(speakerLabel: string, text: string): string {
  const label = colloquyLabel(speakerLabel);
  const body = text.trim();
  return body ? `${label}${COLON_GAP}${body}` : label;
}

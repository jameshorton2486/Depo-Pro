export const COLON_GAP = "  ";

export function colloquyLabel(speakerLabel: string): string {
  const base = speakerLabel.trim().toUpperCase().replace(/:+$/, "");
  return base ? `${base}:` : ":";
}

export function colloquyInlineText(speakerLabel: string, text: string): string {
  const label = colloquyLabel(speakerLabel);
  const body = text.trim();
  return body ? `${label}${COLON_GAP}${body}` : label;
}

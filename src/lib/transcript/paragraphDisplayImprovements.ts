function normalizeSpacedInitialisms(text: string): string {
  return text.replace(/(?:\b[A-Za-z]\.\s*){2,}/g, (match) => {
    const suffix = /\s$/.test(match) ? " " : "";
    return `${match.replace(/\s+/g, "")}${suffix}`;
  });
}

function normalizeHonorificWords(text: string): string {
  return text
    .replace(/\bdoctor (?=[A-Z][a-z])/g, "Dr. ")
    .replace(/\bmister (?=[A-Z][a-z])/g, "Mr. ");
}

function normalizeClockTimes(text: string): string {
  return text.replace(/\b0?(\d{1,2}):(\d{2})\s*([AP])\.?M\.?\b/g, (_match, hour, minute, meridiem) => {
    const normalizedHour = String(Number.parseInt(hour, 10));
    const normalizedMeridiem = String(meridiem).toLowerCase() === "a" ? "a.m." : "p.m.";
    return `${normalizedHour}:${minute} ${normalizedMeridiem}`;
  });
}

export function applyParagraphDisplayImprovements(text: string): string {
  return [
    normalizeSpacedInitialisms,
    normalizeHonorificWords,
    normalizeClockTimes,
  ].reduce((current, transform) => transform(current), text).trim();
}

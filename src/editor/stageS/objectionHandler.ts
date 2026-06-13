export const DASH = "--";

const OBJECTION_MARKERS = [
  "objection",
  "object to",
  "i object",
  "form, vague",
  "vague and ambiguous",
  "calls for speculation",
  "misstates",
  "asked and answered",
  "nonresponsive",
] as const;

export function looksLikeObjection(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return OBJECTION_MARKERS.some((marker) => normalized.startsWith(marker));
}

export function appendInterruptionDash(text: string): [string, boolean] {
  let body = text.trimEnd();
  if (body.endsWith(DASH)) {
    return [body, false];
  }

  while (body.length > 0 && [",", ";", ":"].includes(body[body.length - 1])) {
    body = body.slice(0, -1).trimEnd();
  }

  return [`${body} ${DASH}`, true];
}

export function prependResumptionDash(text: string): [string, boolean] {
  let body = text.trimStart();
  if (body.startsWith(DASH)) {
    return [body, false];
  }

  while (body.length > 0 && [",", ";", ":"].includes(body[0])) {
    body = body.slice(1).trimStart();
  }

  return [`${DASH} ${body}`, true];
}

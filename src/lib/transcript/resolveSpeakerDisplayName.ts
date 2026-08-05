// Single source of truth for a speaker's DISPLAY name.
//
// Ratified decision F9: generic placeholders such as "Speaker 0" are never
// displayed — show a real name, or a role title (THE REPORTER, THE VIDEOGRAPHER,
// THE WITNESS, THE COURT); where neither is known, flag the paragraph for
// reporter assignment.
//
// This module exists to kill a concrete defect: the two speaker-name resolvers
// disagreed on fallback precedence, so the same speaker could render under
// different names by request path —
//   src/api/workspaceService.ts        assigned_name || speaker_label || display_name
//   supabase/functions/editor-api      assigned_name || display_name || speaker_label
// Both now call resolveSpeakerDisplayName, so resolution is identical everywhere.
//
// Pure and dependency-free on purpose: it is imported by both the Vite/TS client
// and the Deno edge function (editor-api already imports from src/ — see
// editor-api/index.ts). Do NOT add runtime-specific imports here.

export interface SpeakerNameFields {
  assigned_name?: string | null;
  display_name?: string | null;
  speaker_label?: string | null;
  role?: string | null;
  speaker_role?: string | null;
}

/**
 * Marker returned when a speaker cannot be identified. It is intentionally a
 * detectable constant (not blank, never a generic "Speaker N") so a consumer can
 * render it as an actionable "assign this speaker" flag (F9). Rendering that flag
 * — and the F10 paragraph-reassignment dropdown — attach at the call sites listed
 * in this PR's description; both are out of scope here.
 */
export const UNIDENTIFIED_SPEAKER = "UNIDENTIFIED SPEAKER";

const ROLE_TITLES: Record<string, string> = {
  reporter: "THE REPORTER",
  videographer: "THE VIDEOGRAPHER",
  witness: "THE WITNESS",
  court: "THE COURT",
};

/**
 * True for a generic diarizer placeholder of the form "Speaker <n>" —
 * case-insensitive, with or without a separator: "Speaker 0", "speaker_1",
 * "SPEAKER-2", "Speaker3". Empty/whitespace is also not a usable display name.
 * One named predicate so the "generic" rule lives in exactly one place (F9).
 */
export function isGenericSpeakerLabel(value: string | null | undefined): boolean {
  if (value == null) return true;
  const trimmed = value.trim();
  if (trimmed === "") return true;
  return /^speaker[\s_-]*\d+$/i.test(trimmed);
}

function roleTitle(...roles: (string | null | undefined)[]): string | null {
  for (const raw of roles) {
    if (!raw) continue;
    // Accept "witness", "Witness", "THE WITNESS", "the_witness" -> THE WITNESS.
    const key = raw.trim().toLowerCase().replace(/^the[\s_-]+/, "");
    if (ROLE_TITLES[key]) return ROLE_TITLES[key];
  }
  return null;
}

/**
 * Resolve a speaker's canonical display name. Resolution order (F9):
 *   1. assigned_name (explicit human assignment), when present and not generic
 *   2. a role title, when the role is one of the four known F9 roles
 *   3. display_name, when present and not generic
 *   4. speaker_label, when present and not generic
 *   5. UNIDENTIFIED_SPEAKER
 * Never returns a generic "Speaker N" placeholder for any input.
 */
export function resolveSpeakerDisplayName(speaker: SpeakerNameFields): string {
  const assigned = speaker.assigned_name?.trim();
  if (assigned && !isGenericSpeakerLabel(assigned)) return assigned;

  const title = roleTitle(speaker.speaker_role, speaker.role);
  if (title) return title;

  const display = speaker.display_name?.trim();
  if (display && !isGenericSpeakerLabel(display)) return display;

  const label = speaker.speaker_label?.trim();
  if (label && !isGenericSpeakerLabel(label)) return label;

  return UNIDENTIFIED_SPEAKER;
}

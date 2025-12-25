/**
 * Enum guardrail: prevents silent enum drift.
 * Any schema enum change must update this file.
 */

export const TRANSCRIPT_ACCESS_LEVELS = [
  'VIEW',
  'COMMENT',
  'EDIT',
] as const;

export type TranscriptAccessLevel =
  (typeof TRANSCRIPT_ACCESS_LEVELS)[number];

export const SHARE_TYPES = [
  'USER',
  'ORGANIZATION',
  'LINK',
] as const;

export type ShareType =
  (typeof SHARE_TYPES)[number];


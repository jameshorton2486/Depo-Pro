// lib/api/schemas.ts
// Shared Zod validation schemas for API routes.
// Import the specific schema you need rather than importing this whole module.

import { z } from 'zod';

// -----------------------------------------------------------------------------
// Transcript — Bookmarks
// -----------------------------------------------------------------------------
export const createBookmarkSchema = z.object({
  lineNumber: z.number().int().min(0),
  label: z.string().max(200).optional(),
});

// -----------------------------------------------------------------------------
// Transcript — Highlights
// -----------------------------------------------------------------------------
export const createHighlightSchema = z.object({
  startIndex: z.number().int().min(0),
  endIndex: z.number().int().min(0),
  color: z.string().max(50).optional(),
  highlightedText: z.string().max(2000).optional(),
  note: z.string().max(1000).optional(),
});

// -----------------------------------------------------------------------------
// Transcript — Notes
// -----------------------------------------------------------------------------
export const createNoteSchema = z.object({
  content: z.string().min(1).max(5000),
  lineNumber: z.number().int().min(0).optional(),
  pageNumber: z.number().int().min(0).optional(),
});

// -----------------------------------------------------------------------------
// Review Sessions
// -----------------------------------------------------------------------------
export const createReviewSessionSchema = z.object({
  transcriptionId: z.string().min(1),
  jobId: z.string().min(1),
  riskScore: z.number().min(0).max(1).optional(),
  flaggedCount: z.number().int().min(0).optional(),
});

// -----------------------------------------------------------------------------
// Contact Form
// -----------------------------------------------------------------------------
export const contactFormSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  email: z.string().email().max(200),
  message: z.string().min(1).max(5000).trim(),
});

// -----------------------------------------------------------------------------
// Flagged Words — PATCH (word correction)
// -----------------------------------------------------------------------------
export const updateFlaggedWordSchema = z.object({
  wordId: z.string().min(1),
  correctedText: z.string().max(500).optional().nullable(),
  expectedUpdatedAt: z.string().min(1),
});

// -----------------------------------------------------------------------------
// Transcript Corrections — POST (save review session)
// -----------------------------------------------------------------------------
export const saveCorrectionsSchema = z.object({
  corrections: z.array(
    z.tuple([z.number().int().min(0), z.string().max(500)])
  ).default([]),
  reviewedWordIndices: z.array(z.number().int().min(0)).default([]),
  lastReviewedIndex: z.number().int().min(0).optional(),
  audioPosition: z.number().min(0).optional(),
  confidenceThreshold: z.number().min(0).max(1).optional(),
  complete: z.boolean().optional(),
  expectedUpdatedAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

// -----------------------------------------------------------------------------
// Transcript Status — PATCH
// -----------------------------------------------------------------------------
export const transcriptStatusSchema = z.object({
  status: z.string().min(1).max(50),
  reason: z.string().max(500).optional(),
});

// -----------------------------------------------------------------------------
// Transcript Unlock — POST
// -----------------------------------------------------------------------------
export const unlockTranscriptSchema = z.object({
  reason: z.string().min(1).max(500).trim(),
});

// -----------------------------------------------------------------------------
// Job Status — PATCH
// -----------------------------------------------------------------------------
export const jobStatusSchema = z.object({
  status: z.enum([
    'CREATED', 'FILES_UPLOADED', 'ENHANCING_AUDIO', 'TRANSCRIBING',
    'AI_REVIEWING', 'READY_FOR_EDIT', 'ASSIGNED', 'IN_EDIT',
    'SUBMITTED_FOR_REVIEW', 'IN_REVIEW', 'COMPLETED', 'CANCELLED',
  ]),
});

// -----------------------------------------------------------------------------
// Proper Noun — POST
// -----------------------------------------------------------------------------
export const properNounSchema = z.object({
  value: z.string().min(1).max(500).trim(),
  category: z.enum([
    'PERSON_NAME', 'COMPANY_NAME', 'PLACE_NAME', 'PRODUCT_NAME',
    'LEGAL_TERM', 'MEDICAL_TERM', 'TECHNICAL_TERM', 'ACRONYM', 'OTHER',
  ]).default('OTHER'),
  phoneticHint: z.string().max(500).optional().nullable(),
  source: z.string().max(100).optional(),
  useInTranscription: z.boolean().default(true),
  priority: z.number().int().min(-100).max(100).default(0),
});

// -----------------------------------------------------------------------------
// Entity Extraction — POST
// -----------------------------------------------------------------------------
export const entityExtractionSchema = z.object({
  jobId: z.string().min(1),
  transcriptionId: z.string().min(1),
  forceReextract: z.boolean().default(false),
});

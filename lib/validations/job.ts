// ═══════════════════════════════════════════════════════════════
// JOB VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════
// Zod schemas for job-related forms and API endpoints

import { z } from 'zod';

// Audio Processing Mode values (matches Prisma enum)
export const AudioProcessingMode = {
  AUTOMATED: 'AUTOMATED',
  MANUAL_RX: 'MANUAL_RX',
} as const;

export type AudioProcessingModeType = typeof AudioProcessingMode[keyof typeof AudioProcessingMode];

/**
 * Valid job status values matching the actual database enum.
 */
export const VALID_JOB_STATUSES = [
  'DRAFT',
  'PENDING',
  'TRANSCRIBING',
  'AI_REVIEWING',
  'READY_FOR_PROOFING',
  'IN_PROOFING',
  'COMPLETE',
  'FAILED',
] as const;

/**
 * Create job schema
 * Used for: Job creation form
 */
export const createJobSchema = z.object({
  // Case details
  title: z
    .string()
    .min(1, 'Title is required')
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters'),
  caseName: z
    .string()
    .min(1, 'Case name is required')
    .max(200, 'Case name must be less than 200 characters'),
  caseNumber: z
    .string()
    .max(100, 'Case number must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  depositionDate: z
    .string()
    .min(1, 'Deposition date is required')
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' }),
  location: z
    .string()
    .max(300, 'Location must be less than 300 characters')
    .optional()
    .or(z.literal('')),
  zoomLink: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),

  // Job metadata
  status: z.enum(VALID_JOB_STATUSES),

  // Audio Processing Mode (Phase 6B)
  // AUTOMATED: Default - Dolby.io enhancement, fast turnaround
  // MANUAL_RX: Premium - iZotope RX forensic enhancement, flat fee $150
  audioProcessingMode: z
    .enum([
      AudioProcessingMode.AUTOMATED,
      AudioProcessingMode.MANUAL_RX,
    ] as const)
    .default(AudioProcessingMode.AUTOMATED)
    .optional(),

  // Notes
  notes: z
    .string()
    .max(5000, 'Notes must be less than 5,000 characters')
    .optional()
    .or(z.literal('')),
  internalNotes: z
    .string()
    .max(5000, 'Internal notes must be less than 5,000 characters')
    .optional()
    .or(z.literal('')),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

/**
 * Job filter schema
 * Used for: Job list filtering and search
 */
export const jobFilterSchema = z.object({
  status: z.enum(VALID_JOB_STATUSES).optional(),
  createdById: z.string().cuid().optional(),
  search: z.string().max(200).optional(),
  depositionDateFrom: z.string().datetime().optional(),
  depositionDateTo: z.string().datetime().optional(),
  rushOrder: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

export type JobFilterInput = z.infer<typeof jobFilterSchema>;

/**
 * Assign scopist schema
 * Used for: Assigning a scopist to a job
 */
export const assignScopistSchema = z.object({
  scopistId: z.string().cuid('Invalid scopist ID'),
  notes: z
    .string()
    .max(1000, 'Notes must be less than 1,000 characters')
    .optional()
    .or(z.literal('')),
});

export type AssignScopistInput = z.infer<typeof assignScopistSchema>;

/**
 * Update assignment schema
 * Used for: Scopist accepting/rejecting assignments
 */
export const updateAssignmentSchema = z.object({
  status: z.enum(['ACCEPTED', 'DECLINED', 'IN_PROGRESS', 'SUBMITTED'] as const),
  notes: z
    .string()
    .max(1000, 'Notes must be less than 1,000 characters')
    .optional()
    .or(z.literal('')),
});

export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;

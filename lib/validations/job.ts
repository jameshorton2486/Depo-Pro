// ═══════════════════════════════════════════════════════════════
// JOB VALIDATION SCHEMAS
// ═══════════════════════════════════════════════════════════════
// Zod schemas for job-related forms and API endpoints

import { z } from 'zod';
import { JobStatus } from '@/lib/constants';

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
    .datetime({ message: 'Invalid date format' }),
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
  status: z.enum([
    JobStatus.CREATED,
    JobStatus.FILES_UPLOADED,
    JobStatus.ENHANCING_AUDIO,
    JobStatus.TRANSCRIBING,
    JobStatus.AI_REVIEWING,
    JobStatus.READY_FOR_EDIT,
    JobStatus.ASSIGNED,
    JobStatus.IN_EDIT,
    JobStatus.SUBMITTED_FOR_REVIEW,
    JobStatus.IN_REVIEW,
    JobStatus.COMPLETED,
    JobStatus.CANCELLED,
  ] as const),
  
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
  status: z.enum([
    JobStatus.CREATED,
    JobStatus.FILES_UPLOADED,
    JobStatus.ENHANCING_AUDIO,
    JobStatus.TRANSCRIBING,
    JobStatus.AI_REVIEWING,
    JobStatus.READY_FOR_EDIT,
    JobStatus.ASSIGNED,
    JobStatus.IN_EDIT,
    JobStatus.SUBMITTED_FOR_REVIEW,
    JobStatus.IN_REVIEW,
    JobStatus.COMPLETED,
    JobStatus.CANCELLED,
  ] as const).optional(),
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

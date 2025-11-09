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
    .max(200, 'Case name must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  caseNumber: z
    .string()
    .max(100, 'Case number must be less than 100 characters')
    .optional()
    .or(z.literal('')),
  court: z
    .string()
    .max(200, 'Court name must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  depoDate: z
    .string()
    .datetime()
    .optional()
    .or(z.literal('')),
  location: z
    .string()
    .max(300, 'Location must be less than 300 characters')
    .optional()
    .or(z.literal('')),
  
  // Job metadata
  totalPages: z
    .number()
    .int('Total pages must be a whole number')
    .positive('Total pages must be positive')
    .max(10000, 'Total pages must be less than 10,000')
    .optional()
    .nullable(),
  rushOrder: z.boolean().default(false),
  difficulty: z
    .number()
    .int('Difficulty must be a whole number')
    .min(1, 'Difficulty must be between 1 and 5')
    .max(5, 'Difficulty must be between 1 and 5')
    .optional()
    .nullable(),
  
  // Client information
  clientName: z
    .string()
    .max(200, 'Client name must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  clientContact: z
    .string()
    .max(200, 'Client contact must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  
  // Notes
  notes: z
    .string()
    .max(5000, 'Notes must be less than 5,000 characters')
    .optional()
    .or(z.literal('')),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;

/**
 * Update job schema
 * Used for: Job editing form
 * Allows updating status and other fields
 */
export const updateJobSchema = createJobSchema.extend({
  status: z.enum([
    JobStatus.DRAFT,
    JobStatus.ASSIGNED,
    JobStatus.IN_PROGRESS,
    JobStatus.COMPLETED,
    JobStatus.BILLED,
    JobStatus.PAID,
  ] as const).optional(),
  completedAt: z.string().datetime().optional().nullable(),
});

export type UpdateJobInput = z.infer<typeof updateJobSchema>;

/**
 * Job filter schema
 * Used for: Job list filtering and search
 */
export const jobFilterSchema = z.object({
  status: z.enum([
    JobStatus.DRAFT,
    JobStatus.ASSIGNED,
    JobStatus.IN_PROGRESS,
    JobStatus.COMPLETED,
    JobStatus.BILLED,
    JobStatus.PAID,
  ] as const).optional(),
  reporterId: z.string().cuid().optional(),
  search: z.string().max(200).optional(),
  depoDateFrom: z.string().datetime().optional(),
  depoDateTo: z.string().datetime().optional(),
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
  status: z.enum(['ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED'] as const),
  notes: z
    .string()
    .max(1000, 'Notes must be less than 1,000 characters')
    .optional()
    .or(z.literal('')),
});

export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;

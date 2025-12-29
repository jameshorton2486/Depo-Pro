// ============================================
// Calendar Validation Schemas
// ============================================

import { z } from 'zod';

// ============================================
// Convert to Job Schema
// ============================================

export const ConvertToJobSchema = z.object({
  includeTranscription: z.boolean().default(true),
  assignToScopist: z.boolean().default(false),
  scopistId: z.string().optional(),
  priority: z.enum(['NORMAL', 'RUSH', 'URGENT']).optional().default('NORMAL'),
  notes: z.string().optional(),
});

export type ConvertToJobInput = z.infer<typeof ConvertToJobSchema>;

// ============================================
// Assign Personnel Schema
// ============================================

export const PersonnelTypeSchema = z.enum([
  'REPORTER',
  'SCOPIST',
  'VIDEOGRAPHER',
  'INTERPRETER',
]);

export const AssignPersonnelSchema = z.object({
  personnelType: PersonnelTypeSchema,
  personnelId: z.string().nullable(), // null = unassign
  notifyAssignee: z.boolean().default(true),
  notes: z.string().optional(),
});

export type AssignPersonnelInput = z.infer<typeof AssignPersonnelSchema>;

// ============================================
// Cancel Event Schema
// ============================================

export const CancelEventSchema = z.object({
  reason: z.string().min(10, 'Cancellation reason must be at least 10 characters'),
  notifyParties: z.boolean().default(true),
});

export type CancelEventInput = z.infer<typeof CancelEventSchema>;

// ============================================
// Reschedule Event Schema
// ============================================

export const RescheduleEventSchema = z.object({
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  reason: z.string().optional(),
  notifyParties: z.boolean().default(true),
  updateLocation: z.boolean().default(false),
  newLocation: z.object({
    isRemote: z.boolean(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    zoomUrl: z.string().url().optional(),
  }).optional(),
}).refine(
  (data) => new Date(data.scheduledEnd) > new Date(data.scheduledStart),
  { message: 'End time must be after start time', path: ['scheduledEnd'] }
);

export type RescheduleEventInput = z.infer<typeof RescheduleEventSchema>;

// ============================================
// Add Note Schema
// ============================================

export const AddNoteSchema = z.object({
  content: z.string().min(1).max(5000),
  isInternal: z.boolean().default(false),
});

export type AddNoteInput = z.infer<typeof AddNoteSchema>;


// ═══════════════════════════════════════════════════════════════
// QUERY LAYER INDEX
// lib/supabase/queries/index.ts
// ═══════════════════════════════════════════════════════════════
// Central export point for all query functions

// Jobs
export {
  getJobById,
  getJobForAccessCheck,
  getJobWithAssignments,
  updateJob,
  updateJobStatus,
  deleteJob,
  listJobs,
  createJob,
} from './jobs';

// Cases
export {
  listCases,
  getCaseById,
} from './cases';

export type { CaseFilter, CaseSort } from './cases';

// Transcripts
export {
  getTranscriptForExport,
  getTranscriptEdits,
} from './transcripts';

// Notes
export {
  listNotesForJob,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
} from './notes';

// Files
export {
  getFileById,
  listFilesForJob,
  createFile,
  updateFile,
  deleteFile,
} from './files';

// Calendar
export {
  listCalendarEvents,
  getCalendarEventById,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from './calendar';

// Admin
export {
  listUsers,
  getUserById,
  updateUserRole,
} from './admin';

// Audit
export {
  createAuditLog,
  listAuditLogs,
} from './audit';

// Users (non-admin user queries)
export * from './users';

// Proper Nouns
export * from './proper-nouns';

// Exhibits
export * from './exhibits';

// Billing
export * from './billing';

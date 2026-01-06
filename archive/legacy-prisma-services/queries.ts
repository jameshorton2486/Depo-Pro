// ═══════════════════════════════════════════════════════════════════════════
// DATABASE QUERY UTILITIES
// ═══════════════════════════════════════════════════════════════════════════
// Type-safe query functions to replace Prisma queries
// This file should be placed at: lib/database/queries.ts

import { createSupabaseServerClient as createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import type {
  User,
  UserWithFirm,
  Job,
  JobWithRelations,
  Transcription,
  TranscriptionWithEdits,
  JobFile,
  JobAssignment,
  Notification,
  JobStatus,
  AssignmentStatus,
} from '@/types/database';

// ═══════════════════════════════════════════════════════════════════════════
// USER QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get user by ID
 * 
 * ⚠️ CRITICAL: This gets user from Supabase Auth, NOT a users table
 * Returns user with profile data from user_metadata
 * 
 * @deprecated Use getUserProfile from @/lib/auth/profile-guard instead
 * This function is kept for backwards compatibility
 */
export async function getUserById(id: string): Promise<User | null> {
  // Get user from Supabase Auth (not a users table)
  const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
  const supabase = getSupabaseAdminClient();
  
  const { data: userData, error } = await supabase.auth.admin.getUserById(id);
  
  if (error || !userData.user) {
    return null;
  }

  const user = userData.user;
  // Return in expected format (from user_metadata)
  return {
    id: user.id,
    email: user.email || '',
    role: (user.user_metadata?.role as any) || 'REPORTER',
    first_name: user.user_metadata?.firstName || '',
    last_name: user.user_metadata?.lastName || '',
    firm_id: null, // Not stored in user_metadata (would need profiles table if needed)
    phone: user.user_metadata?.phone || null,
    timezone: 'America/New_York',
    availability: true,
    specialties: [],
    created_at: user.created_at,
    updated_at: user.updated_at || user.created_at,
  } as User;
}

/**
 * Get user by email
 * 
 * ⚠️ CRITICAL: This gets user from Supabase Auth, NOT a users table
 * 
 * @deprecated Use Supabase Auth admin.listUsers() with filter instead
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  // Get user from Supabase Auth (not a users table)
  const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
  const supabase = getSupabaseAdminClient();
  
  // List users and find by email (Supabase Auth doesn't have direct email lookup in admin API)
  const { data: usersData, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    throw error;
  }

  const user = usersData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
  if (!user) return null;

  // Return in expected format (from user_metadata)
  return {
    id: user.id,
    email: user.email || '',
    role: (user.user_metadata?.role as any) || 'REPORTER',
    first_name: user.user_metadata?.firstName || '',
    last_name: user.user_metadata?.lastName || '',
    firm_id: null,
    phone: user.user_metadata?.phone || null,
    timezone: 'America/New_York',
    availability: true,
    specialties: [],
    created_at: user.created_at,
    updated_at: user.updated_at || user.created_at,
  } as User;
}

/**
 * Get user with firm relation
 * 
 * ⚠️ CRITICAL: This gets user from Supabase Auth user_metadata
 * Firm data would need to be stored in user_metadata or a separate profiles table
 * 
 * @deprecated Use getUserProfile from @/lib/auth/profile-guard instead
 */
export async function getUserWithFirm(id: string): Promise<UserWithFirm | null> {
  // Get user from Supabase Auth
  const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
  const supabase = getSupabaseAdminClient();
  
  const { data: userData, error } = await supabase.auth.admin.getUserById(id);
  
  if (error || !userData.user) {
    return null;
  }

  const user = userData.user;
  // Note: Firm data not available in user_metadata - would need profiles table
  return {
    id: user.id,
    email: user.email || '',
    role: (user.user_metadata?.role as any) || 'REPORTER',
    first_name: user.user_metadata?.firstName || '',
    last_name: user.user_metadata?.lastName || '',
    firm_id: null,
    phone: user.user_metadata?.phone || null,
    timezone: 'America/New_York',
    availability: true,
    specialties: [],
    created_at: user.created_at,
    updated_at: user.updated_at || user.created_at,
    firm: null, // Firm data not in user_metadata
  } as UserWithFirm;
}

/**
 * Get users by firm ID
 * 
 * ⚠️ CRITICAL: Firm data is not stored in user_metadata
 * This function cannot work without a profiles table
 * 
 * @deprecated This requires firm data which is not in user_metadata
 * Consider creating a profiles table if firm filtering is needed
 */
export async function getUsersByFirm(firmId: string): Promise<User[]> {
  // ⚠️ WARNING: Cannot filter by firm_id without a profiles table
  // user_metadata does not support this query pattern
  // Return empty array for now - implement profiles table if needed
  console.warn('getUsersByFirm: Firm filtering requires profiles table, not available in user_metadata');
  return [];
}

/**
 * Get scopists for assignment
 * 
 * ⚠️ CRITICAL: This requires filtering by firm_id and role
 * user_metadata does not support this query pattern
 * 
 * @deprecated This requires a profiles table for firm filtering
 */
export async function getAvailableScopists(firmId: string): Promise<User[]> {
  // ⚠️ WARNING: Cannot filter by firm_id and role without a profiles table
  // Get all users and filter client-side (inefficient but works)
  const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
  const supabase = getSupabaseAdminClient();
  
  const { data: usersData, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;

  // Filter by role in user_metadata (firm filtering not available)
  const scopists = usersData.users
    .filter(u => (u.user_metadata?.role as string) === 'SCOPIST')
    .map(user => ({
      id: user.id,
      email: user.email || '',
      role: 'SCOPIST' as any,
      first_name: user.user_metadata?.firstName || '',
      last_name: user.user_metadata?.lastName || '',
      firm_id: null, // Not available in user_metadata
      phone: user.user_metadata?.phone || null,
      timezone: 'America/New_York',
      availability: true,
      specialties: [],
      created_at: user.created_at,
      updated_at: user.updated_at || user.created_at,
    } as User));

  return scopists;
}

/**
 * Create user profile (after Supabase auth registration)
 * 
 * ⚠️ CRITICAL: This updates user_metadata, NOT a users table
 * Supabase Auth already has the user - we just set metadata
 * 
 * @deprecated Use ensureUserProfile from @/lib/auth/profile-guard instead
 * This function is kept for backwards compatibility but should not create User table records
 */
export async function createUserProfile(
  userId: string,
  data: {
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    firmId?: string;
    phone?: string;
  }
): Promise<User> {
  // Use Admin API to update user_metadata (not a users table)
  const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
  const supabase = getSupabaseAdminClient();
  
  const { data: updatedUser, error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      agencyName: null,
      phone: data.phone || null,
    },
  });

  if (error) throw error;
  
  // Return user in the expected format (from user_metadata)
  const user = updatedUser.user;
  return {
    id: user.id,
    email: user.email || data.email,
    role: (user.user_metadata?.role as any) || data.role,
    first_name: user.user_metadata?.firstName || data.firstName,
    last_name: user.user_metadata?.lastName || data.lastName,
    firm_id: data.firmId || null,
    phone: user.user_metadata?.phone || data.phone || null,
    timezone: 'America/New_York',
    availability: true,
    specialties: [],
    created_at: user.created_at,
    updated_at: user.updated_at || user.created_at,
  } as User;
}

/**
 * Update user profile
 * 
 * ⚠️ CRITICAL: This updates user_metadata, NOT a users table
 * 
 * @deprecated Use ensureUserProfile from @/lib/auth/profile-guard instead
 */
export async function updateUser(
  id: string,
  data: Partial<Omit<User, 'id' | 'created_at'>>
): Promise<User> {
  // Update user_metadata via Admin API
  const { getSupabaseAdminClient } = await import('@/lib/supabase/admin');
  const supabase = getSupabaseAdminClient();
  
  // Get current user
  const { data: currentUserData, error: getUserError } = await supabase.auth.admin.getUserById(id);
  if (getUserError || !currentUserData.user) {
    throw new Error('User not found');
  }

  // Build updated metadata (convert snake_case to camelCase)
  const currentMetadata = currentUserData.user.user_metadata || {};
  const updatedMetadata: Record<string, unknown> = { ...currentMetadata };

  if (data.first_name !== undefined) updatedMetadata.firstName = data.first_name;
  if (data.last_name !== undefined) updatedMetadata.lastName = data.last_name;
  if (data.role !== undefined) updatedMetadata.role = data.role;
  if (data.phone !== undefined) updatedMetadata.phone = data.phone;
  // Note: firm_id, availability, etc. not stored in user_metadata

  const { data: updatedUserData, error } = await supabase.auth.admin.updateUserById(id, {
    user_metadata: updatedMetadata,
  });

  if (error) throw error;

  const user = updatedUserData.user;
  return {
    id: user.id,
    email: user.email || '',
    role: (user.user_metadata?.role as any) || 'REPORTER',
    first_name: user.user_metadata?.firstName || '',
    last_name: user.user_metadata?.lastName || '',
    firm_id: null,
    phone: user.user_metadata?.phone || null,
    timezone: 'America/New_York',
    availability: true,
    specialties: [],
    created_at: user.created_at,
    updated_at: user.updated_at || user.created_at,
  } as User;
}

// ═══════════════════════════════════════════════════════════════════════════
// JOB QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get job by ID with relations
 * Replaces: db.job.findUnique({ where: { id }, include: {...} })
 */
export async function getJobById(id: string): Promise<JobWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('jobs')
    .select(`
      *,
      created_by:users!jobs_created_by_id_fkey(*),
      firm:firms(*),
      files:job_files(*),
      transcription:transcriptions(*),
      assignments:job_assignments(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as JobWithRelations;
}

/**
 * Get jobs by firm with pagination
 * Replaces: db.job.findMany({ where: { firmId }, skip, take, orderBy })
 */
export async function getJobsByFirm(
  firmId: string,
  options: {
    page?: number;
    limit?: number;
    status?: JobStatus;
    search?: string;
  } = {}
): Promise<{ jobs: Job[]; total: number }> {
  const { page = 1, limit = 20, status, search } = options;
  const offset = (page - 1) * limit;

  const supabase = await createClient();
  let query = supabase
    .from('jobs')
    .select('*', { count: 'exact' })
    .eq('firm_id', firmId)
    .is('deleted_at', null);

  if (status) {
    query = query.eq('status', status);
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,case_name.ilike.%${search}%`);
  }

  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { jobs: data || [], total: count || 0 };
}

/**
 * Get jobs assigned to scopist
 * Replaces: db.job.findMany({ where: { scopistId } })
 */
export async function getJobsByScopist(scopistId: string): Promise<Job[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('scopist_id', scopistId)
    .is('deleted_at', null)
    .order('due_date', { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data || [];
}

/**
 * Get jobs created by reporter
 * Replaces: db.job.findMany({ where: { createdById } })
 */
export async function getJobsByReporter(reporterId: string): Promise<Job[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('created_by_id', reporterId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Create new job
 * Replaces: db.job.create({ data: {...} })
 */
export async function createJob(data: {
  title: string;
  caseName: string;
  caseNumber?: string;
  depositionDate: Date;
  createdById: string;
  firmId?: string;
  location?: string;
  notes?: string;
}): Promise<Job> {
  const supabase = await createClient();
  const { data: job, error } = await supabase
    .from('jobs')
    .insert({
      title: data.title,
      case_name: data.caseName,
      case_number: data.caseNumber || null,
      deposition_date: data.depositionDate.toISOString(),
      created_by_id: data.createdById,
      firm_id: data.firmId || null,
      location: data.location || null,
      notes: data.notes || null,
      status: 'CREATED',
      audio_processing_mode: 'AUTOMATED',
      asr_model_tier: 'STANDARD',
    })
    .select()
    .single();

  if (error) throw error;
  return job;
}

/**
 * Update job
 * Replaces: db.job.update({ where: { id }, data: {...} })
 */
export async function updateJob(
  id: string,
  data: Partial<Omit<Job, 'id' | 'created_at'>>
): Promise<Job> {
  const supabase = await createClient();
  const { data: job, error } = await supabase
    .from('jobs')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return job;
}

/**
 * Update job status
 * Replaces: db.job.update({ where: { id }, data: { status } })
 */
export async function updateJobStatus(id: string, status: JobStatus): Promise<Job> {
  return updateJob(id, {
    status,
    ...(status === 'COMPLETED' ? { completed_at: new Date().toISOString() } : {}),
  });
}

/**
 * Soft delete job
 * Replaces: db.job.update({ where: { id }, data: { deletedAt: new Date() } })
 */
export async function deleteJob(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('jobs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// ═══════════════════════════════════════════════════════════════════════════
// JOB FILE QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get files for a job
 * Replaces: db.jobFile.findMany({ where: { jobId } })
 */
export async function getJobFiles(jobId: string): Promise<JobFile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('job_files')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at');

  if (error) throw error;
  return data || [];
}

/**
 * Create job file record
 * Replaces: db.jobFile.create({ data: {...} })
 */
export async function createJobFile(data: {
  jobId: string;
  type: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageUrl: string;
  storagePath: string;
}): Promise<JobFile> {
  const supabase = await createClient();
  const { data: file, error } = await supabase
    .from('job_files')
    .insert({
      job_id: data.jobId,
      type: data.type as any,
      file_name: data.fileName,
      file_size: data.fileSize,
      mime_type: data.mimeType,
      storage_url: data.storageUrl,
      storage_path: data.storagePath,
    })
    .select()
    .single();

  if (error) throw error;
  return file;
}

// ═══════════════════════════════════════════════════════════════════════════
// TRANSCRIPTION QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get transcription by job ID
 * Replaces: db.transcription.findUnique({ where: { jobId } })
 */
export async function getTranscriptionByJobId(
  jobId: string
): Promise<Transcription | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('transcriptions')
    .select('*')
    .eq('job_id', jobId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Get transcription with edits
 * Replaces: db.transcription.findUnique({ where: { jobId }, include: { edits: true } })
 */
export async function getTranscriptionWithEdits(
  jobId: string
): Promise<TranscriptionWithEdits | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('transcriptions')
    .select('*, edits:transcription_edits(*)')
    .eq('job_id', jobId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data as TranscriptionWithEdits;
}

/**
 * Create or update transcription
 * Replaces: db.transcription.upsert(...)
 */
export async function upsertTranscription(
  jobId: string,
  data: Omit<Transcription, 'id' | 'job_id' | 'created_at' | 'updated_at'>
): Promise<Transcription> {
  const supabase = await createClient();
  const { data: transcription, error } = await supabase
    .from('transcriptions')
    .upsert(
      {
        job_id: jobId,
        ...data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'job_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return transcription;
}

// ═══════════════════════════════════════════════════════════════════════════
// ASSIGNMENT QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create job assignment
 * Replaces: db.jobAssignment.create({ data: {...} })
 */
export async function createJobAssignment(data: {
  jobId: string;
  scopistId: string;
}): Promise<JobAssignment> {
  const supabase = await createClient();
  const { data: assignment, error } = await supabase
    .from('job_assignments')
    .insert({
      job_id: data.jobId,
      scopist_id: data.scopistId,
      status: 'INVITED',
    })
    .select()
    .single();

  if (error) throw error;
  return assignment;
}

/**
 * Update assignment status
 * Replaces: db.jobAssignment.update({ where: { id }, data: { status } })
 */
export async function updateAssignmentStatus(
  id: string,
  status: AssignmentStatus
): Promise<JobAssignment> {
  const supabase = await createClient();
  const { data: assignment, error } = await supabase
    .from('job_assignments')
    .update({
      status,
      responded_at:
        status === 'ACCEPTED' || status === 'DECLINED'
          ? new Date().toISOString()
          : undefined,
      started_at: status === 'IN_PROGRESS' ? new Date().toISOString() : undefined,
      submitted_at: status === 'SUBMITTED' ? new Date().toISOString() : undefined,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return assignment;
}

// ═══════════════════════════════════════════════════════════════════════════
// NOTIFICATION QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get unread notifications for user
 * Replaces: db.notification.findMany({ where: { userId, isRead: false } })
 */
export async function getUnreadNotifications(userId: string): Promise<Notification[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

/**
 * Create notification
 * Replaces: db.notification.create({ data: {...} })
 */
export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  linkUrl?: string;
  jobId?: string;
}): Promise<Notification> {
  const supabase = await createClient();
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      user_id: data.userId,
      type: data.type as any,
      title: data.title,
      message: data.message,
      link_url: data.linkUrl || null,
      job_id: data.jobId || null,
    })
    .select()
    .single();

  if (error) throw error;
  return notification;
}

/**
 * Mark notification as read
 * Replaces: db.notification.update({ where: { id }, data: { isRead: true } })
 */
export async function markNotificationRead(id: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT LOG QUERIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create audit log entry
 * Uses service client to bypass RLS
 */
export async function createAuditLog(data: {
  action: string;
  actorUserId?: string;
  targetId: string;
  targetType: string;
  firmId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase.from('audit_logs').insert({
    action: data.action,
    actor_user_id: data.actorUserId || null,
    target_id: data.targetId,
    target_type: data.targetType,
    firm_id: data.firmId || null,
    metadata: data.metadata || null,
    ip_address: data.ipAddress || null,
    user_agent: data.userAgent || null,
  });

  if (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit log failure shouldn't break operations
  }
}

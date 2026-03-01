/**
 * @deprecated Legacy BullMQ job stubs.
 * Transcription now uses lib/transcription/scheduler.ts (serverless chunk pattern).
 * These functions are safe no-ops kept for backward compatibility.
 * Do NOT use for new code.
 */
import { logger } from '@/lib/logger';
// ═══════════════════════════════════════════════════════════════
// BACKGROUND JOBS SERVICE (Mock Implementation - Ready for BullMQ/Inngest)
// ═══════════════════════════════════════════════════════════════

const USE_QUEUE = process.env.USE_QUEUE === 'true';
const REDIS_URL = process.env.REDIS_URL;

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type JobType =
  | 'transcription'
  | 'export'
  | 'email'
  | 'invoice'
  | 'file-processing';

export interface JobData {
  type: JobType;
  payload: Record<string, unknown>;
  userId: string;
  priority?: number; // 1 (highest) to 10 (lowest)
  attempts?: number;
  maxRetries?: number;
}

export interface JobResult {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  result?: unknown;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// MOCK JOB QUEUE (In-Memory)
// ═══════════════════════════════════════════════════════════════

const mockJobStore = new Map<string, JobResult>();

export async function enqueueJob(data: JobData): Promise<JobResult> {
  if (USE_QUEUE && REDIS_URL) {
    // TODO: Implement BullMQ integration
    // const { Queue } = await import('bullmq');
    // const queue = new Queue(data.type, {
    //   connection: {
    //     url: REDIS_URL,
    //   },
    // });
    //
    // const job = await queue.add(
    //   data.type,
    //   data.payload,
    //   {
    //     priority: data.priority || 5,
    //     attempts: data.maxRetries || 3,
    //     backoff: {
    //       type: 'exponential',
    //       delay: 2000,
    //     },
    //   }
    // );
    //
    // return {
    //   id: job.id as string,
    //   status: 'queued',
    //   createdAt: new Date(job.timestamp),
    //   updatedAt: new Date(job.timestamp),
    // };
  }

  // Mock implementation - simulate immediate processing
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const result: JobResult = {
    id: jobId,
    status: 'processing',
    progress: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  mockJobStore.set(jobId, result);

  // Simulate async processing
  setTimeout(() => {
    const job = mockJobStore.get(jobId);
    if (job) {
      job.status = 'completed';
      job.progress = 100;
      job.updatedAt = new Date();
      job.result = { message: `${data.type} completed successfully` };
      mockJobStore.set(jobId, job);
    }
  }, 2000); // Simulate 2 second processing time

  return result;
}

export async function getJobStatus(jobId: string): Promise<JobResult | null> {
  if (USE_QUEUE && REDIS_URL) {
    // TODO: Implement BullMQ status check
    // const { Queue } = await import('bullmq');
    // const queue = new Queue('default', {
    //   connection: { url: REDIS_URL },
    // });
    //
    // const job = await queue.getJob(jobId);
    // if (!job) return null;
    //
    // const state = await job.getState();
    // return {
    //   id: job.id as string,
    //   status: state as JobResult['status'],
    //   progress: job.progress,
    //   result: job.returnvalue,
    //   error: job.failedReason,
    //   createdAt: new Date(job.timestamp),
    //   updatedAt: new Date(job.processedOn || job.timestamp),
    // };
  }

  // Mock implementation
  return mockJobStore.get(jobId) || null;
}

export async function retryJob(jobId: string): Promise<boolean> {
  if (USE_QUEUE && REDIS_URL) {
    // TODO: Implement BullMQ retry
    // const { Queue } = await import('bullmq');
    // const queue = new Queue('default', {
    //   connection: { url: REDIS_URL },
    // });
    //
    // const job = await queue.getJob(jobId);
    // if (!job) return false;
    //
    // await job.retry();
    // return true;
  }

  // Mock implementation
  const job = mockJobStore.get(jobId);
  if (!job) return false;

  job.status = 'queued';
  job.progress = 0;
  job.error = undefined;
  job.updatedAt = new Date();
  mockJobStore.set(jobId, job);

  return true;
}

// ═══════════════════════════════════════════════════════════════
// WORKER FUNCTIONS (Process jobs)
// ═══════════════════════════════════════════════════════════════

export async function processTranscriptionJob(payload: {
  jobId: string;
  fileId: string;
}): Promise<void> {
  void payload;
  console.warn('[jobs.ts] Legacy BullMQ stub called — use scheduler pattern instead');
  logger.warn('[jobs.ts] Legacy BullMQ transcription stub called');
  return;
}

export async function processExportJob(payload: {
  transcriptId: string;
  format: string;
}): Promise<void> {
  void payload;
  console.warn('[jobs.ts] Legacy BullMQ export stub called');
  logger.warn('[jobs.ts] Legacy BullMQ export stub called');
  return;
}

export async function processEmailJob(payload: {
  to: string;
  subject: string;
  template: string;
}): Promise<void> {
  void payload;
  console.warn('[jobs.ts] Legacy BullMQ email stub called');
  logger.warn('[jobs.ts] Legacy BullMQ email stub called');
  return;
}

// ═══════════════════════════════════════════════════════════════
// JOB MONITORING
// ═══════════════════════════════════════════════════════════════

export interface QueueStats {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

export async function getQueueStats(): Promise<QueueStats> {
  if (USE_QUEUE && REDIS_URL) {
    // TODO: Implement BullMQ stats
    // const { Queue } = await import('bullmq');
    // const queue = new Queue('default', {
    //   connection: { url: REDIS_URL },
    // });
    //
    // const counts = await queue.getJobCounts();
    // return {
    //   queued: counts.waiting + counts.delayed,
    //   processing: counts.active,
    //   completed: counts.completed,
    //   failed: counts.failed,
    //   total: Object.values(counts).reduce((a, b) => a + b, 0),
    // };
  }

  console.warn('[jobs.ts] Legacy BullMQ stats stub called');
  logger.warn('[jobs.ts] Legacy BullMQ stats stub called');
  return {
    queued: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    total: 0,
  };
}

export async function getRecentJobs(limit = 10): Promise<JobResult[]> {
  // Mock implementation
  const jobs = Array.from(mockJobStore.values());
  return jobs
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

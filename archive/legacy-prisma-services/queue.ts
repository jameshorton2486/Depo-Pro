// =============================================================================
// JOB QUEUE IMPLEMENTATION
// =============================================================================
// Lightweight in-process job queue for Vercel deployment
// For production scale, consider: Vercel Queue, Inngest, or Trigger.dev
// =============================================================================

import { logger } from '@/lib/logger';
import {
  QueueJob,
  QueueJobStatus,
  JobType,
  JobOptions,
  JobHandler,
  JobResult,
  DEFAULT_JOB_OPTIONS,
} from './types';

// =============================================================================
// JOB STORAGE (Database-backed)
// =============================================================================

/**
 * Create a new job in the queue
 */
export async function enqueueJob<T>(
  type: JobType,
  payload: T,
  options: JobOptions = {}
): Promise<QueueJob<T>> {
  const opts = { ...DEFAULT_JOB_OPTIONS, ...options };
  
  // Check idempotency
  if (opts.idempotencyKey) {
    const existing = await prisma.backgroundJob.findFirst({
      where: {
        idempotencyKey: opts.idempotencyKey,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
    });
    
    if (existing) {
      logger.info('Job already exists (idempotent)', {
        type,
        idempotencyKey: opts.idempotencyKey,
        existingJobId: existing.id,
      });
      return existing as unknown as QueueJob<T>;
    }
  }
  
  const job = await prisma.backgroundJob.create({
    data: {
      type,
      payload: payload as any,
      status: QueueJobStatus.PENDING,
      priority: opts.priority,
      maxAttempts: opts.maxAttempts,
      attempts: 0,
      scheduledFor: opts.scheduledFor || (opts.delay ? new Date(Date.now() + opts.delay) : null),
      idempotencyKey: opts.idempotencyKey,
    },
  });
  
  logger.info('Job enqueued', { jobId: job.id, type, priority: opts.priority });
  
  return job as unknown as QueueJob<T>;
}

/**
 * Get next available job from the queue
 */
export async function dequeueJob(): Promise<QueueJob | null> {
  const now = new Date();
  
  // Find and claim the next job atomically
  const job = await prisma.backgroundJob.findFirst({
    where: {
      status: QueueJobStatus.PENDING,
      OR: [
        { scheduledFor: null },
        { scheduledFor: { lte: now } },
      ],
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' },
    ],
  });
  
  if (!job) {
    return null;
  }
  
  // Claim the job
  const claimed = await prisma.backgroundJob.updateMany({
    where: {
      id: job.id,
      status: QueueJobStatus.PENDING,
    },
    data: {
      status: QueueJobStatus.PROCESSING,
      startedAt: now,
      attempts: { increment: 1 },
    },
  });
  
  if (claimed.count === 0) {
    // Another worker claimed it, try again
    return dequeueJob();
  }
  
  return job as unknown as QueueJob;
}

/**
 * Mark job as completed
 */
export async function completeJob(jobId: string): Promise<void> {
  await prisma.backgroundJob.update({
    where: { id: jobId },
    data: {
      status: QueueJobStatus.COMPLETED,
      completedAt: new Date(),
    },
  });
  
  logger.info('Job completed', { jobId });
}

/**
 * Mark job as failed
 */
export async function failJob(
  jobId: string,
  error: Error,
  shouldRetry: boolean = true
): Promise<void> {
  const job = await prisma.backgroundJob.findUnique({
    where: { id: jobId },
  });
  
  if (!job) {
    return;
  }
  
  const canRetry = shouldRetry && job.attempts < job.maxAttempts;
  
  await prisma.backgroundJob.update({
    where: { id: jobId },
    data: {
      status: canRetry ? QueueJobStatus.PENDING : QueueJobStatus.FAILED,
      lastError: error.message,
      startedAt: null,
      // Exponential backoff for retries
      scheduledFor: canRetry
        ? new Date(Date.now() + Math.pow(2, job.attempts) * 1000)
        : null,
    },
  });
  
  logger.warn('Job failed', {
    jobId,
    error: error.message,
    willRetry: canRetry,
    attempts: job.attempts,
  });
}

// =============================================================================
// JOB HANDLER REGISTRY
// =============================================================================

const handlers = new Map<JobType, JobHandler<any>>();

export function registerHandler<T>(handler: JobHandler<T>): void {
  handlers.set(handler.type, handler as JobHandler<any>);
  logger.debug('Job handler registered', { type: handler.type });
}

export function getHandler(type: JobType): JobHandler<any> | undefined {
  return handlers.get(type);
}

// =============================================================================
// JOB PROCESSOR
// =============================================================================

/**
 * Process a single job
 */
export async function processJob(job: QueueJob): Promise<JobResult> {
  const start = performance.now();
  const handler = getHandler(job.type);
  
  if (!handler) {
    logger.error('No handler for job type', undefined, { type: job.type, jobId: job.id });
    await failJob(job.id, new Error(`No handler for job type: ${job.type}`), false);
    return {
      success: false,
      jobId: job.id,
      duration: performance.now() - start,
      error: `No handler for job type: ${job.type}`,
    };
  }
  
  try {
    await handler.handle(job);
    await completeJob(job.id);
    
    return {
      success: true,
      jobId: job.id,
      duration: performance.now() - start,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    // Check if we should retry
    const shouldRetry = handler.shouldRetry
      ? handler.shouldRetry(job, err)
      : true;
    
    // Call error handler if defined
    if (handler.onError) {
      try {
        await handler.onError(job, err);
      } catch (onErrorError) {
        logger.error('Error in job error handler', undefined, {
          jobId: job.id,
          error: onErrorError,
        });
      }
    }
    
    await failJob(job.id, err, shouldRetry);
    
    return {
      success: false,
      jobId: job.id,
      duration: performance.now() - start,
      error: err.message,
    };
  }
}

/**
 * Process jobs in batch (for scheduled execution)
 */
export async function processJobs(limit: number = 10): Promise<JobResult[]> {
  const results: JobResult[] = [];
  
  for (let i = 0; i < limit; i++) {
    const job = await dequeueJob();
    if (!job) break;
    
    const result = await processJob(job);
    results.push(result);
  }
  
  return results;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<QueueJob | null> {
  const job = await prisma.backgroundJob.findUnique({
    where: { id: jobId },
  });
  
  return job as unknown as QueueJob | null;
}

/**
 * Cancel a pending job
 */
export async function cancelJob(jobId: string): Promise<boolean> {
  const result = await prisma.backgroundJob.updateMany({
    where: {
      id: jobId,
      status: QueueJobStatus.PENDING,
    },
    data: {
      status: QueueJobStatus.FAILED,
      lastError: 'Cancelled',
    },
  });
  
  return result.count > 0;
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}> {
  const counts = await prisma.backgroundJob.groupBy({
    by: ['status'],
    _count: { status: true },
  });
  
  const stats = {
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
  };
  
  counts.forEach(({ status, _count }) => {
    const key = status.toLowerCase() as keyof typeof stats;
    if (key in stats) {
      stats[key] = _count.status;
    }
  });
  
  return stats;
}

/**
 * Cleanup old completed jobs
 */
export async function cleanupOldJobs(olderThanDays: number = 7): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  
  const result = await prisma.backgroundJob.deleteMany({
    where: {
      status: { in: [QueueJobStatus.COMPLETED, QueueJobStatus.FAILED] },
      completedAt: { lt: cutoff },
    },
  });
  
  logger.info('Cleaned up old jobs', { count: result.count, olderThanDays });
  
  return result.count;
}

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

  // Production guard: Prevent mock job queue in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[Jobs Service] Job queue is not configured. ' +
      'Set USE_QUEUE=true and REDIS_URL in production environment. ' +
      'Mock job queue (in-memory) is only available in development.'
    );
  }

  // Mock implementation - simulate immediate processing (development only)
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

  // Production guard: Prevent mock job status checks in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[Jobs Service] Job queue is not configured. ' +
      'Set USE_QUEUE=true and REDIS_URL in production environment. ' +
      'Mock job status checks are only available in development.'
    );
  }

  // Mock implementation (development only)
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

  // Production guard: Prevent mock job retries in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[Jobs Service] Job queue is not configured. ' +
      'Set USE_QUEUE=true and REDIS_URL in production environment. ' +
      'Mock job retries are only available in development.'
    );
  }

  // Mock implementation (development only)
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
  // TODO: Implement actual transcription processing
  // This would call the transcription service
  console.log('[Worker] Processing transcription job:', payload);

  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 1000));
}

export async function processExportJob(payload: {
  transcriptId: string;
  format: string;
}): Promise<void> {
  // TODO: Implement actual export processing
  console.log('[Worker] Processing export job:', payload);

  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 1000));
}

export async function processEmailJob(payload: {
  to: string;
  subject: string;
  template: string;
}): Promise<void> {
  // TODO: Implement actual email sending
  console.log('[Worker] Processing email job:', payload);

  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 500));
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

  // Production guard: Prevent mock queue stats in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[Jobs Service] Job queue is not configured. ' +
      'Set USE_QUEUE=true and REDIS_URL in production environment. ' +
      'Mock queue stats are only available in development.'
    );
  }

  // Mock implementation (development only)
  const jobs = Array.from(mockJobStore.values());
  return {
    queued: jobs.filter(j => j.status === 'queued').length,
    processing: jobs.filter(j => j.status === 'processing').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    failed: jobs.filter(j => j.status === 'failed').length,
    total: jobs.length,
  };
}

export async function getRecentJobs(limit = 10): Promise<JobResult[]> {
  // Production guard: Prevent mock job retrieval in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[Jobs Service] Job queue is not configured. ' +
      'Set USE_QUEUE=true and REDIS_URL in production environment. ' +
      'Mock job retrieval is only available in development.'
    );
  }

  // Mock implementation (development only)
  const jobs = Array.from(mockJobStore.values());
  return jobs
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

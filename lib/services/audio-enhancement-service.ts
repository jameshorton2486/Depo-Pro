// ═══════════════════════════════════════════════════════════════
// AUDIO ENHANCEMENT SERVICE
// lib/services/audio-enhancement-service.ts
//
// Handles both automated (Dolby.io) and manual (iZotope RX) 
// audio enhancement pipelines
// ═══════════════════════════════════════════════════════════════

import { db } from '@/lib/db';
import { AudioEnhancementType } from '@prisma/client';
import { BillingService } from './billing-service';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type AudioProcessingMode = 'AUTOMATED' | 'MANUAL_RX';
export type AsrModelTier = 'STANDARD' | 'ENHANCED';

export interface EnhancementResult {
  success: boolean;
  enhancedFileUrl?: string;
  enhancedFilePath?: string;
  durationMinutes: number;
  provider: string;
  enhancementType: AudioEnhancementType;
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface RxQueueJob {
  id: string;
  jobId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  assignedToId?: string;
  assignedToName?: string;
  jobTitle?: string;
  caseName?: string;
  originalFileUrl: string;
  enhancedFileUrl?: string;
  notes?: string;
  rxOperatorNotes?: string;
  toolsUsed?: string[];
  timeSpentMinutes?: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface DolbyEnhanceOptions {
  noiseReduction?: 'low' | 'medium' | 'high' | 'max';
  loudnessNormalization?: boolean;
  speechIsolation?: boolean;
  dynamicEq?: boolean;
}

export interface RxEnhancementChecklist {
  voiceDeNoise: boolean;
  dialogueIsolate: boolean;
  deReverb: boolean;
  spectralRepair: boolean;
  levelingCompression: boolean;
  additionalNotes?: string;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const DEFAULT_DOLBY_OPTIONS: DolbyEnhanceOptions = {
  noiseReduction: 'medium',
  loudnessNormalization: true,
  speechIsolation: true,
  dynamicEq: false,
};

// ═══════════════════════════════════════════════════════════════
// HELPER: Upload to Supabase Storage
// ═══════════════════════════════════════════════════════════════

async function uploadToStorage(sourceUrl: string, destPath: string): Promise<string> {
  try {
    // Download the file
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    const blob = await response.blob();
    
    // Upload to Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    
    const { error } = await supabase.storage
      .from('audio')
      .upload(destPath, blob, {
        contentType: 'audio/wav',
        upsert: true,
      });
      
    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from('audio')
      .getPublicUrl(destPath);
      
    return urlData.publicUrl;
  } catch (error) {
    console.error('[Storage Upload] Error:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════
// AUDIO ENHANCEMENT SERVICE CLASS
// ═══════════════════════════════════════════════════════════════

export class AudioEnhancementService {
  // ═══════════════════════════════════════════════════════════════
  // DETERMINE PROCESSING MODE
  // ═══════════════════════════════════════════════════════════════

  static async getProcessingModeForJob(jobId: string): Promise<AudioProcessingMode | null> {
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        // Check for audioProcessingMode in metadata or extended fields
        notes: true,
        internalNotes: true,
      },
    });

    if (!job) return null;

    // Check if RX mode was explicitly requested (stored in internalNotes as JSON)
    try {
      if (job.internalNotes) {
        const metadata = JSON.parse(job.internalNotes);
        if (metadata.audioProcessingMode === 'MANUAL_RX') {
          return 'MANUAL_RX';
        }
      }
    } catch {
      // Not JSON, ignore
    }

    return 'AUTOMATED';
  }

  // ═══════════════════════════════════════════════════════════════
  // SET PROCESSING MODE FOR JOB
  // ═══════════════════════════════════════════════════════════════

  static async setProcessingMode(
    jobId: string,
    mode: AudioProcessingMode,
    asrModelTier: AsrModelTier = 'STANDARD',
  ): Promise<void> {
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: { internalNotes: true },
    });

    let metadata: Record<string, unknown> = {};
    try {
      if (job?.internalNotes) {
        metadata = JSON.parse(job.internalNotes);
      }
    } catch {
      // Not JSON, start fresh
    }

    metadata.audioProcessingMode = mode;
    metadata.asrModelTier = asrModelTier;
    metadata.processingModeSetAt = new Date().toISOString();

    await db.job.update({
      where: { id: jobId },
      data: {
        internalNotes: JSON.stringify(metadata),
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTOMATED ENHANCEMENT (DOLBY.IO)
  // ═══════════════════════════════════════════════════════════════

  static async enhanceWithDolby(
    jobId: string,
    audioFileUrl: string,
    options: DolbyEnhanceOptions = DEFAULT_DOLBY_OPTIONS,
  ): Promise<EnhancementResult> {
    const startTime = Date.now();

    try {
      // ═══════════════════════════════════════════════════════════
      // DOLBY.IO API INTEGRATION
      // ═══════════════════════════════════════════════════════════

      // Import Dolby.io SDK
      // NOTE: Package @dolbyio/media-apis needs to be installed
      // @ts-expect-error - Package may not be installed
      const dolbyModule = await import('@dolbyio/media-apis');
      const MediaApis = dolbyModule.MediaApis;
      
      // Initialize Dolby client
      const dolby = new MediaApis({
        appKey: process.env.DOLBY_API_KEY!,
        appSecret: process.env.DOLBY_API_SECRET!,
      });

      console.log(`[AudioEnhancement] Starting Dolby.io enhancement for job ${jobId}`);
      console.log(`[AudioEnhancement] Options:`, options);

      // 1. Start enhance job
      const enhanceJob = await dolby.media.enhance.start({
        input: audioFileUrl,
        output: `dlb://enhanced/${jobId}.wav`,
        content: {
          type: 'voice_recording',
        },
        audio: {
          noise: {
            reduction: {
              enable: true,
              amount: options.noiseReduction || 'medium',
            },
          },
          speech: {
            isolation: {
              enable: options.speechIsolation ?? true,
              amount: 50,
            },
          },
          dynamics: {
            range_control: {
              enable: options.loudnessNormalization ?? true,
              amount: 50,
            },
          },
        },
      });

      // 2. Poll for completion
      let status = await dolby.media.enhance.getStatus(enhanceJob.job_id);
      let pollAttempts = 0;
      const maxPolls = 300; // 10 minutes max (2s * 300)
      
      while (status.status === 'Running' && pollAttempts < maxPolls) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        status = await dolby.media.enhance.getStatus(enhanceJob.job_id);
        pollAttempts++;
      }

      if (status.status !== 'Success') {
        throw new Error(`Enhancement failed: ${status.error?.message || 'Unknown error'}`);
      }

      // 3. Download enhanced file
      const downloadUrl = await dolby.media.io.getDownloadUrl({
        url: status.result?.output_path || `dlb://enhanced/${jobId}.wav`,
      });

      // 4. Upload to Supabase storage
      const enhancedFileUrl = await uploadToStorage(
        downloadUrl.url,
        `enhanced/${jobId}.wav`
      );

      // Calculate duration (approximate - would need audio analysis for exact)
      const elapsedMs = Date.now() - startTime;
      const processingMinutes = Math.ceil(elapsedMs / 60000) || 1;

      // 5. Log the enhancement session
      await db.audioProcessingSession.create({
        data: {
          jobId,
          processingType: 'AUTOMATED',
          status: 'COMPLETED',
          // Legacy fields for backward compatibility
          enhancementType: 'AUTOMATED_DOLBY',
          durationMinutes: processingMinutes,
          provider: 'dolby.io',
        },
      });

      // Record billing usage
      const job = await db.job.findUnique({
        where: { id: jobId },
        select: { firmId: true },
      });

      if (job?.firmId) {
        // Get audio duration from file or estimate
        // For now, we'll record a placeholder - should get actual duration
        const audioDurationMinutes = 0; // TODO: Get from audio file metadata
        if (audioDurationMinutes > 0) {
          await BillingService.recordUsage(
            job.firmId,
            jobId,
            'TRANSCRIPTION_AUTOMATED',
            audioDurationMinutes,
            'PER_MINUTE',
          );
        }
      }

      return {
        success: true,
        enhancedFileUrl,
        enhancedFilePath: `enhanced/${jobId}.wav`,
        durationMinutes: processingMinutes,
        provider: 'dolby.io',
        enhancementType: 'AUTOMATED_DOLBY',
        metadata: {
          options,
          processingTimeMs: elapsedMs,
          dolbyJobId: enhanceJob.job_id,
        },
      };
    } catch (error) {
      console.error(`[AudioEnhancement] Dolby.io enhancement failed:`, error);
      
      // Log failed session
      try {
        await db.audioProcessingSession.create({
          data: {
            jobId,
            processingType: 'AUTOMATED',
            status: 'CANCELLED',
            // Legacy fields
            enhancementType: 'AUTOMATED_DOLBY',
            durationMinutes: 0,
            provider: 'dolby.io',
          },
        });
      } catch (logError) {
        console.error('[AudioEnhancement] Failed to log error:', logError);
      }
      
      return {
        success: false,
        durationMinutes: 0,
        provider: 'dolby.io',
        enhancementType: 'AUTOMATED_DOLBY',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ADD TO RX QUEUE (MANUAL ENHANCEMENT)
  // ═══════════════════════════════════════════════════════════════

  static async addToRxQueue(
    jobId: string,
    audioFileUrl: string,
    options: {
      priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
      notes?: string;
      requestedById?: string;
    } = {},
  ): Promise<{ success: boolean; queuePosition?: number; error?: string }> {
    try {
      // Check if job already in RX queue
      const existingSession = await db.audioProcessingSession.findFirst({
        where: {
          jobId,
          enhancementType: 'MANUAL_RX',
        },
      });

      if (existingSession) {
        return {
          success: false,
          error: 'Job is already in the RX queue',
        };
      }

      // Create placeholder session to track queue status
      // The actual RX work is done manually by an operator
      await db.audioProcessingSession.create({
        data: {
          jobId,
          processingType: 'MANUAL_RX',
          status: 'PENDING',
          // Legacy fields
          enhancementType: 'MANUAL_RX',
          durationMinutes: 0, // Updated when complete
          provider: 'izotope-rx',
        },
      });

      // Update job status to indicate waiting for RX
      await db.job.update({
        where: { id: jobId },
        data: {
          status: 'ENHANCING_AUDIO',
        },
      });

      // Store queue metadata in job notes
      const job = await db.job.findUnique({
        where: { id: jobId },
        select: { internalNotes: true },
      });

      let metadata: Record<string, unknown> = {};
      try {
        if (job?.internalNotes) {
          metadata = JSON.parse(job.internalNotes);
        }
      } catch {
        // Not JSON
      }

      metadata.rxQueue = {
        status: 'PENDING',
        priority: options.priority || 'NORMAL',
        notes: options.notes,
        requestedById: options.requestedById,
        addedAt: new Date().toISOString(),
        originalFileUrl: audioFileUrl,
      };

      await db.job.update({
        where: { id: jobId },
        data: {
          internalNotes: JSON.stringify(metadata),
        },
      });

      // Calculate queue position
      const queuePosition = await this.getRxQueuePosition(jobId);

      return {
        success: true,
        queuePosition,
      };
    } catch (error) {
      console.error(`[AudioEnhancement] Failed to add to RX queue:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // GET RX QUEUE
  // ═══════════════════════════════════════════════════════════════

  static async getRxQueue(options?: {
    status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
    limit?: number;
  }): Promise<RxQueueJob[]> {
    // Get all jobs with MANUAL_RX sessions
    const sessions = await db.audioProcessingSession.findMany({
      where: {
        enhancementType: 'MANUAL_RX',
      },
      orderBy: { createdAt: 'asc' },
      take: options?.limit,
    });

    const queueJobs: RxQueueJob[] = [];

    for (const session of sessions) {
      const job = await db.job.findUnique({
        where: { id: session.jobId },
        select: {
          id: true,
          title: true,
          caseName: true,
          internalNotes: true,
          files: {
            where: { type: 'AUDIO' },
            take: 1,
          },
        },
      });

      if (!job) continue;

      let rxMetadata: Record<string, unknown> = {};
      try {
        if (job.internalNotes) {
          const parsed = JSON.parse(job.internalNotes);
          rxMetadata = parsed.rxQueue || {};
        }
      } catch {
        // Not JSON
      }

      const status = (rxMetadata.status as string) || 'PENDING';
      
      // Filter by status if specified
      if (options?.status && status !== options.status) {
        continue;
      }

      // Get assigned user name if assigned
      let assignedToName: string | undefined;
      if (rxMetadata.assignedToId) {
        const user = await db.user.findUnique({
          where: { id: rxMetadata.assignedToId as string },
          select: { firstName: true, lastName: true },
        });
        if (user) {
          assignedToName = `${user.firstName} ${user.lastName}`;
        }
      }

      queueJobs.push({
        id: session.id,
        jobId: session.jobId,
        status: status as RxQueueJob['status'],
        priority: (rxMetadata.priority as RxQueueJob['priority']) || 'NORMAL',
        assignedToId: rxMetadata.assignedToId as string | undefined,
        assignedToName,
        jobTitle: job.title,
        caseName: job.caseName,
        originalFileUrl: job.files[0]?.storageUrl || (rxMetadata.originalFileUrl as string) || '',
        enhancedFileUrl: rxMetadata.enhancedFileUrl as string | undefined,
        notes: rxMetadata.notes as string | undefined,
        rxOperatorNotes: rxMetadata.rxOperatorNotes as string | undefined,
        toolsUsed: rxMetadata.toolsUsed as string[] | undefined,
        timeSpentMinutes: session.durationMinutes ?? undefined,
        createdAt: session.createdAt,
        startedAt: rxMetadata.startedAt ? new Date(rxMetadata.startedAt as string) : undefined,
        completedAt: rxMetadata.completedAt ? new Date(rxMetadata.completedAt as string) : undefined,
      });
    }

    // Sort by priority then by createdAt
    const priorityOrder = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
    queueJobs.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    return queueJobs;
  }

  // ═══════════════════════════════════════════════════════════════
  // GET RX QUEUE POSITION
  // ═══════════════════════════════════════════════════════════════

  static async getRxQueuePosition(jobId: string): Promise<number> {
    const queue = await this.getRxQueue({ status: 'PENDING' });
    const position = queue.findIndex((item) => item.jobId === jobId);
    return position === -1 ? queue.length + 1 : position + 1;
  }

  // ═══════════════════════════════════════════════════════════════
  // START RX PROCESSING
  // ═══════════════════════════════════════════════════════════════

  static async startRxProcessing(
    jobId: string,
    operatorId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const job = await db.job.findUnique({
        where: { id: jobId },
        select: { internalNotes: true },
      });

      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      let metadata: Record<string, unknown> = {};
      try {
        if (job.internalNotes) {
          metadata = JSON.parse(job.internalNotes);
        }
      } catch {
        // Not JSON
      }

      if (!metadata.rxQueue) {
        return { success: false, error: 'Job is not in RX queue' };
      }

      const rxQueue = metadata.rxQueue as Record<string, unknown>;
      rxQueue.status = 'IN_PROGRESS';
      rxQueue.assignedToId = operatorId;
      rxQueue.startedAt = new Date().toISOString();

      metadata.rxQueue = rxQueue;

      await db.job.update({
        where: { id: jobId },
        data: {
          status: 'ENHANCING_AUDIO',
          internalNotes: JSON.stringify(metadata),
        },
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // COMPLETE RX PROCESSING
  // ═══════════════════════════════════════════════════════════════

  static async completeRxProcessing(
    jobId: string,
    operatorId: string,
    result: {
      enhancedFileUrl: string;
      timeSpentMinutes: number;
      toolsUsed: string[];
      notes?: string;
      checklist: RxEnhancementChecklist;
    },
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const job = await db.job.findUnique({
        where: { id: jobId },
        select: { internalNotes: true, firmId: true },
      });

      if (!job) {
        return { success: false, error: 'Job not found' };
      }

      let metadata: Record<string, unknown> = {};
      try {
        if (job.internalNotes) {
          metadata = JSON.parse(job.internalNotes);
        }
      } catch {
        // Not JSON
      }

      const rxQueue = (metadata.rxQueue || {}) as Record<string, unknown>;
      rxQueue.status = 'COMPLETED';
      rxQueue.completedAt = new Date().toISOString();
      rxQueue.enhancedFileUrl = result.enhancedFileUrl;
      rxQueue.timeSpentMinutes = result.timeSpentMinutes;
      rxQueue.toolsUsed = result.toolsUsed;
      rxQueue.rxOperatorNotes = result.notes;
      rxQueue.checklist = result.checklist;
      rxQueue.completedById = operatorId;

      metadata.rxQueue = rxQueue;

      // Update job
      await db.job.update({
        where: { id: jobId },
        data: {
          internalNotes: JSON.stringify(metadata),
        },
      });

      // Update audio processing session with actual time
      await db.audioProcessingSession.updateMany({
        where: {
          jobId,
          enhancementType: 'MANUAL_RX',
        },
        data: {
          durationMinutes: result.timeSpentMinutes,
        },
      });

      // Record billing usage for RX enhancement
      if (job.firmId) {
        await BillingService.recordUsage(
          job.firmId,
          jobId,
          'FORENSIC_AUDIO_RX',
          1, // Flat fee per file
          'PER_FILE',
        );
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // GET ENHANCEMENT STATUS
  // ═══════════════════════════════════════════════════════════════

  static async getEnhancementStatus(jobId: string): Promise<{
    mode: AudioProcessingMode;
    status: 'NOT_STARTED' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    enhancedFileUrl?: string;
    queuePosition?: number;
    metadata?: Record<string, unknown>;
  }> {
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: { internalNotes: true },
    });

    const session = await db.audioProcessingSession.findFirst({
      where: { jobId },
      orderBy: { createdAt: 'desc' },
    });

    let metadata: Record<string, unknown> = {};
    try {
      if (job?.internalNotes) {
        metadata = JSON.parse(job.internalNotes);
      }
    } catch {
      // Not JSON
    }

    const mode = (metadata.audioProcessingMode as AudioProcessingMode) || 'AUTOMATED';
    const rxQueue = metadata.rxQueue as Record<string, unknown> | undefined;

    if (!session) {
      return { mode, status: 'NOT_STARTED' };
    }

    if (session.enhancementType === 'MANUAL_RX') {
      const status = (rxQueue?.status as string) || 'PENDING';
      const queuePosition = status === 'PENDING' 
        ? await this.getRxQueuePosition(jobId) 
        : undefined;

      return {
        mode: 'MANUAL_RX',
        status: status as 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED',
        enhancedFileUrl: rxQueue?.enhancedFileUrl as string | undefined,
        queuePosition,
        metadata: rxQueue,
      };
    }

    // Automated enhancement
    return {
      mode: 'AUTOMATED',
      status: 'COMPLETED', // Automated is instant
      enhancedFileUrl: metadata.enhancedFileUrl as string | undefined,
      metadata,
    };
  }
}

export default AudioEnhancementService;

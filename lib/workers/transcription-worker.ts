import { Worker, Job } from 'bullmq';
import { redisConnection } from '@/lib/redis';
import { prisma } from '@/lib/db';
import { JobStatus } from '@prisma/client';
import config from '@/lib/deepgram/env';
import type { TranscriptionJobData } from '@/types/deepgram';
import { createClient, PrerecordedSchema } from '@deepgram/sdk';
import { getOptimalDeepgramConfig } from '@/lib/transcription/config';

// Transcription worker
const worker = new Worker<TranscriptionJobData>(
  'transcription',
  async (job: Job<TranscriptionJobData>) => {
    console.log(`📋 Processing transcription job: ${job.id}`);
    
    const { jobId, audioFileUrl } = job.data;
    console.log(`   Audio URL: ${audioFileUrl}`);
    
    try {
      // Step 1: Update job status to TRANSCRIBING
      await prisma.job.update({
        where: { id: jobId },
        data: { status: JobStatus.TRANSCRIBING },
      });
      
      await job.updateProgress(10);
      
      // Step 2: Parse notice document if provided (AI extraction)
      // TODO: Implement notice parsing
      
      await job.updateProgress(20);

      // Step 3: Fetch audio file
      console.log('  📥 Downloading audio file...');
      const response = await fetch(audioFileUrl);
      if (!response.ok) throw new Error(`Failed to fetch audio: ${response.statusText}`);
      const audioBuffer = await response.arrayBuffer();
      const audioData = Buffer.from(audioBuffer);
      
      await job.updateProgress(40);
      
      // Step 4: Download and enhance audio (FFmpeg preprocessing)
      // TODO: Implement audio enhancement
      console.log('  🎵 Enhancing audio quality...');
      
      // Step 5: Transcribe with Deepgram
      console.log('  🤖 Transcribing with Deepgram...');
      const deepgram = createClient(config.apis.deepgram);
      const dgConfig = getOptimalDeepgramConfig({ customDictionary: [] });
      
      const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
        audioData, 
        dgConfig as unknown as PrerecordedSchema
      );
      
      if (error) throw error;
      if (!result) throw new Error('No transcription result returned');

      await job.updateProgress(80);
      
      // Step 6: Store transcription in database
      console.log('  💾 Storing transcription...');
      
      // Create a basic transcript record
      await prisma.transcript.create({
        data: {
          jobId,
          version: '1.0-raw',
          versionNumber: 1,
          content: result.results?.channels[0]?.alternatives[0]?.transcript || '',
          contentJson: {}, // Empty JSON for now, will be populated by TipTap
          createdBy: 'system',
        }
      });
      
      await job.updateProgress(90);
      
      // Step 7: Analyze quality and flag low-confidence segments
      // TODO: Implement quality analysis
      console.log('  📊 Analyzing quality...');
      
      // Step 8: Update job status to AI_REVIEWING
      await prisma.job.update({
        where: { id: jobId },
        data: { 
          status: JobStatus.AI_REVIEWING,
        },
      });
      
      await job.updateProgress(100);
      
      console.log(`✅ Transcription job ${job.id} completed`);
      
      return { success: true, jobId };
      
    } catch (error) {
      console.error(`❌ Transcription job ${job.id} failed:`, error);
      
      // Update job status to CANCELLED (since FAILED doesn't exist)
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: JobStatus.CANCELLED,
        },
      });
      
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: config.settings.workerConcurrency,
    limiter: {
      max: config.settings.workerRateLimitMax,
      duration: config.settings.workerRateLimitDuration,
    },
  }
);

// Worker event listeners
worker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed successfully`);
});

worker.on('failed', (job, error) => {
  console.error(`❌ Job ${job?.id} failed:`, error.message);
});

worker.on('error', (error) => {
  console.error('❌ Worker error:', error);
});

console.log('🔄 Transcription worker started');
console.log(`   Concurrency: ${config.settings.workerConcurrency}`);
console.log(`   Rate limit: ${config.settings.workerRateLimitMax} jobs per ${config.settings.workerRateLimitDuration}ms`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing worker...');
  await worker.close();
});

export default worker;

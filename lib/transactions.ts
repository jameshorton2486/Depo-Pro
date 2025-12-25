/**
 * Database transaction helpers
 * Phase 5: Production Hardening
 */

import { PrismaClient, Prisma } from '@prisma/client';

// Extend PrismaClient with transaction helpers
export class PrismaTransactionClient<
  T extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  U = never
> extends PrismaClient<T, U> {
  /**
   * Execute a function within a database transaction
   */
  async withTransaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel }
  ): Promise<T> {
    return this.$transaction(fn, options);
  }

  /**
   * Execute multiple operations in a single transaction
   */
  async executeTransaction<T>(
    operations: ((tx: Prisma.TransactionClient) => Promise<any>)[],
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel }
  ): Promise<T[]> {
    return this.$transaction(async (tx) => {
      const results: T[] = [];

      for (const operation of operations) {
        const result = await operation(tx);
        results.push(result);
      }

      return results;
    }, options);
  }
}

// Common transaction patterns
export const TransactionPatterns = {
  /**
   * Create job with related records
   */
  async createJobWithFiles(
    tx: Prisma.TransactionClient,
    jobData: Prisma.JobCreateInput,
    fileData: Prisma.JobFileCreateInput[]
  ) {
    const job = await tx.job.create({ data: jobData });

    if (fileData.length > 0) {
      await tx.jobFile.createMany({
        data: fileData.map(file => ({ ...file, jobId: job.id })),
      });
    }

    return job;
  },

  /**
   * Create transcript with tokens
   */
  async createTranscriptWithTokens(
    tx: Prisma.TransactionClient,
    transcriptData: Prisma.TranscriptCreateInput,
    tokenData: Prisma.TranscriptTokenCreateInput[]
  ) {
    const transcript = await tx.transcript.create({ data: transcriptData });

    if (tokenData.length > 0) {
      await tx.transcriptToken.createMany({
        data: tokenData.map(token => ({ ...token, transcriptId: transcript.id })),
      });
    }

    return transcript;
  },

  /**
   * Update user with audit log
   */
  async updateUserWithAudit(
    tx: Prisma.TransactionClient,
    userId: string,
    updateData: Prisma.UserUpdateInput,
    auditData: {
      action: string;
      details: Record<string, any>;
      ipAddress?: string;
      userAgent?: string;
    }
  ) {
    const user = await tx.user.update({
      where: { id: userId },
      data: updateData,
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: auditData.action,
        entityType: 'User',
        entityId: userId,
        details: auditData.details,
        ipAddress: auditData.ipAddress,
        userAgent: auditData.userAgent,
      },
    });

    return user;
  },

  /**
   * Create calendar event with participants
   */
  async createCalendarEventWithParticipants(
    tx: Prisma.TransactionClient,
    eventData: Prisma.CalendarEventCreateInput,
    participantData: Prisma.EventParticipantCreateInput[]
  ) {
    const event = await tx.calendarEvent.create({ data: eventData });

    if (participantData.length > 0) {
      await tx.eventParticipant.createMany({
        data: participantData.map(participant => ({
          ...participant,
          eventId: event.id
        })),
      });
    }

    return event;
  },

  /**
   * Bulk update with rollback on failure
   */
  async bulkUpdateWithRollback(
    tx: Prisma.TransactionClient,
    updates: Array<{
      model: keyof typeof tx;
      where: any;
      data: any;
    }>
  ) {
    const results: any[] = [];

    for (const update of updates) {
      const result = await (tx as any)[update.model].update({
        where: update.where,
        data: update.data,
      });
      results.push(result);
    }

    return results;
  },
};

// Retry logic for transient database errors
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ['P2002', 'P2025'].includes(error.code) // Unique constraint, Record not found
      ) {
        throw error;
      }

      if (attempt === maxRetries) {
        break;
      }

      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }

  throw lastError!;
}

// Connection pool monitoring
export interface ConnectionPoolStats {
  activeConnections: number;
  idleConnections: number;
  waitingClients: number;
  totalCount: number;
}

export async function getConnectionPoolStats(client: PrismaClient): Promise<ConnectionPoolStats> {
  // This is a simplified version. In production, you'd use database-specific queries
  try {
    // For PostgreSQL, you might query pg_stat_activity
    const result = await client.$queryRaw<{ count: number }[]>`
      SELECT count(*) as count FROM pg_stat_activity
      WHERE datname = current_database()
    `;

    return {
      activeConnections: result[0]?.count || 0,
      idleConnections: 0, // Would need more complex query
      waitingClients: 0,  // Would need more complex query
      totalCount: result[0]?.count || 0,
    };
  } catch (error) {
    console.warn('Failed to get connection pool stats:', error);
    return {
      activeConnections: 0,
      idleConnections: 0,
      waitingClients: 0,
      totalCount: 0,
    };
  }
}
// ═══════════════════════════════════════════════════════════════
// PRISMA CLIENT SINGLETON
// ═══════════════════════════════════════════════════════════════
// Prevents multiple Prisma Client instances in development
// due to hot reloading

import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaTransactionClient } from './transactions';
import { logger } from './observability';
import { validateEnvironment } from './security';

/**
 * Global Prisma Client instance
 * We use a global variable in development to prevent multiple instances
 * from being created during hot module replacement (HMR)
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Validate environment variables on startup
if (process.env.NODE_ENV === 'production') {
  try {
    validateEnvironment();
  } catch (error) {
    logger.fatal('Environment validation failed', error as Error);
    // In production, we might want to exit, but in Next.js we'll just log it
  }
}

/**
 * Enhanced Prisma Client with transaction helpers and observability
 * Phase 5: Production Hardening
 */
class EnhancedPrismaClient extends PrismaTransactionClient<Prisma.PrismaClientOptions, 'query' | 'error' | 'warn'> {
  constructor(options?: any) {
    super({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' }
      ],
      ...options,
    });

    // Set up event listeners for logging
    this.$on('query', (e: any) => {
      logger.debug('Database query', {
        query: e.query,
        duration: e.duration,
        target: e.target,
      });
    });

    this.$on('error', (e: any) => {
      logger.error('Database error', new Error(e.message), {
        target: e.target,
      });
    });

    this.$on('warn', (e: any) => {
      logger.warn('Database warning', {
        message: e.message,
        target: e.target,
      });
    });
  }
}

/**
 * Prisma Client instance with enhanced logging and transaction support
 */
export const db = globalForPrisma.prisma ?? new EnhancedPrismaClient();

// Prevent multiple instances in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

/**
 * Helper to disconnect Prisma Client (useful in tests or scripts)
 */
export async function disconnect() {
  await db.$disconnect();
}

// Export prisma as an alias for backward compatibility
export const prisma = db;

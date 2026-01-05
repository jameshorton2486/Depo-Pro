// ═══════════════════════════════════════════════════════════════
// PRISMA CLIENT SINGLETON
// ═══════════════════════════════════════════════════════════════
// Prevents multiple Prisma Client instances in development
// due to hot reloading

import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaTransactionClient } from './transactions';
// ⚠️ EDGE RUNTIME: Lazy import logger to avoid pulling observability into Edge
// observability.ts uses process.uptime() which is Node-only
import { validateEnvironment } from './security';

/**
 * Global Prisma Client instance
 * We use a global variable in development to prevent multiple instances
 * from being created during hot module replacement (HMR)
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Lazy logger getter to avoid Edge Runtime issues
let loggerInstance: any = null;
async function getLogger() {
  if (!loggerInstance) {
    const { logger } = await import('./observability');
    loggerInstance = logger;
  }
  return loggerInstance;
}

// Validate environment variables on startup
if (process.env.NODE_ENV === 'production') {
  try {
    validateEnvironment();
  } catch (error) {
    // Lazy import logger to avoid Edge Runtime issues
    getLogger().then(logger => {
      logger.fatal('Environment validation failed', error as Error);
    }).catch(() => {
      // Fallback if logger can't be loaded (Edge Runtime)
      console.error('Environment validation failed', error);
    });
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

    // Set up event listeners for logging (lazy logger to avoid Edge Runtime issues)
    this.$on('query', (e: any) => {
      getLogger().then(logger => {
        logger.debug('Database query', {
          query: e.query,
          duration: e.duration,
          target: e.target,
        });
      }).catch(() => {
        // Fallback if logger can't be loaded (Edge Runtime)
        if (process.env.NODE_ENV === 'development') {
          console.debug('Database query', e.query);
        }
      });
    });

    this.$on('error', (e: any) => {
      getLogger().then(logger => {
        logger.error('Database error', new Error(e.message), {
          target: e.target,
        });
      }).catch(() => {
        // Fallback if logger can't be loaded (Edge Runtime)
        console.error('Database error', e.message);
      });
    });

    this.$on('warn', (e: any) => {
      getLogger().then(logger => {
        logger.warn('Database warning', {
          message: e.message,
          target: e.target,
        });
      }).catch(() => {
        // Fallback if logger can't be loaded (Edge Runtime)
        console.warn('Database warning', e.message);
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

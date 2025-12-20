// ═══════════════════════════════════════════════════════════════
// PRISMA CLIENT SINGLETON
// ═══════════════════════════════════════════════════════════════
// Prevents multiple Prisma Client instances in development
// due to hot reloading

import { PrismaClient } from '@prisma/client';

/**
 * Global Prisma Client instance
 * We use a global variable in development to prevent multiple instances
 * from being created during hot module replacement (HMR)
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma Client instance with logging configuration
 * In development, logs queries and warnings
 * In production, only logs errors
 */
export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});

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

// Export prisma as an alias for lib/queue/jobs.ts compatibility
export const prisma = db;

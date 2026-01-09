// =============================================================================
// QUEUE CONNECTION
// =============================================================================
// Canonical BullMQ connection config
// =============================================================================

import type { ConnectionOptions } from 'bullmq';

export function getQueueConnection(): ConnectionOptions {
  const url = process.env.REDIS_URL;

  if (!url) {
    throw new Error('REDIS_URL is not defined');
  }

  return { url };
}

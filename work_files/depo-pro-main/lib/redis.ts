import { Redis } from 'ioredis';
import { config } from '@/lib/deepgram/env';

// Redis connection for BullMQ
export const redisConnection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null, // Required for BullMQ
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Handle connection events
redisConnection.on('connect', () => {
  console.log('✅ Redis connected');
});

redisConnection.on('error', (error) => {
  console.error('❌ Redis connection error:', error.message);
});

redisConnection.on('close', () => {
  console.log('⚠️  Redis connection closed');
});

export default redisConnection;

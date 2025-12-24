import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { config } from '../src/config/env.js';

const prisma = new PrismaClient();

async function verifyInstallation() {
  console.log('🔍 Verifying Depo-Pro installation...\n');
  
  let allHealthy = true;
  
  // 1. Check environment variables
  console.log('1️⃣ Checking environment variables...');
  try {
    if (!config.database.url) throw new Error('DATABASE_URL missing');
    if (!config.apis.deepgram) throw new Error('DEEPGRAM_API_KEY missing');
    if (!config.apis.anthropic) throw new Error('ANTHROPIC_API_KEY missing');
    if (!config.apis.vercelBlob) throw new Error('BLOB_READ_WRITE_TOKEN missing');
    console.log('   ✅ All required environment variables set\n');
  } catch (error) {
    console.error(`   ❌ ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    allHealthy = false;
  }
  
  // 2. Check database connection
  console.log('2️⃣ Checking database connection...');
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    
    const firmCount = await prisma.firm.count();
    const userCount = await prisma.user.count();
    
    console.log(`   ✅ Database connected`);
    console.log(`      Firms: ${firmCount}`);
    console.log(`      Users: ${userCount}\n`);
  } catch (error) {
    console.error(`   ❌ Database connection failed: ${error instanceof Error ? error.message : 'Unknown'}\n`);
    allHealthy = false;
  }
  
  // 3. Check Redis connection
  console.log('3️⃣ Checking Redis connection...');
  try {
    const redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    });
    
    await redis.ping();
    const info = await redis.info('server');
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';
    
    console.log(`   ✅ Redis connected (v${version})\n`);
    
    await redis.quit();
  } catch (error) {
    console.error(`   ❌ Redis connection failed: ${error instanceof Error ? error.message : 'Unknown'}\n`);
    allHealthy = false;
  }
  
  // 4. Check Deepgram API
  console.log('4️⃣ Checking Deepgram API...');
  try {
    // TODO: Verify Deepgram API key
    console.log('   ⚠️  Deepgram API check not implemented (TODO)\n');
  } catch (error) {
    console.error(`   ❌ Deepgram API failed: ${error instanceof Error ? error.message : 'Unknown'}\n`);
  }
  
  // 5. Check Claude API
  console.log('5️⃣ Checking Anthropic Claude API...');
  try {
    // TODO: Verify Anthropic API key
    console.log('   ⚠️  Claude API check not implemented (TODO)\n');
  } catch (error) {
    console.error(`   ❌ Claude API failed: ${error instanceof Error ? error.message : 'Unknown'}\n`);
  }
  
  // 6. Check FFmpeg
  console.log('6️⃣ Checking FFmpeg...');
  try {
    const { execSync } = await import('child_process');
    const ffmpegVersion = execSync('ffmpeg -version', { encoding: 'utf8' });
    const versionMatch = ffmpegVersion.match(/ffmpeg version ([^\s]+)/);
    const version = versionMatch ? versionMatch[1] : 'unknown';
    console.log(`   ✅ FFmpeg available (${version})\n`);
  } catch (error) {
    console.log('   ⚠️  FFmpeg not found (audio preprocessing will not work)\n');
  }
  
  // Summary
  console.log('─'.repeat(50));
  if (allHealthy) {
    console.log('\n✅ All critical systems operational!\n');
    console.log('You can now run:');
    console.log('  npm run dev     (start API server)');
    console.log('  npm run worker  (start background worker)\n');
  } else {
    console.log('\n⚠️  Some systems need attention.');
    console.log('Fix the errors above before running the application.\n');
    process.exit(1);
  }
  
  await prisma.$disconnect();
}

verifyInstallation().catch((error) => {
  console.error('❌ Verification failed:', error);
  process.exit(1);
});
